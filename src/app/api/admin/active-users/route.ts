import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { driverAvailability, driverProfile, driverUser, passengerUser, rideRequest } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
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

  const [drivers, passengers, availabilityRows, profiles, activeTrips] = await Promise.all([
    db.select({ id: driverUser.id, name: driverUser.name, email: driverUser.email, createdAt: driverUser.createdAt }).from(driverUser),
    db.select({ id: passengerUser.id, name: passengerUser.name, email: passengerUser.email, createdAt: passengerUser.createdAt }).from(passengerUser),
    db.select().from(driverAvailability),
    db.select().from(driverProfile),
    db.select().from(rideRequest).where(inArray(rideRequest.status, ["requested", "matched", "accepted", "in_progress"])),
  ]);

  const activePassengerIds = new Set(activeTrips.map((trip) => trip.passengerId));
  const activeDriverIds = new Set(activeTrips.filter((trip) => trip.matchedDriverId).map((trip) => trip.matchedDriverId as string));
  const availabilityByDriver = new Map(availabilityRows.map((row) => [row.userId, row]));
  const profileByDriver = new Map(profiles.map((row) => [row.userId, row]));
  const tripsByDriver = new Map<string, number>();
  for (const trip of activeTrips) {
    if (trip.matchedDriverId) {
      tripsByDriver.set(trip.matchedDriverId, (tripsByDriver.get(trip.matchedDriverId) ?? 0) + 1);
    }
  }
  const tripsByPassenger = new Map<string, number>();
  for (const trip of activeTrips) {
    tripsByPassenger.set(trip.passengerId, (tripsByPassenger.get(trip.passengerId) ?? 0) + 1);
  }

  const driverRows = drivers.map((driver) => {
    const availability = availabilityByDriver.get(driver.id);
    const profile = profileByDriver.get(driver.id);
    const score = profile?.serviceScore ?? 0;
    return {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      role: "Driver",
      trips: profile?.tripsCompleted ?? tripsByDriver.get(driver.id) ?? 0,
      score,
      status: availability?.isOnline ? "online" : activeDriverIds.has(driver.id) ? "riding" : "offline",
      joined: new Date(driver.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    };
  });

  const passengerRows = passengers.map((passenger) => ({
    id: passenger.id,
    name: passenger.name,
    email: passenger.email,
    role: "Passenger",
    trips: tripsByPassenger.get(passenger.id) ?? 0,
    score: null,
    status: activePassengerIds.has(passenger.id) ? "riding" : "offline",
    joined: new Date(passenger.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
  }));

  return NextResponse.json({ users: [...driverRows, ...passengerRows] });
}
