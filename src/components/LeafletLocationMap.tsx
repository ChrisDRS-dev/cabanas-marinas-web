"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Icon, DivIcon } from "leaflet";

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
  const [markerIcon, setMarkerIcon] = useState<Icon | DivIcon | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    checkTheme();
    window.addEventListener("cm:theme-change", checkTheme);
    return () => {
      window.removeEventListener("cm:theme-change", checkTheme);
    };
  }, []);

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

      const nextIcon = leaflet.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-[#0085a1]/30 opacity-75 dark:bg-[#34b6c8]/30"></span>
            <div class="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#0085a1] shadow-lg border-2 border-white dark:bg-[#34b6c8] dark:border-[#0f1719]">
              <svg class="h-3 w-3 text-white dark:text-[#071215]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
        `,
        className: "custom-leaflet-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
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
        <LeafletMapInner {...position} markerIcon={markerIcon} theme={theme} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/70 px-4 text-center text-xs text-muted-foreground">
          El mapa se cargará cuando esta sección entre en pantalla.
        </div>
      )}
    </div>
  );
}
