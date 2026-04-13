/** Roles allowed to use the admin console */
export const ADMIN_PANEL_ROLES = ["admin", "super_admin"] as const;
export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];

export function isAdminPanelRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin";
}
