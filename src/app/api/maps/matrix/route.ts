import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/maps/matrix
// Body:
//   origins:      Array<{ lat: number; lng: number }>
//   destinations: Array<{ lat: number; lng: number }>
//
// Returns:
//   { rows: Array<{ elements: Array<{ distanceKm: number; durationMin: number }> }> }
//
// Each rows[i].elements[j] corresponds to origin i → destination j.

interface LatLng {
  lat: number;
  lng: number;
}

function isValidLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    o.lat >= -90 && o.lat <= 90 &&
    o.lng >= -180 && o.lng <= 180
  );
}

export async function POST(request: Request) {
  const h = await headers();
  const [passengerSession, driverSession] = await Promise.all([
    authPassenger.api.getSession({ headers: h }),
    authDriver.api.getSession({ headers: h }),
  ]);

  if (!passengerSession && !driverSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GEBETA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gebeta API key not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const origins: unknown[] = Array.isArray(body?.origins) ? body.origins : [];
  const destinations: unknown[] = Array.isArray(body?.destinations) ? body.destinations : [];

  if (origins.length === 0 || destinations.length === 0) {
    return NextResponse.json({ error: "origins and destinations arrays are required and must be non-empty." }, { status: 400 });
  }

  if (origins.length > 25 || destinations.length > 25) {
    return NextResponse.json({ error: "Maximum 25 origins and 25 destinations per request." }, { status: 400 });
  }

  if (!origins.every(isValidLatLng) || !destinations.every(isValidLatLng)) {
    return NextResponse.json({ error: "Each point must have numeric lat and lng within valid ranges." }, { status: 400 });
  }

  const validOrigins = origins as LatLng[];
  const validDestinations = destinations as LatLng[];

  try {
    // Gebeta Matrix API — one origin against multiple destinations per call.
    // We fan-out one request per origin and collect results.
    const rows = await Promise.all(
      validOrigins.map(async (origin) => {
        const url = new URL("https://mapapi.gebeta.app/api/v1/route/matrix");
        url.searchParams.set("apiKey", apiKey);
        url.searchParams.set("la1", String(origin.lat));
        url.searchParams.set("lo1", String(origin.lng));

        validDestinations.forEach((dest, i) => {
          url.searchParams.set(`la${i + 2}`, String(dest.lat));
          url.searchParams.set(`lo${i + 2}`, String(dest.lng));
        });

        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;

        const data = await res.json();

        // Gebeta matrix returns data.data as an array of { distance, duration } objects.
        const raw: Array<{ distance?: number; duration?: number }> = Array.isArray(data?.data)
          ? data.data
          : [];

        const elements = validDestinations.map((_, j) => {
          const entry = raw[j];
          return {
            distanceKm: typeof entry?.distance === "number" ? Number((entry.distance / 1000).toFixed(2)) : null,
            durationMin: typeof entry?.duration === "number" ? Number((entry.duration / 60).toFixed(1)) : null,
          };
        });

        return { elements };
      }),
    );

    if (rows.some((r) => r === null)) {
      return NextResponse.json({ error: "Matrix service unavailable." }, { status: 502 });
    }

    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Matrix request timed out." }, { status: 504 });
  }
}
