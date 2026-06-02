"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FadeIn from "@/components/FadeIn";
import ImageLightbox from "@/components/ui/ImageLightbox";

export default function HomeActivitiesSection({
  eyebrow,
  title,
  subtitle,
  activities,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  activities: Array<{ title: string; description: string; image: string }>;
}) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const cardWidth = 350; // card min-width + gap
    container.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  const lightboxItems = activities.map((activity, index) => ({
    id: String(index),
    image: activity.image,
    title: activity.title,
    description: activity.description,
  }));

  return (
    <section id="actividades" className="mx-auto max-w-6xl px-6 py-14">
      <FadeIn className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {eyebrow}
            </p>
            <h2 className="font-display text-3xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {/* Navigation buttons for desktop/tablet */}
          <div className="hidden sm:flex gap-2.5">
            <button
              onClick={() => scroll("left")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md shadow-black/5 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md shadow-black/5 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition cursor-pointer"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div
          ref={scrollContainerRef}
          className="gallery-scroll flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scroll-smooth"
        >
          {activities.map((activity, index) => (
            <div
              key={activity.title}
              role="button"
              tabIndex={0}
              onClick={() => setActiveGalleryIndex(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveGalleryIndex(index);
                }
              }}
              className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] flex-none snap-center rounded-3xl border border-border/85 bg-card shadow-md shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-3xl">
                <Image
                  src={activity.image}
                  alt={activity.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <div className="space-y-2 p-5">
                <h3 className="text-lg font-semibold">{activity.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      {activeGalleryIndex !== null && (
        <ImageLightbox
          items={lightboxItems}
          activeIndex={activeGalleryIndex}
          onClose={() => setActiveGalleryIndex(null)}
          onChange={setActiveGalleryIndex}
        />
      )}
    </section>
  );
}
