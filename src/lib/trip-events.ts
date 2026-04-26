import { db } from "@/db";
import { tripEvent } from "@/db/schema";
import { generateId } from "./generate-id";
import { pusherServer } from "./pusher-server";

// Pusher channel name for a trip — matches the client subscription.
export function tripChannel(rideId: string): string {
  return `private-trip.${rideId}`;
}

export interface TripBusEvent {
  event: string;
  rideId: string;
  payload: Record<string, unknown>;
}

export function emitTripEvent(data: TripBusEvent): void {
  pusherServer
    .trigger(tripChannel(data.rideId), data.event, data.payload)
    .catch((err) => console.error("[pusher] trigger failed", err));
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log writer
// ─────────────────────────────────────────────────────────────────────────────

export type ActorRole = "passenger" | "driver" | "system";

export async function writeTripEvent(params: {
  rideId: string;
  actorId: string;
  actorRole: ActorRole;
  event: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(tripEvent).values({
    id: generateId(),
    rideId: params.rideId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    event: params.event,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt: new Date(),
  });
}
