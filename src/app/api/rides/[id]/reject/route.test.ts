import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rideRejection, rideRequest } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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

describe("POST /api/rides/:id/reject", () => {
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

  it("returns 404 for unknown ride", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("creates a rideRejection row in the database", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const [rejection] = await db
      .select()
      .from(rideRejection)
      .where(
        and(eq(rideRejection.rideId, ride.id), eq(rideRejection.driverId, driver.id)),
      )
      .limit(1);
    expect(rejection).toBeTruthy();
  });

  it("does not create duplicate rejection rows on repeated calls", async () => {
    const req1 = new Request("http://localhost", { method: "POST" });
    const req2 = new Request("http://localhost", { method: "POST" });
    await POST(req1, { params: Promise.resolve({ id: ride.id }) });
    await POST(req2, { params: Promise.resolve({ id: ride.id }) });

    const rows = await db
      .select()
      .from(rideRejection)
      .where(
        and(eq(rideRejection.rideId, ride.id), eq(rideRejection.driverId, driver.id)),
      );
    expect(rows.length).toBe(1);
  });

  it("resets matchedDriverId to null when the matched driver rejects", async () => {
    const matchedRide = makeRide(passenger.id, { status: "matched", driverId: driver.id });
    await matchedRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: matchedRide.id }) });

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, matchedRide.id))
      .limit(1);
    expect(dbRide.status).toBe("requested");
    expect(dbRide.matchedDriverId).toBeNull();
  });

  it("does not change ride status when a non-matched driver rejects", async () => {
    // ride is "requested" with no matchedDriver
    const req = new Request("http://localhost", { method: "POST" });
    await POST(req, { params: Promise.resolve({ id: ride.id }) });

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("requested");
  });

  it("returns 400 when rejecting a completed ride", async () => {
    const completedRide = makeRide(passenger.id, { status: "completed", driverId: driver.id });
    await completedRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: completedRide.id }) });
    expect(res.status).toBe(400);
  });
});
