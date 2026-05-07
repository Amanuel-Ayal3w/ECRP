import { db } from "@/db";
import { driverAvailability, rideRejection, rideRequest } from "@/db/schema";
import { and, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { rankDriversByDistance } from "@/lib/score-route";
import { pusherServer } from "@/lib/pusher-server";

interface RideSnapshot {
  id: string;
  passengerId: string;
  pickup: string;
  destination: string;
  pickupLat: number | null;
  pickupLng: number | null;
  destLat: number | null;
  destLng: number | null;
}

/**
 * After a match is broken (rejection or expiry), find the next eligible driver,
 * update the ride to "matched", and fire a ride-assigned Pusher event to them.
 * Returns the new driver's userId, or null if no one qualifies.
 */
export async function rematchRide(ride: RideSnapshot): Promise<string | null> {
  // Collect drivers who already rejected this ride
  const rejections = await db
    .select({ driverId: rideRejection.driverId })
    .from(rideRejection)
    .where(eq(rideRejection.rideId, ride.id));
  const rejectedIds = rejections.map((r) => r.driverId);

  // Collect drivers already busy on another active ride
  const activeRides = await db
    .select({ driverId: rideRequest.matchedDriverId })
    .from(rideRequest)
    .where(
      and(
        inArray(rideRequest.status, ["matched", "accepted", "in_progress"]),
        isNotNull(rideRequest.matchedDriverId),
      ),
    );
  const busyIds = activeRides.map((r) => r.driverId).filter(Boolean) as string[];

  const excludeIds = [...new Set([...rejectedIds, ...busyIds])];

  const query = db
    .select({
      userId: driverAvailability.userId,
      routeStart: driverAvailability.routeStart,
      routeEnd: driverAvailability.routeEnd,
      routeStartLat: driverAvailability.routeStartLat,
      routeStartLng: driverAvailability.routeStartLng,
      routeEndLat: driverAvailability.routeEndLat,
      routeEndLng: driverAvailability.routeEndLng,
    })
    .from(driverAvailability)
    .where(
      excludeIds.length > 0
        ? and(eq(driverAvailability.isOnline, true), notInArray(driverAvailability.userId, excludeIds))
        : eq(driverAvailability.isOnline, true),
    );

  const candidates = await query;
  if (candidates.length === 0) return null;

  const pickupCoords =
    ride.pickupLat != null && ride.pickupLng != null
      ? { lat: ride.pickupLat, lng: ride.pickupLng }
      : null;

  const destCoords =
    ride.destLat != null && ride.destLng != null
      ? { lat: ride.destLat, lng: ride.destLng }
      : null;

  const ranked = await rankDriversByDistance(
    ride.pickup,
    ride.destination,
    candidates,
    pickupCoords,
    destCoords,
  );

  const next = ranked[0];
  if (!next) return null;

  const now = new Date();
  await db
    .update(rideRequest)
    .set({ status: "matched", matchedDriverId: next.userId, updatedAt: now })
    .where(eq(rideRequest.id, ride.id));

  await pusherServer.trigger(`private-driver.${next.userId}`, "ride-assigned", {
    rideId: ride.id,
    pickup: ride.pickup,
    destination: ride.destination,
  });

  return next.userId;
}
