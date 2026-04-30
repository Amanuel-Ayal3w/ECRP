import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import { db } from "@/db";
import * as adminSchema from "@/db/schema-admin";

export const authAdmin = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: adminSchema }),

  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,

  basePath: "/api/admin-auth",

  trustedOrigins: [
    "https://ecrp-et.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],

  advanced: {
    cookiePrefix: "ba-admin",
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "admin",
        input: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  plugins: [nextCookies()],
});

export type AdminSession = typeof authAdmin.$Infer.Session;
