import { authAdmin } from "@/lib/auth-admin";
import { isAdminPanelRole, isSuperAdmin } from "@/lib/admin-role";
import { db } from "@/db";
import { adminAccount, adminUser } from "@/db/schema";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";
import { eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getAdminSession() {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  return session;
}

export async function GET() {
  const session = await getAdminSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdminPanelRole(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({ id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role, createdAt: adminUser.createdAt })
    .from(adminUser)
    .where(or(eq(adminUser.role, "admin"), eq(adminUser.role, "super_admin")));

  return NextResponse.json({ admins: rows });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !isAdminPanelRole(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(role)) {
    return NextResponse.json({ error: "Only the super administrator can add new admins." }, { status: 403 });
  }

  let body: { name?: string; email?: string; password?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const name     = typeof body.name     === "string" ? body.name.trim()            : "";
  const emailRaw = typeof body.email    === "string" ? body.email.trim()           : "";
  const password = typeof body.password === "string" ? body.password               : "";
  const email    = emailRaw.toLowerCase();

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid name and email are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await db.select({ id: adminUser.id }).from(adminUser).where(eq(adminUser.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "An admin account with this email already exists." }, { status: 409 });
  }

  const userId      = generateId();
  const now         = new Date();
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(adminUser).values({ id: userId, name, email, emailVerified: false, image: null, role: "admin", createdAt: now, updatedAt: now });
    await tx.insert(adminAccount).values({ id: generateId(), accountId: userId, providerId: "credential", userId, password: passwordHash, createdAt: now, updatedAt: now });
  });

  return NextResponse.json({ ok: true, user: { id: userId, name, email, role: "admin" as const } });
}
