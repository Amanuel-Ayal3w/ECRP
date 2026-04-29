import { describe, expect, it } from "vitest";
import { rankDriversByDistance, type DriverCandidate } from "./score-route";

const BOLE: { lat: number; lng: number } = { lat: 9.0105, lng: 38.7636 };

function makeCandidate(id: string, lat: number | null, lng: number | null): DriverCandidate {
  return {
    userId: id,
    routeStart: lat != null ? "Start" : null,
    routeEnd: lng != null ? "End" : null,
    routeStartLat: lat,
    routeStartLng: lng,
    routeEndLat: null,
    routeEndLng: null,
  };
}

// In the test environment NEXT_PUBLIC_GEBETA_API_KEY is unset, so the Matrix
// API is skipped and Haversine is used as the fallback for all distance values.
describe("rankDriversByDistance", () => {
  it("returns empty array when no drivers given", async () => {
    const result = await rankDriversByDistance("Bole", [], BOLE);
    expect(result).toEqual([]);
  });

  it("sorts drivers closest-first (Haversine fallback)", async () => {
    const near = makeCandidate("near", 9.012, 38.764);   // ~0.2 km from BOLE
    const far  = makeCandidate("far",  9.100, 38.850);   // ~13 km from BOLE
    const mid  = makeCandidate("mid",  9.040, 38.780);   // ~4 km from BOLE

    const ranked = await rankDriversByDistance("Bole", [far, mid, near], BOLE);

    expect(ranked.map((d) => d.userId)).toEqual(["near", "mid", "far"]);
  });

  it("pushes drivers without coordinates to the end with Infinity distance", async () => {
    const withCoords    = makeCandidate("withCoords",    9.012, 38.764);
    const withoutCoords = makeCandidate("withoutCoords", null,  null);

    const ranked = await rankDriversByDistance("Bole", [withoutCoords, withCoords], BOLE);

    expect(ranked[0].userId).toBe("withCoords");
    expect(ranked[1].userId).toBe("withoutCoords");
    expect(ranked[1].distanceKm).toBe(Infinity);
  });

  it("assigns Infinity when no pickup coords and driver has no coords", async () => {
    // passing null as preGeocodedPickup forces all drivers to Infinity
    const driver = makeCandidate("d1", null, null);
    const ranked = await rankDriversByDistance("Nowhere", [driver], null);
    expect(ranked[0].distanceKm).toBe(Infinity);
  });

  it("attaches a numeric distanceKm to each result", async () => {
    const driver = makeCandidate("d1", 9.012, 38.764);
    const [result] = await rankDriversByDistance("Bole", [driver], BOLE);
    expect(typeof result.distanceKm).toBe("number");
    expect(result.distanceKm).toBeGreaterThanOrEqual(0);
    expect(result.distanceKm).toBeLessThan(5);
  });

  it("preserves all original DriverCandidate fields", async () => {
    const driver = makeCandidate("d1", 9.012, 38.764);
    const [result] = await rankDriversByDistance("Bole", [driver], BOLE);
    expect(result.userId).toBe("d1");
    expect(result.routeStart).toBe("Start");
    expect(result.routeStartLat).toBe(9.012);
  });
});
