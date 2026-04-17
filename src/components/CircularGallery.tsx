"use client";

import { useEffect, useState } from "react";

export type CircularGalleryItem = {
  id: string;
  image: string;
  text: string;
  link?: string;
  isVideo?: boolean;
};

type CircularGalleryProps = {
  items: CircularGalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  scrollSpeed?: number;
  scrollEase?: number;
};

const VISIBLE_OFFSETS = [-2, -1, 0, 1, 2] as const;

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function getOffsetIndex(activeIndex: number, offset: number, length: number) {
  return wrapIndex(activeIndex + offset, length);
}

function getCardTransform(offset: number, bend: number) {
  const direction = Math.sign(offset);
  const distance = Math.abs(offset);
  const translateX = offset * 22;
  const translateY = distance * distance * bend * 0.9;
  const rotate = direction * distance * 7;
  const scale = offset === 0 ? 1 : Math.max(0.72, 1 - distance * 0.14);
  return `translate3d(${translateX}%, ${translateY}px, 0) rotate(${rotate}deg) scale(${scale})`;
}

export default function CircularGallery({
  items,
  bend = 14,
  textColor = "#ffffff",
  borderRadius = 0.12,
  scrollSpeed = 5000,
}: CircularGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => wrapIndex(current + 1, items.length));
    }, scrollSpeed);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [items.length, scrollSpeed]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2.8rem] border border-border/70 bg-[linear-gradient(180deg,rgba(0,133,161,0.08),rgba(255,179,71,0.08))] px-3 py-8 sm:px-5 sm:py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(0,133,161,0.18),transparent_62%)]" />
        <div className="relative mx-auto h-[27rem] max-w-5xl sm:h-[31rem] lg:h-[34rem]">
          {VISIBLE_OFFSETS.map((offset) => {
            const item = items[getOffsetIndex(activeIndex, offset, items.length)];
            const distance = Math.abs(offset);
            const isActive = offset === 0;

            return (
              <a
                key={`${item.id}-${offset}`}
                href={item.link ?? "#"}
                target={item.link ? "_blank" : undefined}
                rel={item.link ? "noopener noreferrer" : undefined}
                aria-label={item.text}
                className={[
                  "absolute left-1/2 top-1/2 block h-[17rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-white/20 shadow-[0_20px_60px_rgba(15,31,36,0.22)] transition-[transform,opacity,filter] duration-500 ease-out sm:h-[20rem] sm:w-[16.5rem] lg:h-[22rem] lg:w-[18rem]",
                  isActive ? "z-30" : distance === 1 ? "z-20" : "z-10",
                ].join(" ")}
                style={{
                  transform: `${getCardTransform(offset, bend)} translate(-50%, -50%)`,
                  opacity: distance > 2 ? 0 : distance === 2 ? 0.42 : distance === 1 ? 0.72 : 1,
                  filter: distance === 0 ? "none" : "saturate(0.88)",
                  borderRadius: `${borderRadius * 100}% / ${Math.max(18, borderRadius * 160)}%`,
                }}
                onMouseEnter={() => setActiveIndex(getOffsetIndex(activeIndex, offset, items.length))}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,21,0.04),rgba(7,18,21,0.68)_72%,rgba(7,18,21,0.86))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_36%)]" />

                <div className="relative flex h-full flex-col justify-between p-5" style={{ color: textColor }}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] backdrop-blur-sm">
                      Instagram
                    </span>
                    {item.isVideo ? (
                      <span className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] backdrop-blur-sm">
                        Video
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <p className="text-base font-semibold leading-tight sm:text-lg">
                      {item.text}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
                      Ver post
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Ir al slide ${index + 1}`}
            onClick={() => setActiveIndex(index)}
            className={[
              "h-2.5 rounded-full transition-all",
              index === activeIndex
                ? "w-10 bg-primary"
                : "w-2.5 bg-border hover:bg-primary/50",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
