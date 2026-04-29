import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { driverDocument } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function requireAdmin(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

const VALID_STATUSES = new Set(["verified", "rejected"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status: string = typeof body?.status === "string" ? body.status : "";

  if (!VALID_STATUSES.has(status))
    return NextResponse.json({ error: "status must be 'verified' or 'rejected'." }, { status: 400 });

  const [doc] = await db
    .select({ id: driverDocument.id })
    .from(driverDocument)
    .where(eq(driverDocument.id, id))
    .limit(1);

  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const adminRole = (session?.user as { role?: string } | undefined)?.role ?? "admin";
  const displayName = adminRole === "super_admin"
    ? `Super Admin · ${session!.user.name}`
    : session!.user.name;

  await db.update(driverDocument).set({
    status,
    reviewedByAdminId:   session!.user.id,
    reviewedByAdminName: displayName,
    reviewedAt:          new Date(),
  }).where(eq(driverDocument.id, id));

  return NextResponse.json({ ok: true });
}
