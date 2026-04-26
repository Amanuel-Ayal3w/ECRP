import { describe, expect, it } from "vitest";
import { generateId } from "./generate-id";

describe("generateId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateId()).toBe("string");
    expect(generateId().length).toBeGreaterThan(0);
  });

  it("contains a hyphen separator", () => {
    expect(generateId()).toContain("-");
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 1000 }, generateId));
    expect(ids.size).toBe(1000);
  });
});
