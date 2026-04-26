import { authDriver } from "@/lib/auth-driver";
import { authPassenger } from "@/lib/auth-passenger";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/maps/geocode
// Body: { name: string }
// Returns: { lat: number; lng: number } | { error: string }

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
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  try {
    const url = new URL("https://mapapi.gebeta.app/api/v1/route/geocoding");
    url.searchParams.set("name", name);
    url.searchParams.set("apiKey", apiKey);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding service unavailable." }, { status: 502 });
    }

    const data = await res.json();

    if (data.msg !== "ok" || !Array.isArray(data.data) || data.data.length === 0) {
      return NextResponse.json({ error: "No results found for that location." }, { status: 404 });
    }

    const first = data.data[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon ?? first.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates in geocoding response." }, { status: 502 });
    }

    return NextResponse.json({ lat, lng, name: String(first.name ?? name) });
  } catch {
    return NextResponse.json({ error: "Geocoding request timed out." }, { status: 504 });
  }
}
