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

describe("POST /api/trips/:id/location", () => {
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
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 9.02, lng: 38.74 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown trip", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 9.02, lng: 38.74 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when a different driver sends location", async () => {
    const otherDriver = makeDriver();
    await otherDriver.seed();
    mockGetDriverSession.mockResolvedValue({ user: { id: otherDriver.id } });

    try {
      const req = new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: 9.02, lng: 38.74 }),
      });
      const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
      expect(res.status).toBe(403);
    } finally {
      await otherDriver.cleanup();
    }
  });

  it("returns 400 when lat or lng is missing", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 9.02 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/lat|lng/i);
  });

  it("returns 400 for out-of-range coordinates", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 200, lng: 38.74 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when trip is not in_progress", async () => {
    const acceptedRide = makeRide(passenger.id, { status: "accepted", driverId: driver.id });
    await acceptedRide.seed();

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 9.02, lng: 38.74 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: acceptedRide.id }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/in.progress/i);
  });

  it("updates currentLat and currentLng in the database", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 9.0456, lng: 38.7123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: ride.id }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    const [dbRide] = await db
      .select()
      .from(rideRequest)
      .where(eq(rideRequest.id, ride.id))
      .limit(1);
    expect(dbRide.currentLat).toBeCloseTo(9.0456, 3);
    expect(dbRide.currentLng).toBeCloseTo(38.7123, 3);
  });

  it("fires a Pusher location_update event", async () => {
    const { pusherServer } = await import("@/lib/pusher-server");

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 9.02, lng: 38.74 }),
    });
    await POST(req, { params: Promise.resolve({ id: ride.id }) });

    expect(pusherServer.trigger).toHaveBeenCalledWith(
      `private-trip.${ride.id}`,
      "location_update",
      expect.objectContaining({ lat: 9.02, lng: 38.74 }),
    );
  });
});
