import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { driverDocument, driverUser } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function requireAdmin(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

export async function GET() {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await db
    .select({
      id:           driverDocument.id,
      userId:       driverDocument.userId,
      driverName:   driverUser.name,
      driverEmail:  driverUser.email,
      docType:      driverDocument.docType,
      originalName: driverDocument.originalName,
      filePath:     driverDocument.filePath,
      mimeType:     driverDocument.mimeType,
      fileSize:     driverDocument.fileSize,
      status:              driverDocument.status,
      uploadedAt:          driverDocument.uploadedAt,
      reviewedByAdminName: driverDocument.reviewedByAdminName,
      reviewedAt:          driverDocument.reviewedAt,
    })
    .from(driverDocument)
    .innerJoin(driverUser, eq(driverUser.id, driverDocument.userId))
    .orderBy(desc(driverDocument.uploadedAt));

  return NextResponse.json({ documents: docs });
}
