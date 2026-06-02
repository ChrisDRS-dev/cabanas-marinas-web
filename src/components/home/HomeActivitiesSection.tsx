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

  // Duplicate activities for seamless marquee loop
  const duplicatedActivities = [...activities, ...activities];

  const lightboxItems = activities.map((activity, index) => ({
    id: String(index),
    image: activity.image,
    title: activity.title,
    description: activity.description,
  }));

  return (
    <section id="actividades" className="mx-auto max-w-6xl px-6 py-14 overflow-hidden">
      <style>{`
        @keyframes scroll-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .marquee-scroll {
          animation: scroll-marquee 40s linear infinite;
        }

        .marquee-container {
          mask-image: linear-gradient(
            90deg,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            90deg,
            transparent 0%,
            black 8%,
            black 92%,
            transparent 100%
          );
        }

        .marquee-container:hover .marquee-scroll,
        .marquee-container:active .marquee-scroll {
          animation-play-state: paused;
        }
      `}</style>

      <FadeIn className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        
        <div className="marquee-container w-full relative overflow-hidden py-4">
          <div className="marquee-scroll flex gap-6 w-max">
            {duplicatedActivities.map((activity, index) => (
              <div
                key={`${activity.title}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => setActiveGalleryIndex(index % activities.length)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveGalleryIndex(index % activities.length);
                  }
                }}
                data-activity-card
                className="group relative flex flex-col justify-end overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/10 text-left transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:border-white/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px] flex-shrink-0 h-[360px] cursor-pointer"
              >
                {activity.image ? (
                  <Image
                    src={activity.image}
                    alt={activity.title}
                    fill
                    sizes="(max-width: 640px) 480px, (max-width: 1024px) 600px, 600px"
                    quality={90}
                    className="absolute inset-0 object-cover brightness-[0.85] contrast-[1.02] transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.9] will-change-transform"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="relative flex flex-col justify-end p-6 z-10 w-full text-white">
                  <h3 className="font-display text-xl font-bold tracking-tight text-white leading-tight">
                    {activity.title}
                  </h3>
                  <p className="text-xs text-white/80 leading-relaxed mt-1">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
