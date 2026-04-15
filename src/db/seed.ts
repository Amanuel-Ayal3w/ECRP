/**
 * Seed script: creates the initial super_admin user.
 * Run with: npm run db:seed
 */

import { authAdmin } from "@/lib/auth-admin";

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@ecrp.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "ECRP Super Admin";

async function seed() {
  console.log(`Creating super admin: ${ADMIN_EMAIL}`);

  const result = await authAdmin.api.signUpEmail({
    body: { name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (!result?.user) {
    console.error("Failed — user may already exist or password too short.");
    process.exit(1);
  }

  const { db }  = await import("@/db");
  const { adminUser } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(adminUser).set({ role: "super_admin" }).where(eq(adminUser.email, ADMIN_EMAIL));

  console.log("✓ Super Admin created:", result.user.email, "(role: super_admin)");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
