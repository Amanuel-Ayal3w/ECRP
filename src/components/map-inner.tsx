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
}

export default function MapInner({
  apiKey,
  center = ADDIS,
  zoom = 13,
  markers = [],
}: MapInnerProps) {
  const mapRef = useRef<GebetaMapRef>(null);
  const loaded = useRef(false);
  const listenerAttached = useRef(false);

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
          /* Register a 1×1 transparent placeholder so MapLibre stops logging and
             the style layer continues rendering without missing-image errors. */
          map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
        } catch {
          /* ignore duplicate / race-condition errors */
        }
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

  const onMapLoaded = useCallback(() => {
    loaded.current = true;
    renderMarkers();
  }, [renderMarkers]);

  useEffect(() => {
    if (loaded.current) renderMarkers();
  }, [renderMarkers]);

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
