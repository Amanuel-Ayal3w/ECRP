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
    .select()
    .from(driverAvailability)
    .where(eq(driverAvailability.userId, session.user.id))
    .limit(1);

  return NextResponse.json({
    availability: availability ?? {
      userId: session.user.id,
      isOnline: false,
      routeStart: null,
      routeEnd: null,
      updatedAt: new Date(),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { isOnline?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.isOnline !== "boolean") {
    return NextResponse.json({ error: "isOnline must be a boolean." }, { status: 400 });
  }

  const now = new Date();

  await db
    .insert(driverAvailability)
    .values({
      userId: session.user.id,
      isOnline: body.isOnline,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: driverAvailability.userId,
      set: { isOnline: body.isOnline, updatedAt: now },
    });

  const [availability] = await db
    .select()
    .from(driverAvailability)
    .where(eq(driverAvailability.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ availability });
}
