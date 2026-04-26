import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { rideRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac } from "crypto";

// Pusher-compatible private channel auth.
// Required env vars: PUSHER_APP_KEY, PUSHER_APP_SECRET
// Channel naming convention: private-trip.<tripId>
//
// Clients POST: socket_id=<id>&channel_name=private-trip.<tripId>
// Server returns: { auth: "<key>:<hmac-sha256>" }

export async function POST(request: Request) {
  const appKey = process.env.PUSHER_APP_KEY;
  const appSecret = process.env.PUSHER_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json(
      { error: "Realtime provider not configured." },
      { status: 503 },
    );
  }

  const h = await headers();
  const [passengerSession, driverSession] = await Promise.all([
    authPassenger.api.getSession({ headers: h }),
    authDriver.api.getSession({ headers: h }),
  ]);

  if (!passengerSession && !driverSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let socketId: string | undefined;
  let channelName: string | undefined;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    socketId = params.get("socket_id") ?? undefined;
    channelName = params.get("channel_name") ?? undefined;
  } else {
    const body = await request.json().catch(() => ({}));
    socketId = body?.socket_id;
    channelName = body?.channel_name;
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "socket_id and channel_name are required." }, { status: 400 });
  }

  // Only private trip channels are supported: private-trip.<tripId>
  const tripChannelMatch = channelName.match(/^private-trip\.(.+)$/);
  if (!tripChannelMatch) {
    return NextResponse.json({ error: "Unsupported channel." }, { status: 403 });
  }

  const tripId = tripChannelMatch[1];

  const [ride] = await db.select().from(rideRequest).where(eq(rideRequest.id, tripId)).limit(1);
  if (!ride) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  const userId = passengerSession?.user.id ?? driverSession?.user.id;
  const isParticipant =
    ride.passengerId === userId || ride.matchedDriverId === userId;

  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const signingString = `${socketId}:${channelName}`;
  const signature = createHmac("sha256", appSecret).update(signingString).digest("hex");

  return NextResponse.json({ auth: `${appKey}:${signature}` });
}
