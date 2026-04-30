import { liqSearch } from "@/lib/locationiq";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  /* Try LocationIQ first */
  const liqResults = await liqSearch(q);
  if (liqResults.length > 0) {
    return NextResponse.json({ results: liqResults });
  }

  /* Fall back to Gebeta */
  const apiKey = process.env.NEXT_PUBLIC_GEBETA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL("https://mapapi.gebeta.app/api/v1/route/geocoding");
    url.searchParams.set("name", q);
    url.searchParams.set("apiKey", apiKey);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    if (data.msg !== "ok" || !Array.isArray(data.data)) {
      return NextResponse.json({ results: [] });
    }

    const results = data.data
      .map((item: Record<string, unknown>) => {
        const name = String(item.name ?? item.display_name ?? item.local_name ?? q);
        const lat = Number(item.lat);
        const lng = Number((item.lon ?? item.lng) as number);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return { name, lat, lng };
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
