import { describe, expect, it } from "vitest";

import {
  asQuery,
  parseAuthRole,
  postLoginPath,
  postSignupPath,
  telegramPath,
  type AuthRole,
} from "./auth-role";

describe("auth-role helpers", () => {
  it("parses known roles", () => {
    expect(parseAuthRole("passenger")).toBe("passenger");
    expect(parseAuthRole("driver")).toBe("driver");
    expect(parseAuthRole("admin")).toBe("admin");
  });

  it("rejects unknown roles", () => {
    expect(parseAuthRole("" as string)).toBeNull();
    expect(parseAuthRole("rider")).toBeNull();
    expect(parseAuthRole(null)).toBeNull();
  });

  it("returns correct login paths", () => {
    expect(postLoginPath("driver")).toBe("/driver");
    expect(postLoginPath("passenger")).toBe("/passenger");
    expect(postLoginPath("admin")).toBe("/onboarding");
    expect(postLoginPath(null)).toBe("/onboarding");
  });

  it("returns correct signup paths", () => {
    expect(postSignupPath("driver")).toBe("/driver");
    expect(postSignupPath("passenger")).toBe("/passenger");
    expect(postSignupPath("admin")).toBe("/passenger");
    expect(postSignupPath(null)).toBe("/passenger");
  });

  it("returns telegram redirect paths", () => {
    expect(telegramPath("driver")).toBe("/driver");
    expect(telegramPath("passenger")).toBe("/passenger");
    expect(telegramPath("admin")).toBe("/passenger");
    expect(telegramPath(null)).toBe("/passenger");
  });

  it("builds role query strings", () => {
    const roles: Array<AuthRole | null> = ["passenger", "driver", "admin", null];
    expect(roles.map((role) => asQuery(role))).toEqual([
      "?as=passenger",
      "?as=driver",
      "?as=admin",
      "",
    ]);
  });
});
