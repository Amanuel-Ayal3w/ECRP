import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { driverAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [availability] = await db
    .select({ routeStart: driverAvailability.routeStart, routeEnd: driverAvailability.routeEnd })
    .from(driverAvailability)
    .where(eq(driverAvailability.userId, session.user.id))
    .limit(1);

  return NextResponse.json({
    route: {
      routeStart: availability?.routeStart ?? null,
      routeEnd: availability?.routeEnd ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { routeStart?: string; routeEnd?: string };
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

  const now = new Date();

  await db
    .insert(driverAvailability)
    .values({
      userId: session.user.id,
      routeStart,
      routeEnd,
      isOnline: false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: driverAvailability.userId,
      set: {
        routeStart,
        routeEnd,
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
