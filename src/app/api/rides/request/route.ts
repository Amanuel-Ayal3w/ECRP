import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { driverAvailability, rideRequest } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { generateId } from "@/lib/generate-id";
import { rankDriversByDistance } from "@/lib/score-route";
import { writeTripEvent } from "@/lib/trip-events";

export async function POST(request: Request) {
  const session = await authPassenger.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    pickup?: string;
    destination?: string;
    pickupLat?: number;
    pickupLng?: number;
    destLat?: number;
    destLng?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pickup = typeof body.pickup === "string" ? body.pickup.trim() : "";
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";

  if (!pickup || !destination) {
    return NextResponse.json({ error: "Pickup and destination are required." }, { status: 400 });
  }
  if (pickup.toLowerCase() === destination.toLowerCase()) {
    return NextResponse.json({ error: "Pickup and destination cannot be the same." }, { status: 400 });
  }

  const onlineDrivers = await db
    .select({
      userId: driverAvailability.userId,
      routeStart: driverAvailability.routeStart,
      routeEnd: driverAvailability.routeEnd,
      routeStartLat: driverAvailability.routeStartLat,
      routeStartLng: driverAvailability.routeStartLng,
      routeEndLat: driverAvailability.routeEndLat,
      routeEndLng: driverAvailability.routeEndLng,
    })
    .from(driverAvailability)
    .where(eq(driverAvailability.isOnline, true));

  const pickupCoords =
    body.pickupLat != null && body.pickupLng != null
      ? { lat: body.pickupLat, lng: body.pickupLng }
      : null;

  const ranked = await rankDriversByDistance(pickup, onlineDrivers, pickupCoords);
  const bestDriver = ranked[0] ?? null;

  const now = new Date();
  const id = generateId();
  const status = bestDriver ? "matched" : "requested";

  await db.insert(rideRequest).values({
    id,
    passengerId: session.user.id,
    pickup,
    destination,
    status,
    matchedDriverId: bestDriver?.userId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await writeTripEvent({
    rideId: id,
    actorId: session.user.id,
    actorRole: "passenger",
    event: bestDriver ? "match" : "requested",
    metadata: {
      pickup,
      destination,
      matchedDriverId: bestDriver?.userId ?? null,
      distanceKm: bestDriver?.distanceKm !== Infinity ? (bestDriver?.distanceKm ?? null) : null,
    },
  });

  const [ride] = await db
    .select()
    .from(rideRequest)
    .where(eq(rideRequest.id, id))
    .orderBy(desc(rideRequest.createdAt))
    .limit(1);

  return NextResponse.json({ ride, matched: Boolean(bestDriver) }, { status: 201 });
}
