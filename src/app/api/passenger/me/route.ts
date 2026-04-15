import { authPassenger } from "@/lib/auth-passenger";
import { db } from "@/db";
import { passengerAccount, passengerUser } from "@/db/schema";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await authPassenger.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db
    .select({ id: passengerUser.id, name: passengerUser.name, email: passengerUser.email, createdAt: passengerUser.createdAt })
    .from(passengerUser)
    .where(eq(passengerUser.id, session.user.id))
    .limit(1);

  if (!row[0]) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: { ...row[0], role: "passenger" } });
}

export async function PATCH(request: Request) {
  const session = await authPassenger.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; currentPassword?: string; newPassword?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const userId = session.user.id;

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    await db.update(passengerUser).set({ name, updatedAt: new Date() }).where(eq(passengerUser.id, userId));
  }

  if (body.currentPassword !== undefined || body.newPassword !== undefined) {
    const current = body.currentPassword ?? "";
    const next    = body.newPassword    ?? "";
    if (!current) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
    if (!next)    return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
    if (next.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    if (current === next) return NextResponse.json({ error: "New password must differ from current password." }, { status: 400 });

    const cred = await db.select({ password: passengerAccount.password }).from(passengerAccount)
      .where(eq(passengerAccount.userId, userId)).limit(1);
    const stored = cred[0]?.password;
    if (!stored) return NextResponse.json({ error: "No password credential found." }, { status: 400 });

    const valid = await verifyPassword({ hash: stored, password: current });
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

    const newHash = await hashPassword(next);
    await db.update(passengerAccount).set({ password: newHash, updatedAt: new Date() }).where(eq(passengerAccount.userId, userId));
  }

  return NextResponse.json({ ok: true });
}
