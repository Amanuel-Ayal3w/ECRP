import type { GeoPoint } from "./gebeta";

const LIQ_BASE = "https://us1.locationiq.com/v1";

function getApiKey(): string | undefined {
  return process.env.LOCATIONIQ_API_KEY;
}

/**
 * Forward-geocode a place name via LocationIQ.
 * Filters results to Ethiopia (ET) for relevance.
 */
export async function liqGeocode(name: string): Promise<GeoPoint | null> {
  const key = getApiKey();
  if (!key || !name.trim()) return null;

  try {
    const url = new URL(`${LIQ_BASE}/search`);
    url.searchParams.set("key", key);
    url.searchParams.set("q", name.trim());
    url.searchParams.set("countrycodes", "et");
    url.searchParams.set("limit", "1");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Search places via LocationIQ (forward geocoding with multiple results).
 * Returns up to 5 results filtered to Ethiopia.
 */
export async function liqSearch(
  query: string,
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  const key = getApiKey();
  if (!key || !query.trim() || query.trim().length < 2) return [];

  try {
    const url = new URL(`${LIQ_BASE}/search`);
    url.searchParams.set("key", key);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("countrycodes", "et");
    url.searchParams.set("limit", "5");
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item: Record<string, unknown>) => {
        const name = String(item.display_name ?? item.name ?? query);
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return { name, lat, lng };
      })
      .filter(Boolean) as Array<{ name: string; lat: number; lng: number }>;
  } catch {
    return [];
  }
}

/**
 * Reverse-geocode coordinates via LocationIQ.
 * Returns the place name/label, or null on failure.
 */
export async function liqReverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const url = new URL(`${LIQ_BASE}/reverse`);
    url.searchParams.set("key", key);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const name = data.display_name ?? data.name ?? null;
    if (!name) return null;

    return String(name).split(",")[0].trim();
  } catch {
    return null;
  }
}
