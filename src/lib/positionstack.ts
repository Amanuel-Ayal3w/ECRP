import type { GeoPoint } from "./gebeta";

const PS_BASE = "https://api.positionstack.com/v1";

function getApiKey(): string | undefined {
  return process.env.POSITIONSTACK_API_KEY;
}

/**
 * Forward-geocode a place name via PositionStack.
 * Filters results to Ethiopia (ET) for relevance.
 */
export async function psGeocode(name: string): Promise<GeoPoint | null> {
  const key = getApiKey();
  if (!key || !name.trim()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = new URL(`${PS_BASE}/forward`);
    url.searchParams.set("access_key", key);
    url.searchParams.set("query", name.trim());
    url.searchParams.set("country", "ET");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) return null;

    const results = data.data;
    if (!Array.isArray(results) || results.length === 0) return null;

    const first = results[0];
    const lat = Number(first.latitude);
    const lng = Number(first.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Search places via PositionStack (forward geocoding with multiple results).
 * Returns up to 5 results filtered to Ethiopia.
 */
export async function psSearch(
  query: string,
): Promise<Array<{ name: string; lat: number; lng: number }>> {
  const key = getApiKey();
  if (!key || !query.trim() || query.trim().length < 2) return [];

  try {
    const url = new URL(`${PS_BASE}/forward`);
    url.searchParams.set("access_key", key);
    url.searchParams.set("query", query.trim());
    url.searchParams.set("country", "ET");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (data.error || !Array.isArray(data.data)) return [];

    return data.data
      .map((item: Record<string, unknown>) => {
        const label = String(item.label ?? item.name ?? query);
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return { name: label, lat, lng };
      })
      .filter(Boolean) as Array<{ name: string; lat: number; lng: number }>;
  } catch {
    return [];
  }
}

/**
 * Reverse-geocode coordinates via PositionStack.
 * Returns the place name/label, or null on failure.
 */
export async function psReverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const url = new URL(`${PS_BASE}/reverse`);
    url.searchParams.set("access_key", key);
    url.searchParams.set("query", `${lat},${lng}`);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.error || !Array.isArray(data.data) || data.data.length === 0) return null;

    const first = data.data[0];
    const name = first.label ?? first.name ?? null;
    if (!name) return null;

    return String(name).split(",")[0].trim();
  } catch {
    return null;
  }
}
