import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { adminPenaltyJob } from "@/db/schema";
import { desc } from "drizzle-orm";
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

  const jobs = await db.select().from(adminPenaltyJob).orderBy(desc(adminPenaltyJob.createdAt));

  return NextResponse.json({ jobs });
}
