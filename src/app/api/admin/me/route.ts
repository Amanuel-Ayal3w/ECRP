import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Returns the current user’s `role` from the server session (source of truth). */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  const role = session.user.role as string | null | undefined;
  return NextResponse.json({ role: role ?? null });
}
