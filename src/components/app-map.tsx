"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";
import type { MarkerDef } from "./map-inner";

/* ── Lazy load the actual map (MapLibre needs browser APIs) ── */
const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-2">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.5 0 0 / 6%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0 0 / 6%) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <Navigation className="w-6 h-6 text-muted-foreground animate-pulse relative z-10" />
      <p className="text-xs text-muted-foreground relative z-10">Loading map…</p>
    </div>
  );
}

function NoKeyFallback() {
  return (
    <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-2">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.5 0 0 / 6%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0 0 / 6%) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <Navigation className="w-6 h-6 text-muted-foreground relative z-10" />
      <p className="text-xs text-muted-foreground relative z-10">
        Add <code className="font-mono bg-muted px-1 rounded">NEXT_PUBLIC_GEBETA_API_KEY</code> to{" "}
        <code className="font-mono bg-muted px-1 rounded">.env.local</code>
      </p>
    </div>
  );
}

/* ── Public API ─────────────────────────────────────────── */

export interface AppMapProps {
  /** Map container height — e.g. "h-52" or "h-64" */
  heightClass?: string;
  center?: [number, number];
  zoom?: number;
  markers?: MarkerDef[];
  /** Renders a pulsing blue dot at the user's current GPS position */
  userLocation?: [number, number] | null;
  /** Ordered [lng, lat] pairs to draw as a route line */
  routePath?: [number, number][] | null;
  className?: string;
}

export default function AppMap({
  heightClass = "h-52",
  center,
  zoom,
  markers,
  userLocation,
  routePath,
  className = "",
}: AppMapProps) {

  const apiKey = (process.env.NEXT_PUBLIC_GEBETA_API_KEY ?? "").trim();

  if (!apiKey) {
    return (
      <div className={`relative w-full ${heightClass} overflow-hidden ${className}`}>
        <NoKeyFallback />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${heightClass} overflow-hidden ${className}`}>
      <MapInner
        apiKey={apiKey}
        center={center}
        zoom={zoom}
        markers={markers}
        userLocation={userLocation}
        routePath={routePath}
      />
    </div>
  );
}

export type { MarkerDef };
