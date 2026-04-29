import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { adminAlert, driverUser, passengerUser, rideRequest } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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

  const alerts = await db.select().from(adminAlert).orderBy(desc(adminAlert.createdAt));

  const rows = await Promise.all(
    alerts.map(async (alert) => {
      let email: string | null = null;

      if (alert.tripId) {
        const [ride] = await db
          .select({ passengerId: rideRequest.passengerId, driverId: rideRequest.matchedDriverId })
          .from(rideRequest)
          .where(eq(rideRequest.id, alert.tripId))
          .limit(1);

        if (ride) {
          const [passenger] = await db
            .select({ email: passengerUser.email })
            .from(passengerUser)
            .where(eq(passengerUser.id, ride.passengerId))
            .limit(1);

          if (ride.driverId) {
            const [driver] = await db
              .select({ email: driverUser.email })
              .from(driverUser)
              .where(eq(driverUser.id, ride.driverId))
              .limit(1);
            if (passenger && driver) {
              email = `Passenger: ${passenger.email} · Driver: ${driver.email}`;
            } else {
              email = passenger?.email ?? driver?.email ?? null;
            }
          } else {
            email = passenger?.email ?? null;
          }
        }
      }

      return {
        id:        alert.id,
        trip:      alert.tripId ?? alert.id,
        user:      alert.userName,
        role:      alert.senderRole ?? null,
        email,
        location:  alert.location,
        coords:    alert.coordinates,
        time:      formatAgo(alert.createdAt),
        createdAt: alert.createdAt.toISOString(),
        severity:  alert.severity,
        resolved:  alert.resolved,
      };
    }),
  );

  return NextResponse.json({ alerts: rows });
}
