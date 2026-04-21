"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Icon } from "leaflet";

type LeafletLocationMapProps = {
  latitude: number;
  longitude: number;
  title: string;
};

const LeafletMapInner = dynamic(
  () => import("@/components/LeafletLocationMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/70 px-4 text-center text-xs text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

export default function LeafletLocationMap({
  latitude,
  longitude,
  title,
}: LeafletLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [markerIcon, setMarkerIcon] = useState<Icon | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoadMap(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadMap || markerIcon) return;

    let cancelled = false;

    const loadIcon = async () => {
      const leaflet = await import("leaflet");
      if (cancelled) return;

      const nextIcon = leaflet.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41],
      });

      setMarkerIcon(nextIcon);
    };

    void loadIcon();

    return () => {
      cancelled = true;
    };
  }, [markerIcon, shouldLoadMap]);

  const position = useMemo(
    () => ({ latitude, longitude, title }),
    [latitude, longitude, title],
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      {shouldLoadMap && markerIcon ? (
        <LeafletMapInner {...position} markerIcon={markerIcon} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/70 px-4 text-center text-xs text-muted-foreground">
          El mapa se cargará cuando esta sección entre en pantalla.
        </div>
      )}
    </div>
  );
}
