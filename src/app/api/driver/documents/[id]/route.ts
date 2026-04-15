import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { driverDocument } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await db
    .select()
    .from(driverDocument)
    .where(and(eq(driverDocument.id, id), eq(driverDocument.userId, session.user.id)))
    .limit(1);

  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.delete(driverDocument).where(eq(driverDocument.id, id));

  try { await unlink(path.join(process.cwd(), "public", rows[0].filePath)); }
  catch { /* ignore */ }

  return NextResponse.json({ ok: true });
}
