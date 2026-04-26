import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { emitTripEvent } from "@/lib/trip-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const lat = typeof body?.lat === "number" ? body.lat : undefined;
  const lng = typeof body?.lng === "number" ? body.lng : undefined;

  if (lat === undefined || lng === undefined) {
    return NextResponse.json({ error: "lat and lng are required numbers." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "lat/lng out of valid range." }, { status: 400 });
  }

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  if (ride.matchedDriverId !== session.user.id) {
    return NextResponse.json({ error: "Only the assigned driver can update this trip's location." }, { status: 403 });
  }

  if (ride.status !== "in_progress") {
    return NextResponse.json({ error: "Location updates are only accepted for in-progress trips." }, { status: 400 });
  }

  const now = new Date();

  await db
    .update(rideRequest)
    .set({ currentLat: lat, currentLng: lng, updatedAt: now })
    .where(eq(rideRequest.id, id));

  emitTripEvent({
    event: "location_update",
    rideId: id,
    payload: { lat, lng, updatedAt: now.toISOString() },
  });

  return NextResponse.json({ ok: true, lat, lng });
}
