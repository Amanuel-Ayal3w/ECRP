// Convenience re-exports. Import the specific instance where possible.
export { authAdmin }     from "./auth-admin";
export { authPassenger } from "./auth-passenger";
export { authDriver }    from "./auth-driver";

// Legacy alias used by some existing API routes — points to admin
export { authAdmin as auth } from "./auth-admin";
