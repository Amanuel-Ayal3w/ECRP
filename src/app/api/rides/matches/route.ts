import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { driverAvailability, driverUser, rideRejection, rideRequest } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function scoreRouteMatch(routeStart: string | null, routeEnd: string | null, pickup: string, destination: string) {
  const start = (routeStart ?? "").toLowerCase();
  const end = (routeEnd ?? "").toLowerCase();
  const from = pickup.toLowerCase();
  const to = destination.toLowerCase();

  let score = 0;
  if (end.includes(to)) score += 3;
  if (start.includes(from)) score += 2;
  if (start && end) score += 1;
  return score;
}

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

  const onlineDrivers = await db
    .select({
      userId: driverAvailability.userId,
      routeStart: driverAvailability.routeStart,
      routeEnd: driverAvailability.routeEnd,
      name: driverUser.name,
      email: driverUser.email,
    })
    .from(driverAvailability)
    .innerJoin(driverUser, eq(driverUser.id, driverAvailability.userId))
    .where(eq(driverAvailability.isOnline, true));

  const matches = onlineDrivers
    .filter((d) => !rejectedDriverIds.has(d.userId))
    .map((d) => ({
      driverId: d.userId,
      name: d.name,
      email: d.email,
      routeStart: d.routeStart,
      routeEnd: d.routeEnd,
      score: scoreRouteMatch(d.routeStart, d.routeEnd, ride.pickup, ride.destination),
    }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ ride, matches });
}
