/**
 * Seed script: creates the initial super_admin user.
 * Run with: npm run db:seed
 *
 * Required env vars (no defaults — must be set explicitly):
 *   ADMIN_EMAIL
 *   ADMIN_PASSWORD
 *   ADMIN_NAME  (optional, defaults to "ECRP Super Admin")
 */

import { authAdmin } from "@/lib/auth-admin";

async function seed() {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name     = process.env.ADMIN_NAME ?? "ECRP Super Admin";

  if (!email || !password) {
    console.error("Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in your environment before seeding.");
    process.exit(1);
  }

  // TypeScript now knows email and password are strings
  console.log(`Creating super admin: ${email}`);

  const result = await authAdmin.api.signUpEmail({
    body: { name, email, password },
  });

  if (!result?.user) {
    console.error("Failed — user may already exist or password is too short.");
    process.exit(1);
  }

  const { db } = await import("@/db");
  const { adminUser } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(adminUser).set({ role: "super_admin" }).where(eq(adminUser.email, email));

  console.log("✓ Super Admin created:", result.user.email, "(role: super_admin)");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
