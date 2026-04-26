import { db } from "@/db";
import {
  driverAvailability,
  driverProfile,
  driverUser,
  passengerUser,
  rideRequest,
} from "@/db/schema";
import { generateId } from "@/lib/generate-id";
import { eq } from "drizzle-orm";

// ─── Passenger ───────────────────────────────────────────────────────────────

export function makePassenger() {
  const id = generateId();
  const now = new Date();

  return {
    id,
    async seed() {
      await db.insert(passengerUser).values({
        id,
        name: "Test Passenger",
        email: `p-${id}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    },
    async cleanup() {
      // Cascades: passengerUser → rideRequest → tripEvent, rideRejection
      await db.delete(passengerUser).where(eq(passengerUser.id, id));
    },
  };
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export function makeDriver() {
  const id = generateId();
  const now = new Date();

  return {
    id,
    async seed() {
      await db.insert(driverUser).values({
        id,
        name: "Test Driver",
        email: `d-${id}@test.local`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(driverProfile).values({
        userId: id,
        plateNumber: `T-${id}`,       // full ID guarantees uniqueness across parallel tests
        vehicleModel: "Toyota Corolla",
        capacity: 3,
        licenseNumber: `L-${id}`,
        serviceScore: 0,
        tripsCompleted: 0,
        updatedAt: now,
      });
    },
    async setAvailability(opts: {
      isOnline: boolean;
      lat?: number;
      lng?: number;
    }) {
      await db
        .insert(driverAvailability)
        .values({
          userId: id,
          isOnline: opts.isOnline,
          routeStart: opts.lat != null ? "Test Start" : null,
          routeEnd: opts.lng != null ? "Test End" : null,
          routeStartLat: opts.lat ?? null,
          routeStartLng: opts.lng ?? null,
          routeEndLat: null,
          routeEndLng: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: driverAvailability.userId,
          set: {
            isOnline: opts.isOnline,
            routeStartLat: opts.lat ?? null,
            routeStartLng: opts.lng ?? null,
            updatedAt: now,
          },
        });
    },
    async cleanup() {
      // Cascades: driverUser → driverAvailability, driverProfile, driverSession
      await db.delete(driverUser).where(eq(driverUser.id, id));
    },
  };
}

// ─── Ride request ─────────────────────────────────────────────────────────────

export function makeRide(
  passengerId: string,
  opts: {
    status?: string;
    driverId?: string;
    pickup?: string;
    destination?: string;
  } = {},
) {
  const id = generateId();
  const now = new Date();
  const status = opts.status ?? "requested";

  return {
    id,
    async seed() {
      await db.insert(rideRequest).values({
        id,
        passengerId,
        pickup: opts.pickup ?? "Bole",
        destination: opts.destination ?? "Piassa",
        status,
        matchedDriverId: opts.driverId ?? null,
        acceptedAt:
          ["accepted", "in_progress", "completed"].includes(status) ? now : null,
        startedAt:
          ["in_progress", "completed"].includes(status) ? now : null,
        endedAt:
          ["completed", "cancelled"].includes(status) ? now : null,
        createdAt: now,
        updatedAt: now,
      });
    },
  };
}
