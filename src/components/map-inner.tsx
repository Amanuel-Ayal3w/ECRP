"use client";

import { GebetaMap } from "@gebeta/tiles";
import { Marker } from "maplibre-gl";
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

function createLocationDotEl(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;width:20px;height:20px";

  const pulse = document.createElement("div");
  pulse.style.cssText = `
    position:absolute;inset:0;border-radius:50%;
    background:rgba(59,130,246,0.35);
    animation:loc-pulse 2s ease-out infinite;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);
    width:10px;height:10px;border-radius:50%;
    background:#3b82f6;
    border:2px solid #fff;
    box-shadow:0 0 0 1px rgba(59,130,246,0.6);
  `;

  if (!document.getElementById("loc-pulse-style")) {
    const style = document.createElement("style");
    style.id = "loc-pulse-style";
    style.textContent = `
      @keyframes loc-pulse {
        0%   { transform:scale(1);   opacity:0.8; }
        70%  { transform:scale(2.4); opacity:0;   }
        100% { transform:scale(2.4); opacity:0;   }
      }
    `;
    document.head.appendChild(style);
  }

  wrap.appendChild(pulse);
  wrap.appendChild(dot);
  return wrap;
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
  const locationMarkerRef = useRef<Marker | null>(null);
  const centeredOnUser = useRef(false);

  /* `styleimagemissing` fires DURING style loading — before onMapLoaded — so we
     poll from mount to attach the handler as early as the map instance exists. */
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>;

    const attach = () => {
      const map = mapRef.current?.getMapInstance();
      if (!map) {
        tid = setTimeout(attach, 30);
        return;
      }
      if (listenerAttached.current) return;
      listenerAttached.current = true;

      map.on("styleimagemissing", (e: { id: string }) => {
        if (map.hasImage(e.id)) return;
        try {
          map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
        } catch {
          /* ignore duplicate / race-condition errors */
        }
      });

      /* Silently drop tile 404/500 errors (tiles outside Gebeta's coverage area). */
      map.on("error", (e: { error?: { status?: number } }) => {
        const status = e.error?.status;
        if (status === 404 || status === 500) return;
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
      if (m.onClick) {
        marker.getElement().addEventListener("click", m.onClick);
      }
    });
  }, [markers]);

  const renderLocationDot = useCallback(() => {
    if (!loaded.current) return;
    const map = mapRef.current?.getMapInstance();
    if (!map) return;

    if (!userLocation) {
      locationMarkerRef.current?.remove();
      locationMarkerRef.current = null;
      return;
    }

    const [lng, lat] = userLocation;

    if (locationMarkerRef.current) {
      locationMarkerRef.current.setLngLat([lng, lat]);
    } else {
      locationMarkerRef.current = new Marker({ element: createLocationDotEl(), anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
    }

    /* Fly to user's position once on first fix, then stay put. */
    if (!centeredOnUser.current) {
      centeredOnUser.current = true;
      map.flyTo({ center: [lng, lat], zoom: 18, speed: 1.4, essential: true });
    }
  }, [userLocation]);

  const onMapLoaded = useCallback(() => {
    loaded.current = true;
    renderMarkers();
    renderLocationDot();
  }, [renderMarkers, renderLocationDot]);

  useEffect(() => {
    if (loaded.current) renderMarkers();
  }, [renderMarkers]);

  useEffect(() => {
    if (loaded.current) renderLocationDot();
  }, [renderLocationDot]);

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
