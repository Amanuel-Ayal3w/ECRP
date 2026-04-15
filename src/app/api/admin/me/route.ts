import { authAdmin } from "@/lib/auth-admin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Returns the current admin's role from the server session (source of truth). */
export async function GET() {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ role: null }, { status: 401 });
  const role = (session.user as { role?: string | null }).role;
  return NextResponse.json({ role: role ?? null });
}
