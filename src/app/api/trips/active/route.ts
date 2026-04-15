import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
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

    return NextResponse.json({ trip: trip ?? null, actor: "passenger" });
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

  return NextResponse.json({ trip: trip ?? null, actor: "driver" });
}
