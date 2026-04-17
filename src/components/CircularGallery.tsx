"use client";

import { useEffect, useRef, useState } from "react";

export type CircularGalleryItem = {
  id: string;
  permalink: string;
  title: string;
};

type CircularGalleryProps = {
  items: CircularGalleryItem[];
};

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

const VISIBLE_OFFSETS = [-1, 0, 1] as const;
const SCALE_ACTIVE = 0.6;
const SCALE_SIDE = 0.42;

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

/**
 * Returns the CSS transform string for a card at the given offset.
 * Scale is applied here — NOT inside InstagramEmbedCard — to avoid
 * the double-scaling bug that made cards appear tiny.
 */
function getOffsetTransform(offset: number, scale: number) {
  if (offset === 0) {
    return `translate3d(-50%, -50%, 0) rotate(0deg) scale(${scale})`;
  }

  const direction = Math.sign(offset);
  const horizontal =
    direction > 0
      ? "calc(-50% + clamp(8rem, 19vw, 13rem))"
      : "calc(-50% - clamp(8rem, 19vw, 13rem))";
  const vertical = "calc(-50% + 1.8rem)";
  const rotation = `${direction * 8}deg`;
  return `translate3d(${horizontal}, ${vertical}, 0) rotate(${rotation}) scale(${scale})`;
}

function ensureInstagramScript() {
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-instagram-embed="true"]'
  );
  if (existing) return existing;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.instagram.com/embed.js";
  script.setAttribute("data-instagram-embed", "true");
  document.body.appendChild(script);
  return script;
}

/**
 * Renders a single Instagram embed at its natural 326 × 560 px size.
 * Scaling is handled by the parent button's CSS transform.
 */
function InstagramEmbedCard({ permalink }: { permalink: string }) {
  const embedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!embedRef.current) return;

    const script = ensureInstagramScript();
    const processEmbeds = () => {
      window.instgrm?.Embeds?.process();
    };

    if (window.instgrm?.Embeds) {
      processEmbeds();
      return;
    }

    script.addEventListener("load", processEmbeds);
    return () => {
      script.removeEventListener("load", processEmbeds);
    };
  }, [permalink]);

  return (
    <div
      ref={embedRef}
      className="overflow-hidden rounded-[1.45rem] border border-black/6 bg-white p-2 shadow-[0_18px_54px_rgba(10,12,18,0.14)]"
      style={{ height: "560px", width: "326px" }}
    >
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{
          background: "#ffffff",
          border: "0",
          borderRadius: "18px",
          boxShadow: "none",
          margin: "0 auto",
          maxWidth: "540px",
          minWidth: "326px",
          padding: "0",
          width: "100%",
        }}
      />
    </div>
  );
}

export default function CircularGallery({ items }: CircularGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => wrapIndex(current + 1, items.length));
    }, 4200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [items.length, isPaused]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div
        className="relative h-[24rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#140f1a] sm:h-[26rem] lg:h-[28rem]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => {
          setIsPaused(true);
          if (resumeTimeoutRef.current) {
            window.clearTimeout(resumeTimeoutRef.current);
          }
        }}
        onTouchEnd={() => {
          if (resumeTimeoutRef.current) {
            window.clearTimeout(resumeTimeoutRef.current);
          }
          resumeTimeoutRef.current = window.setTimeout(
            () => setIsPaused(false),
            6000
          );
        }}
      >
        {/* Ambient gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,181,200,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,176,84,0.1),transparent_36%)]" />

        {/* Left edge fade — blends side cards into the dark background */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-40 w-16 bg-gradient-to-r from-[#140f1a] to-transparent sm:w-24" />
        {/* Right edge fade */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-16 bg-gradient-to-l from-[#140f1a] to-transparent sm:w-24" />

        <div className="relative h-full">
          {VISIBLE_OFFSETS.map((offset) => {
            const item = items[wrapIndex(activeIndex + offset, items.length)];
            const isActive = offset === 0;
            const scale = isActive ? SCALE_ACTIVE : SCALE_SIDE;
            const distance = Math.abs(offset);

            return (
              <button
                key={`${item.id}-${offset}`}
                type="button"
                onClick={() => {
                  setActiveIndex(
                    items.findIndex((entry) => entry.id === item.id)
                  );
                  setIsPaused(true);
                }}
                /* Width matches the natural card width so translate(-50%) centres correctly */
                className="absolute left-1/2 top-1/2 w-[326px] text-left transition-[transform,opacity,filter] duration-500 ease-out"
                style={{
                  transform: getOffsetTransform(offset, scale),
                  opacity: isActive ? 1 : 0.58,
                  filter: isActive ? "none" : "saturate(0.92) blur(0.15px)",
                  zIndex: isActive ? 30 : 20 - distance,
                  pointerEvents: "auto",
                }}
                aria-label={
                  isActive
                    ? `Post activo: ${item.title}`
                    : `Ver ${item.title}`
                }
              >
                <div
                  className={
                    isActive ? "pointer-events-auto" : "pointer-events-none"
                  }
                >
                  <InstagramEmbedCard permalink={item.permalink} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Ir al post ${index + 1}`}
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
