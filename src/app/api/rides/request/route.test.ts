import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { driverAvailability, rideRequest, tripEvent } from "@/db/schema";
import { eq } from "drizzle-orm";
import { makeDriver, makePassenger } from "@/test/db-helpers";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/pusher-server", () => ({
  pusherServer: { trigger: vi.fn(() => Promise.resolve()) },
}));

const mockGetPassengerSession = vi.fn();
vi.mock("@/lib/auth-passenger", () => ({
  authPassenger: { api: { getSession: (...a: unknown[]) => mockGetPassengerSession(...a) } },
}));

const { POST } = await import("./route");

describe("POST /api/rides/request", () => {
  let passenger: ReturnType<typeof makePassenger>;

  beforeEach(async () => {
    // Offline all pre-existing drivers so dev DB state doesn't affect matching assertions
    await db.update(driverAvailability).set({ isOnline: false });

    passenger = makePassenger();
    await passenger.seed();
    mockGetPassengerSession.mockResolvedValue({ user: { id: passenger.id, name: "Test Passenger" } });
  });

  afterEach(async () => {
    await passenger.cleanup();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetPassengerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/rides/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pickup: "Bole", destination: "Piassa" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when pickup is missing", async () => {
    const req = new Request("http://localhost/api/rides/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destination: "Piassa" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/pickup|destination/i);
  });

  it("returns 400 when pickup equals destination (case-insensitive)", async () => {
    const req = new Request("http://localhost/api/rides/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pickup: "Bole", destination: "bole" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/same/i);
  });

  it("creates a ride with status 'requested' when no online drivers", async () => {
    const req = new Request("http://localhost/api/rides/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // provide coords so rankDriversByDistance skips geocoding
      body: JSON.stringify({ pickup: "Bole", destination: "Piassa", pickupLat: 9.01, pickupLng: 38.76 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.matched).toBe(false);
    expect(body.ride.status).toBe("requested");
    expect(body.ride.matchedDriverId).toBeNull();

    // Verify row exists in DB
    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, body.ride.id))
      .limit(1);
    expect(dbRide).toBeTruthy();
    expect(dbRide.passengerId).toBe(passenger.id);
    expect(dbRide.pickup).toBe("Bole");
    expect(dbRide.destination).toBe("Piassa");
  });

  it("writes a tripEvent row to the database", async () => {
    const req = new Request("http://localhost/api/rides/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pickup: "Bole", destination: "Piassa", pickupLat: 9.01, pickupLng: 38.76 }),
    });
    const res = await POST(req);
    const body = await res.json();

    const events = await db
      .select()
      .from(tripEvent)
      .where(eq(tripEvent.rideId, body.ride.id));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].actorRole).toBe("passenger");
  });

  it("creates a ride with status 'matched' when an online driver is nearby", async () => {
    const driver = makeDriver();
    await driver.seed();
    await driver.setAvailability({ isOnline: true, lat: 9.01, lng: 38.76 });

    try {
      const req = new Request("http://localhost/api/rides/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pickup: "Bole", destination: "Piassa", pickupLat: 9.01, pickupLng: 38.76 }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.matched).toBe(true);
      expect(body.ride.status).toBe("matched");
      expect(body.ride.matchedDriverId).toBe(driver.id);
    } finally {
      await driver.cleanup();
    }
  });

  it("ignores offline drivers when matching", async () => {
    const driver = makeDriver();
    await driver.seed();
    await driver.setAvailability({ isOnline: false, lat: 9.01, lng: 38.76 });

    try {
      const req = new Request("http://localhost/api/rides/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pickup: "Bole", destination: "Piassa", pickupLat: 9.01, pickupLng: 38.76 }),
      });
      const res = await POST(req);
      const body = await res.json();
      expect(body.matched).toBe(false);
    } finally {
      await driver.cleanup();
    }
  });
});
