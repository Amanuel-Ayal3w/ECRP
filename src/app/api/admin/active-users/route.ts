import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { driverAvailability, driverProfile, driverUser, passengerUser, rideRequest } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

export async function GET() {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [drivers, passengers, availabilityRows, profiles, allTrips] = await Promise.all([
    db.select({ id: driverUser.id, name: driverUser.name, email: driverUser.email, createdAt: driverUser.createdAt }).from(driverUser),
    db.select({ id: passengerUser.id, name: passengerUser.name, email: passengerUser.email, createdAt: passengerUser.createdAt }).from(passengerUser),
    db.select().from(driverAvailability),
    db.select().from(driverProfile),
    // Load ALL trips to compute accurate per-user trip counts
    db.select({
      passengerId: rideRequest.passengerId,
      matchedDriverId: rideRequest.matchedDriverId,
      status: rideRequest.status,
    }).from(rideRequest),
  ]);

  const activeTrips = allTrips.filter((t) =>
    ["requested", "matched", "accepted", "in_progress"].includes(t.status)
  );
  const completedTrips = allTrips.filter((t) => t.status === "completed");

  const activePassengerIds = new Set(activeTrips.map((t) => t.passengerId));
  const activeDriverIds = new Set(
    activeTrips.filter((t) => t.matchedDriverId).map((t) => t.matchedDriverId as string)
  );
  const availabilityByDriver = new Map(availabilityRows.map((row) => [row.userId, row]));
  const profileByDriver = new Map(profiles.map((row) => [row.userId, row]));

  // Count completed trips per driver
  const completedByDriver = new Map<string, number>();
  for (const trip of completedTrips) {
    if (trip.matchedDriverId) {
      completedByDriver.set(trip.matchedDriverId, (completedByDriver.get(trip.matchedDriverId) ?? 0) + 1);
    }
  }

  // Count completed trips per passenger
  const completedByPassenger = new Map<string, number>();
  for (const trip of completedTrips) {
    completedByPassenger.set(trip.passengerId, (completedByPassenger.get(trip.passengerId) ?? 0) + 1);
  }

  const driverRows = drivers.map((driver) => {
    const availability = availabilityByDriver.get(driver.id);
    const profile = profileByDriver.get(driver.id);
    return {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      role: "Driver",
      // Prefer persisted tripsCompleted; fall back to counting from trip history
      trips: profile?.tripsCompleted ?? completedByDriver.get(driver.id) ?? 0,
      score: profile?.serviceScore ?? 0,
      status: availability?.isOnline ? "online" : activeDriverIds.has(driver.id) ? "riding" : "offline",
      joined: new Date(driver.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    };
  });

  const passengerRows = passengers.map((passenger) => ({
    id: passenger.id,
    name: passenger.name,
    email: passenger.email,
    role: "Passenger",
    trips: completedByPassenger.get(passenger.id) ?? 0,
    score: null,
    status: activePassengerIds.has(passenger.id) ? "riding" : "offline",
    joined: new Date(passenger.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
  }));

  return NextResponse.json({ users: [...driverRows, ...passengerRows] });
}
