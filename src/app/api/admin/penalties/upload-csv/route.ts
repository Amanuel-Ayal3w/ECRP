import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { adminPenaltyJob } from "@/db/schema";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: Request) {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only CSV files are allowed." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "admin-penalties");
  await mkdir(uploadDir, { recursive: true });

  const id = generateId();
  const fileName = `${id}-${file.name}`;
  const filePath = `/uploads/admin-penalties/${fileName}`;
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes));

  const now = new Date();
  const [job] = await db.insert(adminPenaltyJob).values({
    id,
    fileName: file.name,
    filePath,
    status: "uploaded",
    totalRows: 0,
    processedRows: 0,
    affectedDrivers: 0,
    createdBy: (session?.user as { id?: string } | undefined)?.id ?? "",
    createdAt: now,
    updatedAt: now,
  }).returning();

  return NextResponse.json({ job }, { status: 201 });
}
