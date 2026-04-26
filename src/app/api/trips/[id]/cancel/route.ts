import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CANCELABLE_STATUSES, type RideStatus } from "@/lib/state-machine";
import { writeTripEvent, emitTripEvent } from "@/lib/trip-events";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const h = await headers();
  const [passengerSession, driverSession] = await Promise.all([
    authPassenger.api.getSession({ headers: h }),
    authDriver.api.getSession({ headers: h }),
  ]);

  if (!passengerSession && !driverSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const isPassengerOwner = Boolean(passengerSession && ride.passengerId === passengerSession.user.id);
  const isAssignedDriver = Boolean(driverSession && ride.matchedDriverId === driverSession.user.id);

  if (!isPassengerOwner && !isAssignedDriver) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!CANCELABLE_STATUSES.has(ride.status as RideStatus)) {
    return NextResponse.json({ error: "Trip cannot be cancelled in its current state." }, { status: 400 });
  }

  const now = new Date();
  const actorId = passengerSession?.user.id ?? driverSession!.user.id;
  const actorRole = passengerSession ? "passenger" : "driver";

  await db
    .update(rideRequest)
    .set({ status: "cancelled", endedAt: now, updatedAt: now })
    .where(eq(rideRequest.id, id));

  await writeTripEvent({
    rideId: id,
    actorId,
    actorRole,
    event: "cancel",
    metadata: { cancelledBy: actorId, previousStatus: ride.status },
  });

  emitTripEvent({
    event: "status_change",
    rideId: id,
    payload: { status: "cancelled", endedAt: now.toISOString() },
  });

  const [updatedRide] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  return NextResponse.json({ trip: updatedRide });
}
