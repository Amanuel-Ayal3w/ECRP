import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { driverUser, passengerUser, rideRequest } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const h = await headers();
  const [passengerSession, driverSession] = await Promise.all([
    authPassenger.api.getSession({ headers: h }),
    authDriver.api.getSession({ headers: h }),
  ]);

  if (!passengerSession && !driverSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (passengerSession) {
    const [trip] = await db
      .select()
      .from(rideRequest)
      .where(
        and(
          eq(rideRequest.passengerId, passengerSession.user.id),
          or(
            eq(rideRequest.status, "requested"),
            eq(rideRequest.status, "matched"),
            eq(rideRequest.status, "accepted"),
            eq(rideRequest.status, "in_progress"),
          ),
        ),
      )
      .orderBy(desc(rideRequest.createdAt))
      .limit(1);

    let counterpartName: string | null = null;
    if (trip?.matchedDriverId) {
      const [driver] = await db
        .select({ name: driverUser.name })
        .from(driverUser)
        .where(eq(driverUser.id, trip.matchedDriverId))
        .limit(1);
      counterpartName = driver?.name ?? null;
    }

    return NextResponse.json({ trip: trip ?? null, actor: "passenger", counterpartName });
  }

  const [trip] = await db
    .select()
    .from(rideRequest)
    .where(
      and(
        eq(rideRequest.matchedDriverId, driverSession!.user.id),
        or(
          eq(rideRequest.status, "matched"),
          eq(rideRequest.status, "accepted"),
          eq(rideRequest.status, "in_progress"),
        ),
      ),
    )
    .orderBy(desc(rideRequest.createdAt))
    .limit(1);

  let counterpartName: string | null = null;
  if (trip?.passengerId) {
    const [passenger] = await db
      .select({ name: passengerUser.name })
      .from(passengerUser)
      .where(eq(passengerUser.id, trip.passengerId))
      .limit(1);
    counterpartName = passenger?.name ?? null;
  }

  return NextResponse.json({ trip: trip ?? null, actor: "driver", counterpartName });
}
