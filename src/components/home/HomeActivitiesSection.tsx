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

  // Custom buttery-smooth easeOutQuart scroll animation that avoids snap stutters
  const smoothScrollTo = (container: HTMLDivElement, targetLeft: number, duration: number = 650) => {
    // Temporarily disable snap type during programmatic animation
    container.style.scrollSnapType = "none";

    const startLeft = container.scrollLeft;
    const distance = targetLeft - startLeft;
    const startTime = performance.now();

    const animateScroll = (now: number) => {
      const timeElapsed = now - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      // EaseOutQuart curve
      const ease = 1 - Math.pow(1 - progress, 4);

      container.scrollLeft = startLeft + distance * ease;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        // Restore snap type once target scroll is reached
        container.style.scrollSnapType = "";
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Smooth scroll to next/prev card's offset
  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-activity-card]"));
    if (cards.length === 0) return;

    const containerScrollLeft = container.scrollLeft;
    let targetCard: HTMLElement | null = null;

    if (direction === "left") {
      for (let i = cards.length - 1; i >= 0; i--) {
        if (cards[i].offsetLeft < containerScrollLeft - 15) {
          targetCard = cards[i];
          break;
        }
      }
      if (!targetCard) targetCard = cards[0];
    } else {
      for (let i = 0; i < cards.length; i++) {
        if (cards[i].offsetLeft > containerScrollLeft + 15) {
          targetCard = cards[i];
          break;
        }
      }
      if (!targetCard) targetCard = cards[cards.length - 1];
    }

    if (targetCard) {
      smoothScrollTo(container, targetCard.offsetLeft);
    }
  };

  // Autoplay slideshow with hover-pause behavior
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const autoplayInterval = setInterval(() => {
      if (isHoveredRef.current) return;

      const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-activity-card]"));
      if (cards.length < 2) return;

      const containerScrollLeft = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;

      let currentIndex = 0;
      let closestDist = Infinity;
      cards.forEach((card, index) => {
        const dist = Math.abs(card.offsetLeft - containerScrollLeft);
        if (dist < closestDist) {
          closestDist = dist;
          currentIndex = index;
        }
      });

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

      nextIndex = Math.max(0, Math.min(nextIndex, cards.length - 1));
      const targetCard = cards[nextIndex];
      if (targetCard) {
        smoothScrollTo(container, targetCard.offsetLeft);
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
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        
        <div className="relative group/gallery">
          <div
            ref={scrollContainerRef}
            onMouseEnter={() => {
              isHoveredRef.current = true;
            }}
            onMouseLeave={() => {
              isHoveredRef.current = false;
            }}
            className="gallery-scroll flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory"
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
                    className="absolute inset-0 object-cover brightness-[0.85] contrast-[1.02] transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.9]"
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

          {/* Side Floating Navigation buttons */}
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-2 top-[180px] -translate-y-1/2 z-30 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:border-white/40 opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-2 top-[180px] -translate-y-1/2 z-30 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:border-white/40 opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
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
