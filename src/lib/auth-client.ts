import { createAuthClient } from "better-auth/react";

/** Passenger auth — API: /api/auth */
export const passengerAuthClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  basePath: "/api/auth",
});

/** Driver auth — API: /api/driver-auth */
export const driverAuthClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  basePath: "/api/driver-auth",
});

/** Admin auth — API: /api/admin-auth */
export const adminAuthClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  basePath: "/api/admin-auth",
});

// ── Hooks bound to specific roles ────────────────────────────────────────────
export const usePassengerSession = passengerAuthClient.useSession;
export const useDriverSession    = driverAuthClient.useSession;
export const useAdminSession     = adminAuthClient.useSession;

// Legacy alias for components that haven't been updated yet (passenger context)
export const authClient  = passengerAuthClient;
export const { useSession } = passengerAuthClient;
