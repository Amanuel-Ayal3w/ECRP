import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { adminAlert } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [alert] = await db.select().from(adminAlert).where(eq(adminAlert.id, id)).limit(1);
  if (!alert) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }

  const now = new Date();
  await db
    .update(adminAlert)
    .set({
      resolved: true,
      resolvedBy: (session?.user as { id?: string } | undefined)?.id ?? null,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(adminAlert.id, id));

  return NextResponse.json({ ok: true });
}
