"use client";

import { GebetaMap } from "@gebeta/tiles";
import { useRef, useEffect, useCallback, type ComponentRef } from "react";

type GebetaMapRef = ComponentRef<typeof GebetaMap>;

const ADDIS: [number, number] = [38.7685, 9.0161];

export interface MarkerDef {
  id: string;
  lngLat: [number, number];
  color: string;
  onClick?: () => void;
}

interface MapInnerProps {
  apiKey: string;
  center?: [number, number];
  zoom?: number;
  markers?: MarkerDef[];
  userLocation?: [number, number] | null;
}

function ensurePulseStyle() {
  if (document.getElementById("loc-pulse-style")) return;
  const s = document.createElement("style");
  s.id = "loc-pulse-style";
  s.textContent = `@keyframes loc-pulse{0%{transform:scale(1);opacity:.6}70%,100%{transform:scale(2.6);opacity:0}}`;
  document.head.appendChild(s);
}

export default function MapInner({
  apiKey,
  center = ADDIS,
  zoom = 13,
  markers = [],
  userLocation,
}: MapInnerProps) {
  const mapRef = useRef<GebetaMapRef>(null);
  const loaded = useRef(false);
  const listenerAttached = useRef(false);

  /* DOM overlay for current-location dot — no maplibre-gl Marker import needed */
  const dotRef = useRef<HTMLDivElement | null>(null);
  const userLocRef = useRef<[number, number] | null>(null);
  const centeredOnUser = useRef(false);
  const mapInstanceRef = useRef<ReturnType<GebetaMapRef["getMapInstance"]>>(null);

  /* Keep a stable ref to the latest userLocation so move-listener can read it */
  useEffect(() => {
    userLocRef.current = userLocation ?? null;
  }, [userLocation]);

  /* Project the stored lngLat to canvas pixels and move the dot div */
  const repositionDot = useCallback(() => {
    const map = mapRef.current?.getMapInstance();
    const dot = dotRef.current;
    const loc = userLocRef.current;
    if (!map || !dot || !loc) return;
    const { x, y } = map.project(loc as [number, number]);
    dot.style.transform = `translate(${x - 10}px,${y - 10}px)`;
  }, []);

  /* Create/remove the dot overlay and wire up map move resyncing */
  const renderLocationDot = useCallback(() => {
    if (!loaded.current) return;
    const map = mapRef.current?.getMapInstance();
    if (!map) return;

    /* Detect map recreation — old dot is orphaned, discard refs */
    if (mapInstanceRef.current && mapInstanceRef.current !== map) {
      dotRef.current = null;
      listenerAttached.current = false;
      centeredOnUser.current = false;
    }
    mapInstanceRef.current = map;

    if (!userLocation) {
      if (dotRef.current) {
        dotRef.current.style.display = "none";
      }
      return;
    }

    userLocRef.current = userLocation;

    if (!dotRef.current || !dotRef.current.isConnected) {
      ensurePulseStyle();

      /* Outer wrapper — absolutely positioned at top-left, moved via transform */
      const wrap = document.createElement("div");
      wrap.style.cssText =
        "position:absolute;top:0;left:0;width:20px;height:20px;pointer-events:none;z-index:3";

      const pulse = document.createElement("div");
      pulse.style.cssText =
        "position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.4);animation:loc-pulse 2s ease-out infinite";

      const dot = document.createElement("div");
      dot.style.cssText =
        "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35)";

      wrap.appendChild(pulse);
      wrap.appendChild(dot);

      /* Append to the canvas container so it moves with map panning */
      map.getCanvasContainer().appendChild(wrap);
      dotRef.current = wrap;

      /* Keep dot in sync on every pan/zoom */
      map.on("move", repositionDot);
    }

    dotRef.current.style.display = "";
    repositionDot();

    /* Fly to user once on first GPS fix — zoom 15 for reliable tile coverage */
    if (!centeredOnUser.current) {
      centeredOnUser.current = true;
      map.flyTo({ center: userLocation, zoom: 15, speed: 1.4, essential: true });
    }
  }, [userLocation, repositionDot]);

  /* styleimagemissing + tile-error suppressor — poll until map instance exists */
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;

    const attach = () => {
      const map = mapRef.current?.getMapInstance();
      if (!map) { tid = setTimeout(attach, 30); return; }
      if (listenerAttached.current) return;
      listenerAttached.current = true;

      map.on("styleimagemissing", (e: { id: string }) => {
        if (map.hasImage(e.id)) return;
        try { map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) }); }
        catch { /* ignore race */ }
      });

      map.on("error", (e: { error?: { status?: number } }) => {
        const s = e.error?.status;
        if (s === 404 || s === 500) return;
        console.error(e);
      });
    };

    tid = setTimeout(attach, 30);
    return () => clearTimeout(tid);
  }, []);

  const renderMarkers = useCallback(() => {
    const ref = mapRef.current;
    if (!ref || !loaded.current) return;
    const map = ref.getMapInstance();
    if (!map) return;

    ref.clearMarkers();
    markers.forEach((m) => {
      const marker = ref.addMarker({ color: m.color });
      marker.setLngLat(m.lngLat).addTo(map);
      if (m.onClick) marker.getElement().addEventListener("click", m.onClick);
    });
  }, [markers]);

  const onMapLoaded = useCallback(() => {
    loaded.current = true;
    renderMarkers();
    renderLocationDot();
  }, [renderMarkers, renderLocationDot]);

  useEffect(() => { if (loaded.current) renderMarkers(); }, [renderMarkers]);
  useEffect(() => { if (loaded.current) renderLocationDot(); }, [renderLocationDot]);

  return (
    <GebetaMap
      ref={mapRef}
      apiKey={apiKey}
      center={center}
      zoom={zoom}
      onMapLoaded={onMapLoaded}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
