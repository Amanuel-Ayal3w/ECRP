import { auth } from "@/lib/auth";
import { isAdminPanelRole, isSuperAdmin } from "@/lib/admin-role";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { generateId } from "@better-auth/core/utils/id";
import { hashPassword } from "better-auth/crypto";
import { eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.role || !isAdminPanelRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(or(eq(user.role, "admin"), eq(user.role, "super_admin")));

  return NextResponse.json({ admins: rows });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.role || !isAdminPanelRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json(
      { error: "Only the super administrator can add new admins." },
      { status: 403 },
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = emailRaw.toLowerCase();

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid name and email are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const userId = generateId();
  const now = new Date();
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id:            userId,
      name,
      email,
      emailVerified: false,
      image:         null,
      role:          "admin",
      createdAt:     now,
      updatedAt:     now,
    });

    await tx.insert(account).values({
      id:          generateId(),
      accountId:   userId,
      providerId:  "credential",
      userId:      userId,
      password:    passwordHash,
      createdAt:   now,
      updatedAt:   now,
    });
  });

  return NextResponse.json({
    ok: true,
    user: { id: userId, name, email, role: "admin" as const },
  });
}
