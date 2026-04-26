import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  if (!ride) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  if (ride.matchedDriverId !== session.user.id) {
    return NextResponse.json({ error: "Only the assigned driver can start this trip." }, { status: 403 });
  }

  const { valid, reason } = validateTransition(ride.status as RideStatus, "start");
  if (!valid) return invalidTransition(reason!);

  const now = new Date();

  await db
    .update(rideRequest)
    .set({ status: "in_progress", startedAt: now, updatedAt: now })
    .where(eq(rideRequest.id, id));

  await writeTripEvent({
    rideId: id,
    actorId: session.user.id,
    actorRole: "driver",
    event: "start",
    metadata: { startedAt: now.toISOString() },
  });

  const [updatedRide] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  return NextResponse.json({ trip: updatedRide });
}
