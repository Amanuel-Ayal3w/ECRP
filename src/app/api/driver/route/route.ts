import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { driverAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { geocodePlace } from "@/lib/gebeta";

export async function GET() {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [availability] = await db
    .select({
      routeStart: driverAvailability.routeStart,
      routeEnd: driverAvailability.routeEnd,
      routeStartLat: driverAvailability.routeStartLat,
      routeStartLng: driverAvailability.routeStartLng,
      routeEndLat: driverAvailability.routeEndLat,
      routeEndLng: driverAvailability.routeEndLng,
    })
    .from(driverAvailability)
    .where(eq(driverAvailability.userId, session.user.id))
    .limit(1);

  return NextResponse.json({
    route: {
      routeStart: availability?.routeStart ?? null,
      routeEnd: availability?.routeEnd ?? null,
      routeStartLat: availability?.routeStartLat ?? null,
      routeStartLng: availability?.routeStartLng ?? null,
      routeEndLat: availability?.routeEndLat ?? null,
      routeEndLng: availability?.routeEndLng ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    routeStart?: string;
    routeEnd?: string;
    routeStartLat?: number;
    routeStartLng?: number;
    routeEndLat?: number;
    routeEndLng?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const routeStart = typeof body.routeStart === "string" ? body.routeStart.trim() : "";
  const routeEnd = typeof body.routeEnd === "string" ? body.routeEnd.trim() : "";

  if (!routeStart || !routeEnd) {
    return NextResponse.json({ error: "routeStart and routeEnd are required." }, { status: 400 });
  }
  if (routeStart.toLowerCase() === routeEnd.toLowerCase()) {
    return NextResponse.json({ error: "routeStart and routeEnd cannot be the same." }, { status: 400 });
  }

  // Use client-provided coords when available, fall back to server geocoding
  const [startCoords, endCoords] = await Promise.all([
    body.routeStartLat != null && body.routeStartLng != null
      ? Promise.resolve({ lat: body.routeStartLat, lng: body.routeStartLng })
      : geocodePlace(routeStart),
    body.routeEndLat != null && body.routeEndLng != null
      ? Promise.resolve({ lat: body.routeEndLat, lng: body.routeEndLng })
      : geocodePlace(routeEnd),
  ]);

  const now = new Date();

  await db
    .insert(driverAvailability)
    .values({
      userId: session.user.id,
      routeStart,
      routeEnd,
      routeStartLat: startCoords?.lat ?? null,
      routeStartLng: startCoords?.lng ?? null,
      routeEndLat: endCoords?.lat ?? null,
      routeEndLng: endCoords?.lng ?? null,
      isOnline: false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: driverAvailability.userId,
      set: {
        routeStart,
        routeEnd,
        routeStartLat: startCoords?.lat ?? null,
        routeStartLng: startCoords?.lng ?? null,
        routeEndLat: endCoords?.lat ?? null,
        routeEndLng: endCoords?.lng ?? null,
        updatedAt: now,
      },
    });

  const [availability] = await db
    .select()
    .from(driverAvailability)
    .where(eq(driverAvailability.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ availability });
}

export async function DELETE() {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  await db
    .insert(driverAvailability)
    .values({
      userId: session.user.id,
      routeStart: null,
      routeEnd: null,
      routeStartLat: null,
      routeStartLng: null,
      routeEndLat: null,
      routeEndLng: null,
      isOnline: false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: driverAvailability.userId,
      set: {
        routeStart: null,
        routeEnd: null,
        routeStartLat: null,
        routeStartLng: null,
        routeEndLat: null,
        routeEndLng: null,
        isOnline: false,
        updatedAt: now,
      },
    });

  return NextResponse.json({
    route: {
      routeStart: null,
      routeEnd: null,
      routeStartLat: null,
      routeStartLng: null,
      routeEndLat: null,
      routeEndLng: null,
    },
  });
}
