const GEBETA_BASE = "https://mapapi.gebeta.app/api/v1/route";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Forward-geocode a place name to coordinates using the Gebeta API.
 * Returns the first result, or null on any failure/timeout.
 */
export async function geocodePlace(name: string): Promise<GeoPoint | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEBETA_API_KEY;
  if (!apiKey || !name.trim()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = new URL(`${GEBETA_BASE}/geocoding`);
    url.searchParams.set("name", name.trim());
    url.searchParams.set("apiKey", apiKey);

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.msg !== "ok" || !Array.isArray(data.data) || data.data.length === 0) return null;

    const first = data.data[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon ?? first.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function searchPlaces(
  query: string,
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  if (!query.trim() || query.trim().length < 2) return [];
  try {
    const url = new URL("/api/gebeta/search", window.location.origin);
    url.searchParams.set("q", query.trim());
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL("/api/gebeta/revgeocode", window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.name === "string" ? data.name : null;
  } catch {
    return null;
  }
}

/**
 * Haversine great-circle distance between two points, in kilometres.
 * Accurate to ~0.5% for city-scale distances.
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.asin(Math.sqrt(h));
}
