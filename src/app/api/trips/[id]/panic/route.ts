import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { adminAlert, rideRequest, passengerUser, driverUser } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const VALID_SEVERITIES = new Set(["low", "medium", "high"]);

export async function POST(
  request: Request,
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

  const isPassengerOnTrip = Boolean(passengerSession && ride.passengerId === passengerSession.user.id);
  const isDriverOnTrip = Boolean(driverSession && ride.matchedDriverId === driverSession.user.id);

  if (!isPassengerOnTrip && !isDriverOnTrip) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const location: string = typeof body?.location === "string" && body.location.trim()
    ? body.location.trim()
    : ride.pickup;
  const coordinates: string = typeof body?.coordinates === "string" && body.coordinates.trim()
    ? body.coordinates.trim()
    : "0,0";
  const severity: string = VALID_SEVERITIES.has(body?.severity) ? body.severity : "high";

  let userName = "Unknown";
  if (isPassengerOnTrip && passengerSession) {
    const [passenger] = await db
      .select({ name: passengerUser.name })
      .from(passengerUser)
      .where(eq(passengerUser.id, passengerSession.user.id))
      .limit(1);
    userName = passenger?.name ?? passengerSession.user.name ?? "Passenger";
  } else if (isDriverOnTrip && driverSession) {
    const [driver] = await db
      .select({ name: driverUser.name })
      .from(driverUser)
      .where(eq(driverUser.id, driverSession.user.id))
      .limit(1);
    userName = driver?.name ?? driverSession.user.name ?? "Driver";
  }

  const now = new Date();

  const [alert] = await db
    .insert(adminAlert)
    .values({
      id: randomUUID(),
      tripId: id,
      userName,
      senderRole: isDriverOnTrip ? "driver" : "passenger",
      location,
      coordinates,
      severity,
      resolved: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json({ ok: true, alertId: alert.id }, { status: 201 });
}
