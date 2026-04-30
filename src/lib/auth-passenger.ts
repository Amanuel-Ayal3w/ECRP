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
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    // Allow all vusercontent.net preview domains
    /https:\/\/.*\.vusercontent\.net/,
    // Allow localhost for development
    "http://localhost:3000",
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
