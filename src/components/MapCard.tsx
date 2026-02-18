"use client";

import { useState } from "react";

type MapCardProps = {
  title: string;
  description: string;
  mapsUrl: string;
};

export default function MapCard({
  title,
  description,
  mapsUrl,
}: MapCardProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

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
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
        >
          Ver en Google Maps
        </a>
      </div>
      <div className="relative h-56 overflow-hidden rounded-2xl border border-border bg-muted sm:h-64">
        {mapLoaded ? (
          <iframe
            title="Mapa de ubicacion"
            src={mapsUrl}
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center">
            <button
              type="button"
              onClick={() => setMapLoaded(true)}
              className="rounded-full border border-border bg-background/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:bg-secondary"
            >
              Cargar mapa
            </button>
          </div>
        )}
        <div className="absolute bottom-4 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
          Mapa
        </div>
      </div>
    </div>
  );
}
