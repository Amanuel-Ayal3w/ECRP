import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ name: null });
  }

  const apiKey = process.env.NEXT_PUBLIC_GEBETA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gebeta API key not configured" }, { status: 500 });
  }

  try {
    const url = new URL("https://mapapi.gebeta.app/api/v1/route/revgeocoding");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("apiKey", apiKey);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ name: null });
    }

    const data = await res.json();
    const item = Array.isArray(data.data) ? data.data[0] : (data.data ?? data);
    if (!item) return NextResponse.json({ name: null });

    const name = item.name ?? item.display_name ?? item.local_name ?? null;
    if (!name) return NextResponse.json({ name: null });

    return NextResponse.json({ name: String(name).split(",")[0].trim() });
  } catch {
    return NextResponse.json({ name: null });
  }
}
