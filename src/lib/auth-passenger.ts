import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { betterAuth } from "better-auth";
import { db } from "@/db";
import * as passengerSchema from "@/db/schema-passenger";

export const authPassenger = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema: passengerSchema }),

  basePath: "/api/auth",

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
