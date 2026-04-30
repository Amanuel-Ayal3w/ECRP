import { describe, expect, it } from "vitest";
import { rankDriversByDistance, type DriverCandidate } from "./score-route";

// Two reference points ~13 km apart
const BOLE: { lat: number; lng: number } = { lat: 9.0105, lng: 38.7636 };
const PIAZZA: { lat: number; lng: number } = { lat: 9.0368, lng: 38.7531 };

function makeCandidate(
  id: string,
  startLat: number | null,
  startLng: number | null,
  endLat: number | null = null,
  endLng: number | null = null,
): DriverCandidate {
  return {
    userId: id,
    routeStart: startLat != null ? "Start" : null,
    routeEnd: endLat != null ? "End" : null,
    routeStartLat: startLat,
    routeStartLng: startLng,
    routeEndLat: endLat,
    routeEndLng: endLng,
  };
}

// In the test environment NEXT_PUBLIC_GEBETA_API_KEY is unset, so the Matrix
// API is skipped and Haversine is used as the fallback for all distance values.
describe("rankDriversByDistance", () => {
  it("returns empty array when no drivers given", async () => {
    const result = await rankDriversByDistance("Bole", "Piazza", [], BOLE, PIAZZA);
    expect(result).toEqual([]);
  });

  it("returns only drivers within 1 km of both pickup and destination", async () => {
    // close to BOLE pickup and PIAZZA destination — should match
    const good = makeCandidate("good", 9.012, 38.764, 9.037, 38.753);
    // far from pickup
    const badStart = makeCandidate("badStart", 9.100, 38.850, 9.037, 38.753);
    // far from destination
    const badEnd = makeCandidate("badEnd", 9.012, 38.764, 9.100, 38.850);

    const ranked = await rankDriversByDistance("Bole", "Piazza", [good, badStart, badEnd], BOLE, PIAZZA);

    expect(ranked.map((d) => d.userId)).toEqual(["good"]);
  });

  it("sorts eligible drivers by combined distance (closest first)", async () => {
    // very close to both ends
    const near = makeCandidate("near", 9.011, 38.764, 9.037, 38.753);
    // slightly farther but still within 1 km
    const mid = makeCandidate("mid", 9.013, 38.765, 9.038, 38.754);

    const ranked = await rankDriversByDistance("Bole", "Piazza", [mid, near], BOLE, PIAZZA);

    expect(ranked[0].userId).toBe("near");
    expect(ranked[1].userId).toBe("mid");
  });

  it("excludes drivers missing start or end coordinates", async () => {
    const noStart = makeCandidate("noStart", null, null, 9.037, 38.753);
    const noEnd = makeCandidate("noEnd", 9.012, 38.764, null, null);
    const both = makeCandidate("both", 9.012, 38.764, 9.037, 38.753);

    const ranked = await rankDriversByDistance("Bole", "Piazza", [noStart, noEnd, both], BOLE, PIAZZA);

    expect(ranked.map((d) => d.userId)).toEqual(["both"]);
  });

  it("attaches numeric distanceKm and endDistanceKm to results", async () => {
    const driver = makeCandidate("d1", 9.012, 38.764, 9.037, 38.753);
    const [result] = await rankDriversByDistance("Bole", "Piazza", [driver], BOLE, PIAZZA);
    expect(typeof result.distanceKm).toBe("number");
    expect(typeof result.endDistanceKm).toBe("number");
    expect(result.distanceKm).toBeGreaterThanOrEqual(0);
    expect(result.endDistanceKm).toBeGreaterThanOrEqual(0);
  });

  it("preserves all original DriverCandidate fields", async () => {
    const driver = makeCandidate("d1", 9.012, 38.764, 9.037, 38.753);
    const [result] = await rankDriversByDistance("Bole", "Piazza", [driver], BOLE, PIAZZA);
    expect(result.userId).toBe("d1");
    expect(result.routeStart).toBe("Start");
    expect(result.routeStartLat).toBe(9.012);
    expect(result.routeEndLat).toBe(9.037);
  });
});
