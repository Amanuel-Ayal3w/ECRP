/**
 * Seed script: creates the initial admin user.
 * Run with: npm run db:seed
 *
 * Change ADMIN_EMAIL and ADMIN_PASSWORD before running,
 * or set them as environment variables.
 */

import { auth } from "@/lib/auth";

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "Admin2@ecrp.app";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "ECRP Admin";

async function seed() {
  console.log(`Creating admin user: ${ADMIN_EMAIL}`);

  const result = await auth.api.signUpEmail({
    body: {
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  if (!result || !result.user) {
    console.error("Failed to create admin user — user may already exist.");
    process.exit(1);
  }

  // Promote to admin role via direct DB update
  const { db } = await import("@/db");
  const { user } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(user).set({ role: "super_admin" }).where(eq(user.email, ADMIN_EMAIL));

  console.log("✓ Super Admin user created:", result.user.email, "(role: super_admin)");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
