import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rideRequest, tripEvent } from "@/db/schema";
import { eq } from "drizzle-orm";
import { makeDriver, makePassenger, makeRide } from "@/test/db-helpers";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const mockPusherTrigger = vi.fn(() => Promise.resolve());
vi.mock("@/lib/pusher-server", () => ({
  pusherServer: { trigger: mockPusherTrigger },
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

  it("fires ride-accepted Pusher event to the passenger's private channel", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: ride.id }) });

    expect(mockPusherTrigger).toHaveBeenCalledWith(
      `private-passenger.${passenger.id}`,
      "ride-accepted",
      expect.objectContaining({ rideId: ride.id, driverId: driver.id }),
    );
  });

  it("only one driver wins when two accept the same unassigned ride concurrently", async () => {
    const driverB = makeDriver();
    await driverB.seed();

    const sessionA = { user: { id: driver.id } };
    const sessionB = { user: { id: driverB.id } };

    // Alternate sessions per-call so both drivers are "logged in" simultaneously
    let callCount = 0;
    mockGetDriverSession.mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount % 2 === 1 ? sessionA : sessionB);
    });

    const [resA, resB] = await Promise.all([
      POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: ride.id }) }),
      POST(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: ride.id }) }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses[0]).toBe(200);
    // The loser gets 409 (atomic guard) or 400 (state machine sees already-accepted status)
    // depending on interleaving — both mean "you didn't win the race"
    expect([400, 409]).toContain(statuses[1]);

    // DB must show exactly one accepted driver
    const [dbRide] = await db.select().from(rideRequest).where(eq(rideRequest.id, ride.id)).limit(1);
    expect(dbRide.status).toBe("accepted");
    expect([driver.id, driverB.id]).toContain(dbRide.matchedDriverId);

    await driverB.cleanup();
  });
});
