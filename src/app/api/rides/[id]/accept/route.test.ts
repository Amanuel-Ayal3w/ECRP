import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rideRequest, tripEvent } from "@/db/schema";
import { eq } from "drizzle-orm";
import { makeDriver, makePassenger, makeRide } from "@/test/db-helpers";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/pusher-server", () => ({
  pusherServer: { trigger: vi.fn(() => Promise.resolve()) },
}));

const mockGetDriverSession = vi.fn();
vi.mock("@/lib/auth-driver", () => ({
  authDriver: { api: { getSession: (...a: unknown[]) => mockGetDriverSession(...a) } },
}));

const { POST } = await import("./route");

describe("POST /api/rides/:id/accept", () => {
  let passenger: ReturnType<typeof makePassenger>;
  let driver: ReturnType<typeof makeDriver>;
  let ride: ReturnType<typeof makeRide>;

  beforeEach(async () => {
    passenger = makePassenger();
    driver = makeDriver();
    await passenger.seed();
    await driver.seed();
    ride = makeRide(passenger.id, { status: "requested" });
    await ride.seed();
    mockGetDriverSession.mockResolvedValue({ user: { id: driver.id } });
  });

  afterEach(async () => {
    await passenger.cleanup();
    await driver.cleanup();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetDriverSession.mockResolvedValue(null);
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown ride id", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 when ride is already assigned to a different driver", async () => {
    const otherDriver = makeDriver();
    await otherDriver.seed();
    const assignedRide = makeRide(passenger.id, { status: "matched", driverId: otherDriver.id });
    await assignedRide.seed();

    try {
      const req = new Request("http://localhost", { method: "POST" });
      const res = await POST(req, { params: Promise.resolve({ id: assignedRide.id }) });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/another driver/i);
    } finally {
      await otherDriver.cleanup();
    }
  });

  it("accepts a requested ride and sets status to accepted", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ride.status).toBe("accepted");
    expect(body.ride.matchedDriverId).toBe(driver.id);

    // Verify DB
    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("accepted");
    expect(dbRide.matchedDriverId).toBe(driver.id);
    expect(dbRide.acceptedAt).not.toBeNull();
  });

  it("writes an accept tripEvent to the database", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: ride.id }) });

    const events = await db
      .select()
      .from(tripEvent)
      .where(eq(tripEvent.rideId, ride.id));
    const acceptEvent = events.find((e) => e.event === "accept");
    expect(acceptEvent).toBeTruthy();
    expect(acceptEvent!.actorId).toBe(driver.id);
    expect(acceptEvent!.actorRole).toBe("driver");
  });

  it("returns 400 when trying to accept an already-completed ride", async () => {
    const completedRide = makeRide(passenger.id, { status: "completed", driverId: driver.id });
    await completedRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: completedRide.id }) });
    expect(res.status).toBe(400);
  });
});
