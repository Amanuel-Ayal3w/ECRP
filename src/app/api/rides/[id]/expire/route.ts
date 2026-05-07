import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { rematchRide } from "@/lib/rematch";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authPassenger.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return NextResponse.json({ error: "Ride not found." }, { status: 404 });

  if (ride.passengerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (ride.status !== "matched") {
    return NextResponse.json(
      { error: "Only a matched ride can be expired. Current status: " + ride.status },
      { status: 400 },
    );
  }

  const expiredDriverId = ride.matchedDriverId;
  const now = new Date();

  await db
    .update(rideRequest)
    .set({ status: "requested", matchedDriverId: null, updatedAt: now })
    .where(eq(rideRequest.id, id));

  await Promise.all([
    pusherServer.trigger(`private-passenger.${ride.passengerId}`, "match-expired", {
      rideId: id,
    }),
    expiredDriverId
      ? pusherServer.trigger(`private-driver.${expiredDriverId}`, "match-expired", { rideId: id })
      : Promise.resolve(),
  ]);

  await rematchRide(ride);

  return NextResponse.json({ ok: true });
}
