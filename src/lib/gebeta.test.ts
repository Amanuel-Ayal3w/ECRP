import { describe, expect, it } from "vitest";
import { haversineKm } from "./gebeta";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 9.025, lng: 38.747 }, { lat: 9.025, lng: 38.747 })).toBe(0);
  });

  it("returns 0 at the origin", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
  });

  it("is symmetric — distance A→B equals B→A", () => {
    const a = { lat: 9.02, lng: 38.74 };
    const b = { lat: 9.10, lng: 38.80 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("computes roughly correct city-scale distance (Bole → Piassa, ~5 km)", () => {
    // Bole: 9.0105, 38.7636 — Piassa: 9.0307, 38.7467
    const dist = haversineKm({ lat: 9.0105, lng: 38.7636 }, { lat: 9.0307, lng: 38.7467 });
    expect(dist).toBeGreaterThan(2);
    expect(dist).toBeLessThan(8);
  });

  it("computes roughly correct intercontinental distance (Addis → London ~5900 km)", () => {
    const dist = haversineKm({ lat: 9.025, lng: 38.747 }, { lat: 51.505, lng: -0.09 });
    expect(dist).toBeGreaterThan(5500);
    expect(dist).toBeLessThan(6500);
  });

  it("returns a positive number for distinct points", () => {
    const dist = haversineKm({ lat: 9.0, lng: 38.0 }, { lat: 9.1, lng: 38.1 });
    expect(dist).toBeGreaterThan(0);
  });
});
