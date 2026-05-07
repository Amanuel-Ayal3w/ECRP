import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { driverAvailability, rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { makeDriver, makePassenger, makeRide } from "@/test/db-helpers";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const mockPusherTrigger = vi.fn(() => Promise.resolve());
vi.mock("@/lib/pusher-server", () => ({
  pusherServer: { trigger: mockPusherTrigger },
}));

const mockGetPassengerSession = vi.fn();
vi.mock("@/lib/auth-passenger", () => ({
  authPassenger: { api: { getSession: (...a: unknown[]) => mockGetPassengerSession(...a) } },
}));

const { POST } = await import("./route");

describe("POST /api/rides/:id/expire", () => {
  let passenger: ReturnType<typeof makePassenger>;
  let driver: ReturnType<typeof makeDriver>;

  beforeEach(async () => {
    await db.update(driverAvailability).set({ isOnline: false });

    passenger = makePassenger();
    driver = makeDriver();
    await passenger.seed();
    await driver.seed();
    mockGetPassengerSession.mockResolvedValue({ user: { id: passenger.id } });
  });

  afterEach(async () => {
    await passenger.cleanup();
    await driver.cleanup();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetPassengerSession.mockResolvedValue(null);
    const ride = makeRide(passenger.id, { status: "matched", driverId: driver.id });
    await ride.seed();

    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: ride.id }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown ride id", async () => {
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when the passenger does not own the ride", async () => {
    const otherPassenger = makePassenger();
    await otherPassenger.seed();
    const ride = makeRide(otherPassenger.id, { status: "matched", driverId: driver.id });
    await ride.seed();

    try {
      const res = await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ id: ride.id }),
      });
      expect(res.status).toBe(403);
    } finally {
      await otherPassenger.cleanup();
    }
  });

  it("returns 400 when the ride is not in matched status", async () => {
    for (const status of ["requested", "accepted", "in_progress", "completed", "cancelled"] as const) {
      const ride = makeRide(passenger.id, { status, driverId: driver.id });
      await ride.seed();

      const res = await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ id: ride.id }),
      });
      expect(res.status, `expected 400 for status=${status}`).toBe(400);
    }
  });

  it("resets ride to requested and clears matchedDriverId in the database", async () => {
    const ride = makeRide(passenger.id, { status: "matched", driverId: driver.id });
    await ride.seed();

    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: ride.id }),
    });
    expect(res.status).toBe(200);

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("requested");
    expect(dbRide.matchedDriverId).toBeNull();
  });

  it("fires match-expired to the passenger's private channel", async () => {
    const ride = makeRide(passenger.id, { status: "matched", driverId: driver.id });
    await ride.seed();

    await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: ride.id }),
    });

    expect(mockPusherTrigger).toHaveBeenCalledWith(
      `private-passenger.${passenger.id}`,
      "match-expired",
      expect.objectContaining({ rideId: ride.id }),
    );
  });

  it("fires match-expired to the driver's private channel", async () => {
    const ride = makeRide(passenger.id, { status: "matched", driverId: driver.id });
    await ride.seed();

    await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: ride.id }),
    });

    expect(mockPusherTrigger).toHaveBeenCalledWith(
      `private-driver.${driver.id}`,
      "match-expired",
      expect.objectContaining({ rideId: ride.id }),
    );
  });

  it("fires ride-assigned to the next available driver after expiry", async () => {
    const nextDriver = makeDriver();
    await nextDriver.seed();
    await nextDriver.setAvailability({ isOnline: true, lat: 9.01, lng: 38.76 });

    const ride = makeRide(passenger.id, {
      status: "matched",
      driverId: driver.id,
      pickup: "Bole",
      destination: "Piassa",
      pickupLat: 9.01,
      pickupLng: 38.76,
      destLat: 9.01,
      destLng: 38.76,
    });
    await ride.seed();

    try {
      await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ id: ride.id }),
      });

      const assignedCalls = mockPusherTrigger.mock.calls.filter(
        ([ch, ev]) => ch === `private-driver.${nextDriver.id}` && ev === "ride-assigned",
      );
      expect(assignedCalls.length).toBeGreaterThanOrEqual(1);
      expect(assignedCalls[0][2]).toMatchObject({ rideId: ride.id });

      // DB should reflect the new match
      const [dbRide] = await db
        .select()
        .from(rideRequest)
        .where(eq(rideRequest.id, ride.id))
        .limit(1);
      expect(dbRide.status).toBe("matched");
      expect(dbRide.matchedDriverId).toBe(nextDriver.id);
    } finally {
      await nextDriver.cleanup();
    }
  });

  it("leaves ride as requested when no next driver is available after expiry", async () => {
    const ride = makeRide(passenger.id, { status: "matched", driverId: driver.id });
    await ride.seed();

    await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: ride.id }),
    });

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.status).toBe("requested");
    expect(dbRide.matchedDriverId).toBeNull();
  });
});
