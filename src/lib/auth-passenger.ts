import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import { db } from "@/db";
import * as passengerSchema from "@/db/schema-passenger";

export const authPassenger = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: passengerSchema }),

  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,

  basePath: "/api/auth",

  trustedOrigins: [
    "https://ecrp-et.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],

  advanced: {
    cookiePrefix: "ba-passenger",
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

export type PassengerSession = typeof authPassenger.$Infer.Session;
