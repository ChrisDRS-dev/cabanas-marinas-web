"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const PRELOAD_OFFSETS = [-2, -1, 0, 1, 2] as const;
const VISIBLE_OFFSETS = new Set([-1, 0, 1]);
const SCALE_ACTIVE = 0.6;
const SCALE_SIDE = 0.42;
const SCALE_HIDDEN = 0.34;

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function shortestOffset(from: number, to: number, length: number) {
  const direct = to - from;
  const wrappedForward = direct + length;
  const wrappedBackward = direct - length;

  return [direct, wrappedForward, wrappedBackward].reduce((best, current) =>
    Math.abs(current) < Math.abs(best) ? current : best
  );
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
  const distance = Math.abs(offset);
  const baseDistance = distance === 1 ? "clamp(8rem, 19vw, 13rem)" : "clamp(12rem, 29vw, 20rem)";
  const horizontal =
    direction > 0
      ? `calc(-50% + ${baseDistance})`
      : `calc(-50% - ${baseDistance})`;
  const vertical = distance === 1 ? "calc(-50% + 1.8rem)" : "calc(-50% + 3rem)";
  const rotation = `${direction * (distance === 1 ? 8 : 12)}deg`;
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
function InstagramEmbedCard({
  permalink,
  isActive,
}: {
  permalink: string;
  isActive: boolean;
}) {
  const embedRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!embedRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

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
      className="overflow-hidden rounded-[1.45rem] border border-black/6 bg-white p-2 shadow-[0_18px_54px_rgba(10,12,18,0.14)] transition-[box-shadow] duration-700 ease-out"
      style={{
        height: "560px",
        width: "326px",
        boxShadow: isActive
          ? "0 24px 72px rgba(10,12,18,0.18)"
          : "0 14px 40px rgba(10,12,18,0.1)",
      }}
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

  const renderedItems = useMemo(
    () =>
      items.length === 0
        ? []
        : PRELOAD_OFFSETS.map((offset) => items[wrapIndex(activeIndex + offset, items.length)]).filter(
            (item, index, array) =>
              array.findIndex((entry) => entry.id === item.id) === index,
          ),
    [activeIndex, items],
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div
        className="relative h-[24rem] overflow-hidden rounded-[2rem] border border-white/25 bg-white/55 shadow-[0_2px_32px_rgba(15,31,36,0.07),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl backdrop-saturate-[165%] dark:border-white/10 dark:bg-card/60 dark:shadow-[0_2px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-[26rem] lg:h-[28rem]"
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
        {/* Subtle brand-color accents — teal top-left, amber bottom-right, white sheen top-center */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(0,133,161,0.07),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(255,179,71,0.06),transparent_45%),radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.14),transparent_38%)] dark:bg-[radial-gradient(ellipse_at_15%_20%,rgba(52,182,200,0.07),transparent_50%),radial-gradient(ellipse_at_85%_80%,rgba(255,179,71,0.06),transparent_45%),radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.04),transparent_38%)]" />

        {/* Edge fades — match the glass panel so side cards dissolve smoothly */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-40 w-14 bg-gradient-to-r from-white/70 to-transparent dark:from-card/75 sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-40 w-14 bg-gradient-to-l from-white/70 to-transparent dark:from-card/75 sm:w-20" />

        <div className="relative h-full">
          {renderedItems.map((item) => {
            const itemIndex = items.findIndex((entry) => entry.id === item.id);
            const offset = shortestOffset(activeIndex, itemIndex, items.length);
            const isVisible = VISIBLE_OFFSETS.has(offset as -1 | 0 | 1);
            const isActive = offset === 0;
            const distance = Math.abs(offset);
            const scale = isActive
              ? SCALE_ACTIVE
              : distance === 1
                ? SCALE_SIDE
                : SCALE_HIDDEN;
            const opacity = isActive ? 1 : distance === 1 ? 0.6 : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveIndex(itemIndex);
                  setIsPaused(true);
                }}
                /* Width matches the natural card width so translate(-50%) centres correctly */
                className="absolute left-1/2 top-1/2 w-[326px] text-left transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                style={{
                  transform: getOffsetTransform(offset, scale),
                  opacity,
                  filter:
                    isActive
                      ? "none"
                      : distance === 1
                        ? "saturate(0.94) blur(0.12px)"
                        : "saturate(0.9) blur(0.3px)",
                  zIndex: isActive ? 30 : 20 - distance,
                  pointerEvents: isVisible ? "auto" : "none",
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
                  <InstagramEmbedCard
                    permalink={item.permalink}
                    isActive={isActive}
                  />
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
