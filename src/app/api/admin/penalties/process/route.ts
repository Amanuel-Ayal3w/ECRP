import { authAdmin } from "@/lib/auth-admin";
import { db } from "@/db";
import { adminPenaltyJob, driverProfile } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

function requireAdminRole(session: Awaited<ReturnType<typeof authAdmin.api.getSession>>) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session && (role === "admin" || role === "super_admin"));
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [] as Array<Record<string, string>>;
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = (values[index] ?? "").trim();
      return acc;
    }, {});
  });
}

export async function POST(request: Request) {
  const session = await authAdmin.api.getSession({ headers: await headers() });
  if (!requireAdminRole(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { jobId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const [job] = await db.select().from(adminPenaltyJob).where(eq(adminPenaltyJob.id, jobId)).limit(1);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const now = new Date();
  await db.update(adminPenaltyJob).set({ status: "processing", updatedAt: now }).where(eq(adminPenaltyJob.id, jobId));

  try {
    const absolutePath = path.join(process.cwd(), "public", job.filePath);
    const csv = await readFile(absolutePath, "utf8");
    const rows = parseCsv(csv);

    let affectedDrivers = 0;
    for (const row of rows) {
      const plate = row.plate_number ?? row.plate ?? "";
      const penalty = Number(row.penalty_points ?? row.points ?? 0);
      if (!plate || Number.isNaN(penalty)) continue;

      const [profile] = await db.select().from(driverProfile).where(eq(driverProfile.plateNumber, plate)).limit(1);
      if (!profile) continue;

      const nextScore = Math.max((profile.serviceScore ?? 0) + penalty, 0);
      await db.update(driverProfile).set({ serviceScore: nextScore, updatedAt: new Date() }).where(eq(driverProfile.userId, profile.userId));
      affectedDrivers += 1;
    }

    await db.update(adminPenaltyJob).set({
      status: "completed",
      totalRows: rows.length,
      processedRows: rows.length,
      affectedDrivers,
      updatedAt: new Date(),
    }).where(eq(adminPenaltyJob.id, jobId));

    return NextResponse.json({ ok: true, totalRows: rows.length, affectedDrivers });
  } catch (error) {
    await db.update(adminPenaltyJob).set({
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      updatedAt: new Date(),
    }).where(eq(adminPenaltyJob.id, jobId));

    return NextResponse.json({ error: "Could not process CSV." }, { status: 500 });
  }
}
