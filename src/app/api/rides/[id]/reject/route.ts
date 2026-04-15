import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { rideRejection, rideRequest } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, id)).limit(1);
  if (!ride) return NextResponse.json({ error: "Ride not found." }, { status: 404 });

  if (ride.status !== "requested" && ride.status !== "matched") {
    return NextResponse.json({ error: "Ride can no longer be rejected." }, { status: 400 });
  }

  const existing = await db
    .select({ id: rideRejection.id })
    .from(rideRejection)
    .where(and(eq(rideRejection.rideId, id), eq(rideRejection.driverId, session.user.id)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(rideRejection).values({
      id: generateId(),
      rideId: id,
      driverId: session.user.id,
      createdAt: new Date(),
    });
  }

  if (ride.matchedDriverId === session.user.id) {
    await db
      .update(rideRequest)
      .set({
        status: "requested",
        matchedDriverId: null,
        updatedAt: new Date(),
      })
      .where(eq(rideRequest.id, id));
  }

  return NextResponse.json({ ok: true });
}
