import { geocodePlace, haversineKm, type GeoPoint } from "./gebeta";

const GEBETA_MATRIX_URL = "https://mapapi.gebeta.app/api/v1/route/matrix";
const MATRIX_BATCH_SIZE = 24; // Gebeta allows up to 25 points per request (1 origin + 24 dest)

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
  /** Road distance in km from passenger pickup to driver route start (Matrix API), or straight-line (Haversine fallback). */
  distanceKm: number;
}

/**
 * Fetch road distances from a single origin to multiple destinations via Gebeta Matrix API.
 * Returns an array of distances in km, parallel to `destinations`.
 * Entries are Infinity when the API cannot return a distance for that pair.
 */
async function matrixDistancesKm(
  origin: GeoPoint,
  destinations: GeoPoint[],
): Promise<number[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEBETA_API_KEY;
  if (!apiKey || destinations.length === 0) return destinations.map(() => Infinity);

  const results = new Array<number>(destinations.length).fill(Infinity);

  for (let start = 0; start < destinations.length; start += MATRIX_BATCH_SIZE) {
    const batch = destinations.slice(start, start + MATRIX_BATCH_SIZE);

    const url = new URL(GEBETA_MATRIX_URL);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("la1", String(origin.lat));
    url.searchParams.set("lo1", String(origin.lng));
    batch.forEach((dest, j) => {
      url.searchParams.set(`la${j + 2}`, String(dest.lat));
      url.searchParams.set(`lo${j + 2}`, String(dest.lng));
    });

    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const raw: Array<{ distance?: number }> = Array.isArray(data?.data) ? data.data : [];
      batch.forEach((_, j) => {
        const entry = raw[j];
        if (typeof entry?.distance === "number" && entry.distance >= 0) {
          results[start + j] = entry.distance / 1000;
        }
      });
    } catch {
      // leave batch entries as Infinity; outer code falls back to Haversine
    }
  }

  return results;
}

/**
 * Rank online drivers by road distance to the passenger's pickup location.
 *
 * Algorithm:
 *   1. Geocode the passenger's pickup text → coordinates (one API call, skipped if preGeocodedPickup provided).
 *   2. Call Gebeta Matrix API with pickup as origin and each driver's stored routeStartLat/Lng as destinations.
 *      Falls back to Haversine straight-line distance per driver when Matrix is unavailable.
 *   3. Sort ascending — closest driver first.
 *
 * Drivers without stored coordinates receive distanceKm = Infinity and sort to the end.
 * They are still returned as candidates so a ride can still be matched.
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

  // Separate drivers that have stored coords from those that don't
  const withCoords: Array<{ driver: DriverCandidate; dest: GeoPoint; originalIndex: number }> = [];
  const withoutCoords: Array<{ driver: DriverCandidate; originalIndex: number }> = [];

  drivers.forEach((driver, i) => {
    if (driver.routeStartLat != null && driver.routeStartLng != null) {
      withCoords.push({
        driver,
        dest: { lat: driver.routeStartLat, lng: driver.routeStartLng },
        originalIndex: i,
      });
    } else {
      withoutCoords.push({ driver, originalIndex: i });
    }
  });

  const ranked: RankedDriver[] = new Array(drivers.length);

  // Drivers without coords always get Infinity
  withoutCoords.forEach(({ driver, originalIndex }) => {
    ranked[originalIndex] = { ...driver, distanceKm: Infinity };
  });

  if (withCoords.length > 0) {
    let matrixKm: number[] = [];

    if (pickupCoords) {
      matrixKm = await matrixDistancesKm(
        pickupCoords,
        withCoords.map((w) => w.dest),
      );
    }

    withCoords.forEach(({ driver, dest, originalIndex }, j) => {
      let distanceKm: number;

      if (matrixKm[j] !== undefined && matrixKm[j] !== Infinity) {
        distanceKm = matrixKm[j];
      } else if (pickupCoords) {
        // Matrix unavailable for this driver — fall back to straight-line
        distanceKm = haversineKm(dest, pickupCoords);
      } else {
        distanceKm = Infinity;
      }

      ranked[originalIndex] = { ...driver, distanceKm };
    });
  }

  return ranked.sort((a, b) => a.distanceKm - b.distanceKm);
}
