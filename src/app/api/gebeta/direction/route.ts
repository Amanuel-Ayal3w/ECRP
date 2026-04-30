import { NextResponse } from "next/server";

/**
 * GET /api/gebeta/direction?la1=&lo1=&la2=&lo2=
 *
 * Proxies the Gebeta Direction API and returns a flat array of [lng, lat]
 * coordinate pairs representing the route geometry — ready for MapLibre GL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const la1 = searchParams.get("la1");
  const lo1 = searchParams.get("lo1");
  const la2 = searchParams.get("la2");
  const lo2 = searchParams.get("lo2");

  if (!la1 || !lo1 || !la2 || !lo2) {
    return NextResponse.json({ error: "la1, lo1, la2, lo2 are required" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GEBETA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Map API key not configured" }, { status: 503 });
  }

  try {
    const url = new URL("https://mapapi.gebeta.app/api/v1/route/direction");
    url.searchParams.set("la1", la1);
    url.searchParams.set("lo1", lo1);
    url.searchParams.set("la2", la2);
    url.searchParams.set("lo2", lo2);
    url.searchParams.set("apiKey", apiKey);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({ points: [] });
    }

    const data = await res.json();

    // Extract [lng, lat] pairs from whatever geometry format Gebeta returns
    const points = extractPoints(data);
    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ points: [] });
  }
}

type LngLat = [number, number];

function extractPoints(data: unknown): LngLat[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;

  // Top-level geometry array: [{lat, lon/lng}, ...] or [[lng, lat], ...]
  if (Array.isArray(d.geometry)) {
    return toPoints(d.geometry);
  }

  // Steps array with per-step geometry
  const steps = Array.isArray(d.direction) ? d.direction : Array.isArray(d.steps) ? d.steps : null;
  if (steps) {
    const all: LngLat[] = [];
    for (const step of steps as unknown[]) {
      if (step && typeof step === "object") {
        const s = step as Record<string, unknown>;
        if (Array.isArray(s.geometry)) all.push(...toPoints(s.geometry));
      }
    }
    if (all.length > 0) return all;
  }

  // Nested data.geometry
  if (d.data && typeof d.data === "object" && Array.isArray((d.data as Record<string, unknown>).geometry)) {
    return toPoints((d.data as Record<string, unknown>).geometry as unknown[]);
  }

  return [];
}

function toPoints(arr: unknown[]): LngLat[] {
  if (arr.length === 0) return [];

  // Array of [lng, lat] or [lat, lng] number pairs — Gebeta uses [lng, lat]
  if (Array.isArray(arr[0]) && arr[0].length >= 2) {
    return (arr as number[][])
      .map((p) => [p[0], p[1]] as LngLat)
      .filter(([lng, lat]) => isValidLng(lng) && isValidLat(lat));
  }

  // Array of {lat, lon/lng} objects
  if (typeof arr[0] === "object" && arr[0] !== null) {
    return (arr as Record<string, unknown>[])
      .map((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lon ?? p.lng);
        return [lng, lat] as LngLat;
      })
      .filter(([lng, lat]) => isValidLng(lng) && isValidLat(lat));
  }

  return [];
}

function isValidLat(v: number) { return !Number.isNaN(v) && v >= -90 && v <= 90; }
function isValidLng(v: number) { return !Number.isNaN(v) && v >= -180 && v <= 180; }
