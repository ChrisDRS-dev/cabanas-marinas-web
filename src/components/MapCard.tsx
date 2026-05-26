"use client";

import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
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
  const t = useTranslations("home.sections");

  return (
    <div className="grid gap-8 rounded-[2.25rem] border border-border/80 bg-card/60 backdrop-blur-md p-6 sm:p-8 shadow-lg transition-all duration-500 hover:border-primary/25 hover:shadow-2xl hover:shadow-primary/5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center dark:border-white/10 dark:bg-white/[0.02]">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
            {title}
          </p>
          <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {t("locationTitle")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{description}</p>
        <div className="pt-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-300 hover:bg-primary/25 hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <MapPin className="h-4 w-4" />
            {t("locationCta")}
          </a>
        </div>
      </div>
      <div className="relative h-60 overflow-hidden rounded-2xl border border-border bg-muted sm:h-72 transition-all duration-300 hover:border-primary/25 dark:border-white/10">
        <LeafletLocationMap
          latitude={latitude}
          longitude={longitude}
          title="Cabañas Marinas · Punta Burica"
        />
        <div className="absolute bottom-4 left-4 z-[40] rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-md">
          {t("locationTitle")}
        </div>
      </div>
    </div>
  );
}
