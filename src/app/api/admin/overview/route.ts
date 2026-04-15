import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { adminAlert, driverAvailability, driverProfile, driverUser, passengerUser, rideRequest } from "@/db/schema";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

function formatAgo(date: Date | string) {
  const then = new Date(date).getTime();
  const diffMs = Math.max(Date.now() - then, 0);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function GET() {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [passengers, drivers, activeTrips, openAlerts, recentTrips, recentAlerts, onlineDrivers] = await Promise.all([
    db.select({ id: passengerUser.id }).from(passengerUser),
    db.select({ id: driverUser.id }).from(driverUser),
    db.select().from(rideRequest).where(inArray(rideRequest.status, ["requested", "matched", "accepted", "in_progress"])),
    db.select().from(adminAlert).where(eq(adminAlert.resolved, false)),
    db.select().from(rideRequest).where(inArray(rideRequest.status, ["completed", "cancelled"])).orderBy(desc(rideRequest.createdAt)).limit(3),
    db.select().from(adminAlert).orderBy(desc(adminAlert.createdAt)).limit(3),
    db.select({ userId: driverAvailability.userId }).from(driverAvailability).where(eq(driverAvailability.isOnline, true))
  ]);

  const stats = [
    { label: "Active Trips", value: activeTrips.length, delta: "", up: true },
    { label: "Online Users", value: onlineDrivers.length, delta: "", up: true },
    { label: "Today's Trips", value: recentTrips.length, delta: "", up: true },
    { label: "Open Alerts", value: openAlerts.length, delta: openAlerts.length > 0 ? "urgent" : "", up: false },
  ];

  const activity = [
    ...recentTrips.map((trip) => ({
      id: trip.id,
      icon: "trip" as const,
      text: `${trip.id} ${trip.status}`,
      sub: `${trip.pickup} → ${trip.destination}`,
      time: formatAgo(trip.updatedAt),
    })),
    ...recentAlerts.map((alert) => ({
      id: alert.id,
      icon: "alert" as const,
      text: `Alert on ${alert.tripId ?? alert.id}`,
      sub: alert.location,
      time: formatAgo(alert.createdAt),
    })),
  ].slice(0, 6);

  return NextResponse.json({
    stats,
    activeTrips,
    openAlerts,
    activity,
    counts: {
      passengers: passengers.length,
      drivers: drivers.length,
      activeTrips: activeTrips.length,
      openAlerts: openAlerts.length,
    },
  });
}
