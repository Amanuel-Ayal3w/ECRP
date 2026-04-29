import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { driverProfile, rideRequest } from "@/db/schema";
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

describe("POST /api/trips/:id/complete", () => {
  let passenger: ReturnType<typeof makePassenger>;
  let driver: ReturnType<typeof makeDriver>;
  let ride: ReturnType<typeof makeRide>;

  beforeEach(async () => {
    passenger = makePassenger();
    driver = makeDriver();
    await passenger.seed();
    await driver.seed();
    ride = makeRide(passenger.id, { status: "in_progress", driverId: driver.id });
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

  it("returns 403 when a different driver tries to complete the trip", async () => {
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

  it("allows completing an accepted (not yet started) ride", async () => {
    const acceptedRide = makeRide(passenger.id, { status: "accepted", driverId: driver.id });
    await acceptedRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: acceptedRide.id }) });
    expect(res.status).toBe(200);
  });

  it("transitions ride to completed and sets endedAt", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.trip.status).toBe("completed");

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("completed");
    expect(dbRide.endedAt).not.toBeNull();
  });

  it("increments driver serviceScore by 10 and tripsCompleted by 1 in the database", async () => {
    const [before] = await db
      .select({ serviceScore: driverProfile.serviceScore, tripsCompleted: driverProfile.tripsCompleted })
      .from(driverProfile)
      .where(eq(driverProfile.userId, driver.id))
      .limit(1);

    const req = new Request("http://localhost", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: ride.id }) });

    const [after] = await db
      .select({ serviceScore: driverProfile.serviceScore, tripsCompleted: driverProfile.tripsCompleted })
      .from(driverProfile)
      .where(eq(driverProfile.userId, driver.id))
      .limit(1);

    expect(after.serviceScore).toBe(before.serviceScore + 10);
    expect(after.tripsCompleted).toBe(before.tripsCompleted + 1);
  });

  it("is idempotent — second call returns the same completed trip without double-scoring", async () => {
    const req1 = new Request("http://localhost", { method: "POST" });
    const req2 = new Request("http://localhost", { method: "POST" });
    await POST(req1, { params: Promise.resolve({ id: ride.id }) });
    const res2 = await POST(req2, { params: Promise.resolve({ id: ride.id }) });
    expect(res2.status).toBe(200);

    // Score should only be incremented once
    const [profile] = await db
      .select({ serviceScore: driverProfile.serviceScore })
      .from(driverProfile)
      .where(eq(driverProfile.userId, driver.id))
      .limit(1);
    expect(profile.serviceScore).toBe(10);
  });
});
