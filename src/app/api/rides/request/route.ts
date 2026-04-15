import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { driverAvailability, rideRequest } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function scoreRouteMatch(routeStart: string | null, routeEnd: string | null, pickup: string, destination: string) {
  const start = (routeStart ?? "").toLowerCase();
  const end = (routeEnd ?? "").toLowerCase();
  const from = pickup.toLowerCase();
  const to = destination.toLowerCase();

  let score = 0;
  if (end.includes(to)) score += 3;
  if (start.includes(from)) score += 2;
  if (start && end) score += 1;
  return score;
}

export async function POST(request: Request) {
  const session = await authPassenger.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pickup?: string; destination?: string };
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
    .select({ userId: driverAvailability.userId, routeStart: driverAvailability.routeStart, routeEnd: driverAvailability.routeEnd })
    .from(driverAvailability)
    .where(eq(driverAvailability.isOnline, true));

  const ranked = onlineDrivers
    .map((d) => ({ ...d, score: scoreRouteMatch(d.routeStart, d.routeEnd, pickup, destination) }))
    .sort((a, b) => b.score - a.score);

  const bestDriver = ranked[0];
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

  const [ride] = await db
    .select()
    .from(rideRequest)
    .where(eq(rideRequest.id, id))
    .orderBy(desc(rideRequest.createdAt))
    .limit(1);

  return NextResponse.json({ ride, matched: Boolean(bestDriver) }, { status: 201 });
}
