import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { driverAccount, driverUser } from "@/db/schema";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db
    .select({ id: driverUser.id, name: driverUser.name, email: driverUser.email, createdAt: driverUser.createdAt })
    .from(driverUser)
    .where(eq(driverUser.id, session.user.id))
    .limit(1);

  if (!row[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: { ...row[0], role: "driver" } });
}

export async function PATCH(request: Request) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; currentPassword?: string; newPassword?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const userId = session.user.id;

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    await db.update(driverUser).set({ name, updatedAt: new Date() }).where(eq(driverUser.id, userId));
  }

  if (body.currentPassword !== undefined || body.newPassword !== undefined) {
    const current = body.currentPassword ?? "";
    const next    = body.newPassword    ?? "";
    if (!current) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
    if (!next)    return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
    if (next.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    if (current === next) return NextResponse.json({ error: "New password must differ from current password." }, { status: 400 });

    const cred = await db.select({ password: driverAccount.password }).from(driverAccount)
      .where(eq(driverAccount.userId, userId)).limit(1);
    const stored = cred[0]?.password;
    if (!stored) return NextResponse.json({ error: "No password credential found." }, { status: 400 });

    const valid = await verifyPassword({ hash: stored, password: current });
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

    const newHash = await hashPassword(next);
    await db.update(driverAccount).set({ password: newHash, updatedAt: new Date() }).where(eq(driverAccount.userId, userId));
  }

  return NextResponse.json({ ok: true });
}
