import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import { db } from "@/db";
import * as driverSchema from "@/db/schema-driver";

export const authDriver = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: driverSchema }),

  basePath: "/api/driver-auth",

  advanced: {
    cookiePrefix: "ba-driver",
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  plugins: [nextCookies()],
});

export type DriverSession = typeof authDriver.$Infer.Session;
