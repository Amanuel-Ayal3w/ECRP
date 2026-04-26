import { geocodePlace, haversineKm, type GeoPoint } from "./gebeta";

export interface DriverCandidate {
  userId: string;
  routeStart: string | null;
  routeEnd: string | null;
  routeStartLat: number | null;
  routeStartLng: number | null;
  routeEndLat: number | null;
  routeEndLng: number | null;
}

export interface RankedDriver extends DriverCandidate {
  /** Straight-line distance in km from driver routeStart to passenger pickup. */
  distanceKm: number;
}

/**
 * Rank online drivers by proximity to the passenger's pickup location.
 *
 * Algorithm:
 *   1. Geocode the passenger's pickup text → coordinates (one API call).
 *   2. For each driver, use their stored routeStartLat/Lng (set when they
 *      declared their route). No geocoding per driver at match time.
 *   3. Compute Haversine distance from driver start → passenger pickup.
 *   4. Sort ascending — closest driver first.
 *
 * Drivers without stored coordinates (never set a route, or geocoding failed
 * when they set it) receive distanceKm = Infinity and sort to the end.
 * They are still returned as candidates so a ride can still be matched even
 * when no driver has coordinates.
 *
 * @returns Drivers sorted closest-first. Empty array if no drivers supplied.
 */
export async function rankDriversByDistance(
  pickup: string,
  drivers: DriverCandidate[],
  preGeocodedPickup?: GeoPoint | null,
): Promise<RankedDriver[]> {
  if (drivers.length === 0) return [];

  const pickupCoords: GeoPoint | null = preGeocodedPickup ?? await geocodePlace(pickup);

  const ranked = drivers.map((driver): RankedDriver => {
    // If we couldn't geocode the pickup OR the driver has no stored coords,
    // push them to the back but keep them as fallback candidates.
    if (
      !pickupCoords ||
      driver.routeStartLat == null ||
      driver.routeStartLng == null
    ) {
      return { ...driver, distanceKm: Infinity };
    }

    const distanceKm = haversineKm(
      { lat: driver.routeStartLat, lng: driver.routeStartLng },
      pickupCoords,
    );

    return { ...driver, distanceKm };
  });

  return ranked.sort((a, b) => a.distanceKm - b.distanceKm);
}
