import { authDriver } from "@/lib/auth-driver";
import { db } from "@/db";
import { driverDocument, driverUser } from "@/db/schema";
import { pusherServer } from "@/lib/pusher-server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "driver-docs");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_DOC_TYPES = new Set(["license", "registration", "insurance"]);

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET() {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await db.select().from(driverDocument).where(eq(driverDocument.userId, session.user.id));
  return NextResponse.json({ documents: docs });
}

export async function POST(request: Request) {
  const session = await authDriver.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file    = formData.get("file");
  const docType = formData.get("docType");

  if (!(file instanceof File))  return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (typeof docType !== "string" || !ALLOWED_DOC_TYPES.has(docType))
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  if (!ALLOWED_MIME.has(file.type))
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or PDF files are allowed." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });

  const existing = await db
    .select({ id: driverDocument.id, filePath: driverDocument.filePath, docType: driverDocument.docType })
    .from(driverDocument)
    .where(eq(driverDocument.userId, session.user.id))
    .then((rows) => rows.find((r) => r.docType === docType));

  if (existing) {
    await db.delete(driverDocument).where(eq(driverDocument.id, existing.id));
    try {
      const { unlink } = await import("fs/promises");
      await unlink(path.join(process.cwd(), "public", existing.filePath));
    } catch { /* ignore */ }
  }

  const ext        = file.name.split(".").pop() ?? "bin";
  const uniqueName = `${session.user.id}-${docType}-${generateId()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(UPLOAD_DIR, uniqueName), Buffer.from(bytes));

  const relPath = `/uploads/driver-docs/${uniqueName}`;
  const id      = generateId();

  const [doc] = await db.insert(driverDocument).values({
    id, userId: session.user.id, docType, originalName: file.name,
    filePath: relPath, mimeType: file.type, fileSize: file.size,
    status: "pending", uploadedAt: new Date(),
  }).returning();

  const [driver] = await db
    .select({ name: driverUser.name })
    .from(driverUser)
    .where(eq(driverUser.id, session.user.id))
    .limit(1);

  pusherServer
    .trigger("private-admin-docs", "document_uploaded", {
      documentId:   doc.id,
      driverId:     session.user.id,
      driverName:   driver?.name ?? "Unknown driver",
      docType:      doc.docType,
      originalName: doc.originalName,
      uploadedAt:   doc.uploadedAt,
    })
    .catch((err) => console.error("[pusher] doc notification failed", err));

  return NextResponse.json({ document: doc }, { status: 201 });
}
