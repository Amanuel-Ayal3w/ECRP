import { describe, expect, it } from "vitest";

import { ADMIN_PANEL_ROLES, isAdminPanelRole, isSuperAdmin } from "./admin-role";

describe("admin-role guards", () => {
  it("exposes supported admin roles", () => {
    expect(ADMIN_PANEL_ROLES).toEqual(["admin", "super_admin"]);
  });

  it("detects valid admin panel roles", () => {
    expect(isAdminPanelRole("admin")).toBe(true);
    expect(isAdminPanelRole("super_admin")).toBe(true);
    expect(isAdminPanelRole("passenger")).toBe(false);
    expect(isAdminPanelRole(undefined)).toBe(false);
    expect(isAdminPanelRole(null)).toBe(false);
  });

  it("detects super admin role", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
    expect(isSuperAdmin("admin")).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });
});
