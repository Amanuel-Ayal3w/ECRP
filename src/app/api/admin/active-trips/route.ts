import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { driverProfile, driverUser, passengerUser, rideRequest } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

function progressForStatus(status: string) {
  if (status === "requested") return 20;
  if (status === "matched") return 50;
  if (status === "accepted") return 75;
  if (status === "in_progress") return 90;
  if (status === "completed") return 100;
  return 0;
}

function durationFromCreated(createdAt: Date | string) {
  const diff = Math.max(Date.now() - new Date(createdAt).getTime(), 0);
  const mins = Math.round(diff / 60000);
  return mins < 60 ? `${Math.max(mins, 1)} min` : `${Math.round(mins / 60)} hr`;
}

export async function GET() {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTrips = await db
    .select()
    .from(rideRequest)
    .where(inArray(rideRequest.status, ["requested", "matched", "accepted", "in_progress"]))
    .orderBy(desc(rideRequest.createdAt));

  const [passengers, drivers, profiles] = await Promise.all([
    db.select({ id: passengerUser.id, name: passengerUser.name }).from(passengerUser),
    db.select({ id: driverUser.id, name: driverUser.name }).from(driverUser),
    db.select().from(driverProfile),
  ]);

  const passengerById = new Map(passengers.map((user) => [user.id, user.name]));
  const driverById = new Map(drivers.map((user) => [user.id, user.name]));
  const profileByDriver = new Map(profiles.map((profile) => [profile.userId, profile]));

  const rows = activeTrips.map((trip) => ({
    id: trip.id,
    passenger: passengerById.get(trip.passengerId) ?? trip.passengerId.slice(0, 8),
    driver: trip.matchedDriverId ? driverById.get(trip.matchedDriverId) ?? trip.matchedDriverId.slice(0, 8) : "Unassigned",
    vehicle: trip.matchedDriverId ? profileByDriver.get(trip.matchedDriverId)?.vehicleModel ?? "—" : "—",
    from: trip.pickup,
    to: trip.destination,
    progress: progressForStatus(trip.status),
    duration: durationFromCreated(trip.createdAt),
    status: trip.status === "in_progress" ? "active" : trip.status === "accepted" ? "active" : trip.status === "matched" ? "active" : "completing",
  }));

  return NextResponse.json({ trips: rows });
}
