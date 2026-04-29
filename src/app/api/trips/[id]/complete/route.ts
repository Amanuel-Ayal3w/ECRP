import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { driverProfile, rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { validateTransition, type RideStatus } from "@/lib/state-machine";
import { writeTripEvent, emitTripEvent } from "@/lib/trip-events";
import { invalidTransition, forbidden, notFound, internalError } from "@/lib/api-error";

const COMPLETION_SCORE_BONUS = 10;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return notFound("Trip");

  if (ride.matchedDriverId !== session.user.id) {
    return forbidden("Only the assigned driver can complete this trip.");
  }

  // Idempotency guard: completion already applied
  if (ride.endedAt) {
    const [current] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
    return NextResponse.json({ trip: current });
  }

  const { valid, reason } = validateTransition(ride.status as RideStatus, "complete");
  if (!valid) return invalidTransition(reason!);

  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(rideRequest)
        .set({ status: "completed", endedAt: now, updatedAt: now })
        .where(eq(rideRequest.id, id));

      const [profile] = await tx
        .select({ tripsCompleted: driverProfile.tripsCompleted, serviceScore: driverProfile.serviceScore })
        .from(driverProfile)
        .where(eq(driverProfile.userId, session.user.id))
        .limit(1);

      if (profile) {
        await tx
          .update(driverProfile)
          .set({
            tripsCompleted: profile.tripsCompleted + 1,
            serviceScore: profile.serviceScore + COMPLETION_SCORE_BONUS,
            updatedAt: now,
          })
          .where(eq(driverProfile.userId, session.user.id));
      } else {
        // Driver completed a trip before finishing onboarding — seed a minimal profile
        // so the score is never silently dropped. Vehicle fields can be filled later.
        await tx.insert(driverProfile).values({
          userId:         session.user.id,
          plateNumber:    `${session.user.id.slice(0, 8)}-TBD`,
          vehicleModel:   "",
          licenseNumber:  "",
          capacity:       1,
          serviceScore:   COMPLETION_SCORE_BONUS,
          tripsCompleted: 1,
          updatedAt:      now,
        });
      }
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "complete_trip_error", rideId: id, error: String(err) }));
    return internalError("Failed to complete trip.");
  }

  await writeTripEvent({
    rideId: id,
    actorId: session.user.id,
    actorRole: "driver",
    event: "complete",
    metadata: { endedAt: now.toISOString(), scoreBonusApplied: COMPLETION_SCORE_BONUS },
  });

  emitTripEvent({
    event: "status_change",
    rideId: id,
    payload: { status: "completed", endedAt: now.toISOString() },
  });

  const [updatedRide] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  return NextResponse.json({ trip: updatedRide });
}
