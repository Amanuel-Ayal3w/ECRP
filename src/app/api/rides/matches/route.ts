import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { driverAvailability, driverProfile, driverUser, rideRejection, rideRequest } from "@/db/schema";
import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { rankDriversByDistance } from "@/lib/score-route";

export async function GET(request: Request) {
  const session = await authPassenger.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const rideId = url.searchParams.get("rideId");

  let ride;
  if (rideId) {
    [ride] = await db
      .select()
      .from(rideRequest)
      .where(and(eq(rideRequest.id, rideId), eq(rideRequest.passengerId, session.user.id)))
      .limit(1);
  } else {
    [ride] = await db
      .select()
      .from(rideRequest)
      .where(
        and(
          eq(rideRequest.passengerId, session.user.id),
          or(eq(rideRequest.status, "requested"), eq(rideRequest.status, "matched")),
        ),
      )
      .orderBy(desc(rideRequest.createdAt))
      .limit(1);
  }

  if (!ride) {
    return NextResponse.json({ error: "Ride request not found." }, { status: 404 });
  }

  const rejectedRows = await db
    .select({ driverId: rideRejection.driverId })
    .from(rideRejection)
    .where(eq(rideRejection.rideId, ride.id));

  const rejectedDriverIds = new Set(rejectedRows.map((r) => r.driverId));

  const activeRides = await db
    .select({ driverId: rideRequest.matchedDriverId })
    .from(rideRequest)
    .where(
      and(
        inArray(rideRequest.status, ["matched", "accepted", "in_progress"]),
        isNotNull(rideRequest.matchedDriverId),
      ),
    );
  const busyDriverIds = new Set(activeRides.map((r) => r.driverId).filter(Boolean));

  const onlineDrivers = await db
    .select({
      userId: driverAvailability.userId,
      routeStart: driverAvailability.routeStart,
      routeEnd: driverAvailability.routeEnd,
      routeStartLat: driverAvailability.routeStartLat,
      routeStartLng: driverAvailability.routeStartLng,
      routeEndLat: driverAvailability.routeEndLat,
      routeEndLng: driverAvailability.routeEndLng,
      name: driverUser.name,
      email: driverUser.email,
      serviceScore: driverProfile.serviceScore,
      tripsCompleted: driverProfile.tripsCompleted,
    })
    .from(driverAvailability)
    .innerJoin(driverUser, eq(driverUser.id, driverAvailability.userId))
    .leftJoin(driverProfile, eq(driverProfile.userId, driverAvailability.userId))
    .where(eq(driverAvailability.isOnline, true));

  const eligible = onlineDrivers.filter(
    (d) => !rejectedDriverIds.has(d.userId) && !busyDriverIds.has(d.userId),
  );

  const ranked = await rankDriversByDistance(ride.pickup, ride.destination, eligible);

  // Re-attach name/email from the original eligible list (rankDriversByDistance
  // only knows about DriverCandidate fields, not the joined user data)
  const eligibleByUserId = new Map(eligible.map((d) => [d.userId, d]));

  const matches = ranked.map((d) => {
    const full = eligibleByUserId.get(d.userId);
    return {
      driverId: d.userId,
      name: full?.name ?? null,
      email: full?.email ?? null,
      routeStart: d.routeStart,
      routeEnd: d.routeEnd,
      distanceKm: d.distanceKm === Infinity ? null : Number(d.distanceKm.toFixed(2)),
      serviceScore: full?.serviceScore ?? 0,
      tripsCompleted: full?.tripsCompleted ?? 0,
    };
  });

  return NextResponse.json({ ride, matches });
}
