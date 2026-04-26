import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
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

describe("POST /api/trips/:id/start", () => {
  let passenger: ReturnType<typeof makePassenger>;
  let driver: ReturnType<typeof makeDriver>;
  let ride: ReturnType<typeof makeRide>;

  beforeEach(async () => {
    passenger = makePassenger();
    driver = makeDriver();
    await passenger.seed();
    await driver.seed();
    ride = makeRide(passenger.id, { status: "accepted", driverId: driver.id });
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

  it("returns 404 for unknown trip", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when a different driver tries to start the trip", async () => {
    const otherDriver = makeDriver();
    await otherDriver.seed();
    mockGetDriverSession.mockResolvedValue({ user: { id: otherDriver.id } });

    try {
      const req = new Request("http://localhost", { method: "POST" });
      const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
      expect(res.status).toBe(403);
    } finally {
      await otherDriver.cleanup();
    }
  });

  it("returns 400 when the assigned driver tries to start an already in_progress ride", async () => {
    // matchedDriverId === driver.id so 403 won't fire; state "in_progress" → "start" is invalid
    const inProgressRide = makeRide(passenger.id, { status: "in_progress", driverId: driver.id });
    await inProgressRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: inProgressRide.id }) });
    expect(res.status).toBe(400);
  });

  it("transitions ride to in_progress and sets startedAt", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.trip.status).toBe("in_progress");

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("in_progress");
    expect(dbRide.startedAt).not.toBeNull();
  });
});
