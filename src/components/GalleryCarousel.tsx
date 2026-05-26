"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import useReserveAction from "@/hooks/useReserveAction";

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
  const { session, openAuth } = useAuth();
  const reserve = useReserveAction();

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
      className="gallery-scroll flex snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-visible pb-6 scroll-smooth lg:px-0 lg:overflow-x-visible lg:grid lg:grid-cols-3 lg:gap-8 lg:max-w-6xl lg:mx-auto"
    >
      {items.map((item) => (
        <div
          role="button"
          tabIndex={0}
          key={item.title}
          onClick={() => {
            if (!session) {
              openAuth();
              return;
            }
            void reserve(item.href);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!session) {
                openAuth();
                return;
              }
              void reserve(item.href);
            }
          }}
          data-gallery-card
          className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/10 text-left transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:border-white/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] min-w-[85%] snap-center sm:min-w-[46%] lg:min-w-0 lg:w-full min-h-[520px] h-auto aspect-auto lg:aspect-[4/5.6] lg:min-h-[530px] cursor-pointer"
        >
          {item.image ? (
            <Image
              src={item.image}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
              className="absolute inset-0 object-cover brightness-[0.35] contrast-[1.05] transition duration-700 ease-out group-hover:scale-105 group-hover:brightness-[0.4]"
              priority={item === items[0]}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
          <div
            className="absolute inset-0 opacity-20 transition-opacity duration-300 group-hover:opacity-30"
            style={{ background: item.accent }}
          />
          <div className="relative flex flex-1 flex-col justify-between p-6 sm:p-8 text-white z-10 w-full">
            {/* Top Section */}
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                  Paquete
                </p>
                <h3 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {item.title}
                </h3>
              </div>

              {/* Pricing Section (Aligned consistently below the Title) */}
              <div className="flex items-baseline gap-1.5 text-white">
                <span className="font-display text-4xl font-extrabold tracking-tight">
                  {item.price}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  {item.unit}
                </span>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-3.5 text-xs font-medium text-white/90">
                <li className="flex items-start gap-2.5">
                  <svg
                    className="h-4 w-4 shrink-0 text-white/70 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="leading-tight">{item.duration}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg
                    className="h-4 w-4 shrink-0 text-white/70 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="leading-tight">{item.schedule}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <svg
                    className="h-4 w-4 shrink-0 text-white/70 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="leading-tight">{item.rule}</span>
                </li>
              </ul>
            </div>

            {/* Bottom Section */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <p className="text-[11px] font-medium text-white/75 leading-relaxed">
                {item.note}
              </p>
              {/* Liquid-glass "Seleccionar" button */}
              <span
                className="block w-full rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-center text-sm font-bold text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white/20 group-hover:border-white/30 group-hover:scale-[1.01]"
                style={{
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                Seleccionar
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
