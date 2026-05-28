"use client";

import Image from "next/image";
import { useState } from "react";
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

  const lightboxItems = activities.map((activity, index) => ({
    id: String(index),
    image: activity.image,
    title: activity.title,
    description: activity.description,
  }));

  return (
    <section id="actividades" className="mx-auto max-w-6xl px-6 py-14">
      <FadeIn className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="gallery-scroll flex gap-4 overflow-x-auto pb-2 pt-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
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
              className="min-w-[250px] flex-1 rounded-3xl border border-border/80 bg-card shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
                <p className="text-sm text-muted-foreground">
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
