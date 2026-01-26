"use client";

import { useEffect, useRef } from "react";

type GalleryItem = {
  title: string;
  image: string;
  accent: string;
  price: string;
  unit: string;
  duration: string;
  schedule: string;
  rule: string;
  note: string;
  href: string;
};

type GalleryCarouselProps = {
  items: GalleryItem[];
};

export default function GalleryCarousel({ items }: GalleryCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const indexRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-gallery-card]")
    );
    if (cards.length < 2) return;
    if (container.scrollWidth <= container.clientWidth) return;
    indexRef.current = 0;
    directionRef.current = 1;

    const intervalId = window.setInterval(() => {
      const current = containerRef.current;
      if (!current) return;
      const targets = current.querySelectorAll<HTMLElement>("[data-gallery-card]");
      if (targets.length < 2) return;
      if (directionRef.current === 1 && indexRef.current >= targets.length - 1) {
        directionRef.current = -1;
      } else if (directionRef.current === -1 && indexRef.current <= 0) {
        directionRef.current = 1;
      }
      indexRef.current = indexRef.current + directionRef.current;
      const nextCard = targets[indexRef.current];
      if (!nextCard) return;
      current.scrollTo({ left: nextCard.offsetLeft, behavior: "smooth" });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className="gallery-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible pb-4 scroll-smooth lg:px-6 lg:py-3"
    >
      {items.map((item) => (
        <a
          key={item.title}
          href={item.href}
          data-gallery-card
          className="group relative min-w-[78%] snap-center overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-black/5 aspect-square transition hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl sm:min-w-[48%] lg:min-w-[10%]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center brightness-50 transition duration-500 group-hover:scale-105"
            style={{
              backgroundImage: item.image ? `url(${item.image})` : "",
            }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: item.accent }}
          />
          <div className="relative flex h-full flex-col justify-between p-6 text-white lg:p-7">
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-semibold">
                {item.title}
              </h2>
              <ul className="list-disc space-y-1 pl-4 text-xs font-medium text-white/90">
                <li>{item.duration}</li>
                <li>{item.schedule}</li>
                <li>{item.rule}</li>
              </ul>
              <div className="flex flex-wrap items-baseline gap-2 text-white/95">
                <span className="text-3xl font-semibold">{item.price}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  {item.unit}
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-white/85">{item.note}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
