"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
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
  const isHoveredRef = useRef(false);
  const directionRef = useRef<1 | -1>(1);

  // Smooth scroll to next/prev card's offset
  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-activity-card]"));
    if (cards.length === 0) return;

    const containerScrollLeft = container.scrollLeft;
    let targetCard: HTMLElement | null = null;

    if (direction === "left") {
      // Find the last card that is to the left of current scroll position
      for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].offsetLeft < containerScrollLeft - 15) {
          targetCard = cards[i];
          break;
        }
      }
      // Fallback to first card if nothing found
      if (!targetCard) targetCard = cards[0];
    } else {
      // Find the first card that is to the right of current scroll position
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].offsetLeft > containerScrollLeft + 15) {
          targetCard = cards[i];
          break;
        }
      }
      // Fallback to last card if nothing found
      if (!targetCard) targetCard = cards[cards.length - 1];
    }

    if (targetCard) {
      container.scrollTo({
        left: targetCard.offsetLeft,
        behavior: "smooth",
      });
    }
  };

  // Autoplay slideshow with hover-pause behavior
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const autoplayInterval = setInterval(() => {
      // If user is hovering or interacting, pause the autoplay
      if (isHoveredRef.current) return;

      const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-activity-card]"));
      if (cards.length < 2) return;

      const containerScrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      // Detect current active index (closest to scrollLeft)
      let currentIndex = 0;
      let closestDist = Infinity;
      cards.forEach((card, index) => {
        const dist = Math.abs(card.offsetLeft - containerScrollLeft);
        if (dist < closestDist) {
          closestDist = dist;
          currentIndex = index;
        }
      });

      // Compute next target index
      let nextIndex = currentIndex;
      if (directionRef.current === 1) {
        if (currentIndex >= cards.length - 1 || containerScrollLeft >= maxScroll - 10) {
          directionRef.current = -1;
          nextIndex = currentIndex - 1;
        } else {
          nextIndex = currentIndex + 1;
        }
      } else {
        if (currentIndex <= 0 || containerScrollLeft <= 10) {
          directionRef.current = 1;
          nextIndex = currentIndex + 1;
        } else {
          nextIndex = currentIndex - 1;
        }
      }

      // Safe bounds check
      nextIndex = Math.max(0, Math.min(nextIndex, cards.length - 1));
      const targetCard = cards[nextIndex];
      if (targetCard) {
        container.scrollTo({
          left: targetCard.offsetLeft,
          behavior: "smooth",
        });
      }
    }, 4500);

    return () => clearInterval(autoplayInterval);
  }, [activities.length]);

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
          onMouseEnter={() => {
            isHoveredRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveredRef.current = false;
          }}
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
              data-activity-card
              className="group relative flex flex-col justify-end overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/10 text-left transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:border-white/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-w-[240px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[300px] flex-none snap-center h-[360px] cursor-pointer"
            >
              {activity.image ? (
                <Image
                  src={activity.image}
                  alt={activity.title}
                  fill
                  sizes="(max-width: 640px) 240px, (max-width: 1024px) 280px, 300px"
                  className="absolute inset-0 object-cover brightness-[0.4] contrast-[1.05] transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.45]"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
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
