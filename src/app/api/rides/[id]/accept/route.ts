import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { validateTransition, type RideStatus } from "@/lib/state-machine";
import { writeTripEvent } from "@/lib/trip-events";
import { invalidTransition } from "@/lib/api-error";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return NextResponse.json({ error: "Ride not found." }, { status: 404 });

  const { valid, reason } = validateTransition(ride.status as RideStatus, "accept");
  if (!valid) return invalidTransition(reason!);

  if (ride.matchedDriverId && ride.matchedDriverId !== session.user.id) {
    return NextResponse.json({ error: "Ride already assigned to another driver." }, { status: 409 });
  }

  const now = new Date();

  await db
    .update(rideRequest)
    .set({ status: "accepted", matchedDriverId: session.user.id, acceptedAt: now, updatedAt: now })
    .where(and(eq(rideRequest.id, id), eq(rideRequest.passengerId, ride.passengerId)));

  await writeTripEvent({
    rideId: id,
    actorId: session.user.id,
    actorRole: "driver",
    event: "accept",
    metadata: { previousStatus: ride.status },
  });

  const [updatedRide] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  return NextResponse.json({ ride: updatedRide });
}
