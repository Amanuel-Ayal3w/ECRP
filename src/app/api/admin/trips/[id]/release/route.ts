import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { driverAvailability, rideRequest } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { writeTripEvent, emitTripEvent } from "@/lib/trip-events";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

const ACTIVE_STATUSES = ["requested", "matched", "accepted", "in_progress"];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  if (!ACTIVE_STATUSES.includes(ride.status)) {
    return NextResponse.json({ error: "Trip is already in a terminal state." }, { status: 400 });
  }

  const now = new Date();
  const adminId = session!.user.id;

  await db
    .update(rideRequest)
    .set({ status: "cancelled", endedAt: now, updatedAt: now })
    .where(eq(rideRequest.id, id));

  if (ride.matchedDriverId) {
    await db
      .update(driverAvailability)
      .set({ isOnline: false, updatedAt: now })
      .where(eq(driverAvailability.userId, ride.matchedDriverId));
  }

  await writeTripEvent({
    rideId: id,
    actorId: adminId,
    actorRole: "system",
    event: "cancel",
    metadata: { cancelledBy: adminId, cancelledByAdmin: true, previousStatus: ride.status },
  });

  emitTripEvent({
    event: "status_change",
    rideId: id,
    payload: { status: "cancelled", endedAt: now.toISOString(), reason: "admin_release" },
  });

  return NextResponse.json({ ok: true });
}
