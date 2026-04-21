"use client";

import LeafletLocationMap from "@/components/LeafletLocationMap";

type MapCardProps = {
  title: string;
  description: string;
  mapsUrl: string;
  latitude: number;
  longitude: number;
};

export default function MapCard({
  title,
  description,
  mapsUrl,
  latitude,
  longitude,
}: MapCardProps) {
  return (
    <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {title}
        </p>
        <h3 className="font-display text-2xl font-semibold">
          Frente al mar y fácil de ubicar
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
        >
          Ver en Google Maps
        </a>
      </div>
      <div className="relative h-56 overflow-hidden rounded-2xl border border-border bg-muted sm:h-64">
        <LeafletLocationMap
          latitude={latitude}
          longitude={longitude}
          title="Cabañas Marinas · Punta Burica"
        />
        <div className="absolute bottom-4 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
          Mapa
        </div>
      </div>
    </div>
  );
}
