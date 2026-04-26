import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { makeDriver, makePassenger, makeRide } from "@/test/db-helpers";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/pusher-server", () => ({
  pusherServer: { trigger: vi.fn(() => Promise.resolve()) },
}));

const mockGetPassengerSession = vi.fn();
const mockGetDriverSession = vi.fn();

vi.mock("@/lib/auth-passenger", () => ({
  authPassenger: { api: { getSession: (...a: unknown[]) => mockGetPassengerSession(...a) } },
}));
vi.mock("@/lib/auth-driver", () => ({
  authDriver: { api: { getSession: (...a: unknown[]) => mockGetDriverSession(...a) } },
}));

const { POST } = await import("./route");

describe("POST /api/trips/:id/cancel", () => {
  let passenger: ReturnType<typeof makePassenger>;
  let driver: ReturnType<typeof makeDriver>;

  beforeEach(async () => {
    passenger = makePassenger();
    driver = makeDriver();
    await passenger.seed();
    await driver.seed();
    // Default: authenticated as passenger only
    mockGetPassengerSession.mockResolvedValue({ user: { id: passenger.id } });
    mockGetDriverSession.mockResolvedValue(null);
  });

  afterEach(async () => {
    await passenger.cleanup();
    await driver.cleanup();
  });

  it("returns 401 when neither passenger nor driver session exists", async () => {
    mockGetPassengerSession.mockResolvedValue(null);
    const ride = makeRide(passenger.id, { status: "requested" });
    await ride.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown trip", async () => {
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when passenger tries to cancel someone else's ride", async () => {
    const otherPassenger = makePassenger();
    await otherPassenger.seed();
    const ride = makeRide(otherPassenger.id, { status: "requested" });
    await ride.seed();

    try {
      const req = new Request("http://localhost", { method: "POST" });
      const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
      expect(res.status).toBe(403);
    } finally {
      await otherPassenger.cleanup();
    }
  });

  it("allows the passenger to cancel a requested ride", async () => {
    const ride = makeRide(passenger.id, { status: "requested" });
    await ride.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("cancelled");
    expect(dbRide.endedAt).not.toBeNull();
  });

  it("allows the assigned driver to cancel an accepted ride", async () => {
    const ride = makeRide(passenger.id, { status: "accepted", driverId: driver.id });
    await ride.seed();

    mockGetPassengerSession.mockResolvedValue(null);
    mockGetDriverSession.mockResolvedValue({ user: { id: driver.id } });

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("cancelled");
  });

  it("returns 400 when trying to cancel a completed trip", async () => {
    const completedRide = makeRide(passenger.id, { status: "completed", driverId: driver.id });
    await completedRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: completedRide.id }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot be cancelled/i);
  });

  it("returns 400 when trying to cancel an already-cancelled trip", async () => {
    const cancelledRide = makeRide(passenger.id, { status: "cancelled" });
    await cancelledRide.seed();

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: cancelledRide.id }) });
    expect(res.status).toBe(400);
  });
});
