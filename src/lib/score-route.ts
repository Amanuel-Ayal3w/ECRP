import { geocodePlace, haversineKm, type GeoPoint } from "./gebeta";

const GEBETA_MATRIX_URL = "https://mapapi.gebeta.app/api/v1/route/matrix";
const MATRIX_BATCH_SIZE = 24; // Gebeta allows up to 25 points per request (1 origin + 24 dest)
const PROXIMITY_KM = 1; // driver route start/end must be within this distance of passenger pickup/destination

/**
 * Weight that converts one service-score point into a km-equivalent
 * advantage when ranking drivers. A driver with 50 service-score points
 * gets a 50 × 0.002 = 0.1 km bonus (i.e. treated as if they were 100 m
 * closer than their actual distance).
 */
const SERVICE_SCORE_WEIGHT_KM = 0.002;

export interface DriverCandidate {
  userId: string;
  routeStart: string | null;
  routeEnd: string | null;
  routeStartLat: number | null;
  routeStartLng: number | null;
  routeEndLat: number | null;
  routeEndLng: number | null;
  serviceScore?: number | null;
}

export interface RankedDriver extends DriverCandidate {
  /** Road distance in km from passenger pickup to driver route start. */
  distanceKm: number;
  /** Road distance in km from passenger destination to driver route end. */
  endDistanceKm: number;
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
 * Rank online drivers whose routes align with the passenger's pickup and destination.
 *
 * A driver is eligible only if:
 *   - Their route start is within PROXIMITY_KM (1 km) of the passenger's pickup.
 *   - Their route end is within PROXIMITY_KM (1 km) of the passenger's destination.
 *
 * Algorithm:
 *   1. Geocode pickup and destination (skipped when pre-geocoded coords are provided).
 *   2. Call Gebeta Matrix API twice: pickup→routeStarts and destination→routeEnds.
 *      Falls back to Haversine when Matrix is unavailable.
 *   3. Filter out drivers where either distance exceeds PROXIMITY_KM.
 *   4. Sort ascending by combined distance (pickup gap + destination gap).
 *
 * Drivers without stored coordinates are excluded — their route cannot be verified.
 *
 * @returns Eligible drivers sorted closest-first. Empty array if none qualify.
 */
export async function rankDriversByDistance(
  pickup: string,
  destination: string,
  drivers: DriverCandidate[],
  preGeocodedPickup?: GeoPoint | null,
  preGeocodedDestination?: GeoPoint | null,
): Promise<RankedDriver[]> {
  if (drivers.length === 0) return [];

  const [pickupCoords, destCoords] = await Promise.all([
    preGeocodedPickup !== undefined ? Promise.resolve(preGeocodedPickup) : geocodePlace(pickup),
    preGeocodedDestination !== undefined ? Promise.resolve(preGeocodedDestination) : geocodePlace(destination),
  ]);

  // Only drivers with both start and end coords can be proximity-checked
  const withCoords: Array<{ driver: DriverCandidate; startPt: GeoPoint; endPt: GeoPoint }> = [];

  for (const driver of drivers) {
    if (
      driver.routeStartLat != null && driver.routeStartLng != null &&
      driver.routeEndLat != null && driver.routeEndLng != null
    ) {
      withCoords.push({
        driver,
        startPt: { lat: driver.routeStartLat, lng: driver.routeStartLng },
        endPt: { lat: driver.routeEndLat, lng: driver.routeEndLng },
      });
    }
  }

  if (withCoords.length === 0) return [];

  // Fetch road distances for pickup→routeStarts and destination→routeEnds in parallel
  const startPts = withCoords.map((w) => w.startPt);
  const endPts = withCoords.map((w) => w.endPt);

  const [startDistances, endDistances] = await Promise.all([
    pickupCoords ? matrixDistancesKm(pickupCoords, startPts) : Promise.resolve(startPts.map(() => Infinity)),
    destCoords ? matrixDistancesKm(destCoords, endPts) : Promise.resolve(endPts.map(() => Infinity)),
  ]);

  const eligible: RankedDriver[] = [];

  withCoords.forEach(({ driver, startPt, endPt }, i) => {
    let pickupGap = startDistances[i];
    let destGap = endDistances[i];

    // Fall back to Haversine when Matrix didn't return a distance
    if (pickupGap === Infinity && pickupCoords) pickupGap = haversineKm(pickupCoords, startPt);
    if (destGap === Infinity && destCoords) destGap = haversineKm(destCoords, endPt);

    if (pickupGap <= PROXIMITY_KM && destGap <= PROXIMITY_KM) {
      eligible.push({ ...driver, distanceKm: pickupGap, endDistanceKm: destGap });
    }
  });

  return eligible.sort((a, b) => {
    const distA = a.distanceKm + a.endDistanceKm;
    const distB = b.distanceKm + b.endDistanceKm;
    const scoreA = (a.serviceScore ?? 0) * SERVICE_SCORE_WEIGHT_KM;
    const scoreB = (b.serviceScore ?? 0) * SERVICE_SCORE_WEIGHT_KM;
    return (distA - scoreA) - (distB - scoreB);
  });
}
