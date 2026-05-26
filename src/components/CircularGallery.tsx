"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

export type CircularGalleryItem = {
  id: string;
  permalink: string;
  title: string;
  coverImage?: string;
};

type CircularGalleryProps = {
  items: CircularGalleryItem[];
};

const PRELOAD_OFFSETS = [-2, -1, 0, 1, 2] as const;
const VISIBLE_OFFSETS = new Set([-1, 0, 1]);

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function shortestOffset(from: number, to: number, length: number) {
  const direct = to - from;
  const wrappedForward = direct + length;
  const wrappedBackward = direct - length;

  return [direct, wrappedForward, wrappedBackward].reduce((best, current) =>
    Math.abs(current) < Math.abs(best) ? current : best,
  );
}

/**
 * Returns the CSS transform string for a card at the given offset.
 * Scale is applied here, not inside the post card, to avoid
 * the double-scaling bug that made cards appear tiny.
 */
function getOffsetTransform(offset: number, scale: number, isMobile: boolean) {
  if (offset === 0) {
    return `translate3d(-50%, -50%, 0) rotate(0deg) scale(${scale})`;
  }

  const direction = Math.sign(offset);
  const distance = Math.abs(offset);
  
  // Responsive distances to keep side cards visible on mobile
  const baseDistance = isMobile
    ? distance === 1
      ? "clamp(5.5rem, 18vw, 7.5rem)"
      : "clamp(10rem, 30vw, 12rem)"
    : distance === 1
      ? "clamp(8rem, 22vw, 13.5rem)"
      : "clamp(14rem, 36vw, 23rem)";

  const horizontal =
    direction > 0
      ? `calc(-50% + ${baseDistance})`
      : `calc(-50% - ${baseDistance})`;
  
  const vertical = isMobile
    ? distance === 1
      ? "calc(-50% + 0.8rem)"
      : "calc(-50% + 1.5rem)"
    : distance === 1
      ? "calc(-50% + 1.8rem)"
      : "calc(-50% + 3rem)";

  const rotation = `${direction * (distance === 1 ? (isMobile ? 5 : 8) : (isMobile ? 8 : 12))}deg`;
  return `translate3d(${horizontal}, ${vertical}, 0) rotate(${rotation}) scale(${scale})`;
}

function ensureInstagramScript() {
  if (typeof window === "undefined") return null;
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

function InstagramEmbedCard({
  permalink,
  isActive,
}: {
  permalink: string;
  isActive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = ensureInstagramScript();
    const processEmbeds = () => {
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process();
      }
    };

    if (window.instgrm?.Embeds) {
      processEmbeds();
    } else if (script) {
      script.addEventListener("load", processEmbeds);
    }

    // Observe when the blockquote gets processed and replaced by/injected with an iframe
    const observer = new MutationObserver(() => {
      const iframe = containerRef.current?.querySelector("iframe");
      if (iframe) {
        if (iframe.dataset.loadedListenerAttached !== "true") {
          iframe.dataset.loadedListenerAttached = "true";
          const handleLoad = () => {
            setTimeout(() => {
              setIsLoaded(true);
            }, 300);
          };
          iframe.addEventListener("load", handleLoad);
        }
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    // Safety fallback: if load event fails to fire, resolve loading state after 3s
    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
      if (script) {
        script.removeEventListener("load", processEmbeds);
      }
    };
  }, [permalink]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-[1.85rem] border border-border bg-card p-2 shadow-[0_18px_54px_rgba(15,31,36,0.08)] transition-all duration-500 dark:border-white/10 dark:bg-black/30 w-[326px] h-[560px]",
        isActive 
          ? "border-primary/30 shadow-[0_24px_72px_rgba(15,31,36,0.14)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.4),0_0_30px_rgba(52,182,200,0.15)] scale-[1.01]" 
          : "border-border/60 shadow-[0_10px_30px_rgba(15,31,36,0.04)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.2)] opacity-70"
      )}
    >
      {/* Loading Placeholder Skeleton */}
      <div
        className={cn(
          "absolute inset-2 flex flex-col items-center justify-center rounded-[1.4rem] bg-secondary/80 dark:bg-[#132025]/90 border border-white/5 transition-opacity duration-500 z-10",
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#f4d34c_0%,#ff5d95_50%,#8a3ab9_100%)] text-white shadow-lg animate-pulse">
            <svg className="h-9 w-9 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
          <div className="space-y-1 mt-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Cargando Feed</span>
            <p className="text-xs text-muted-foreground">Conectando con Instagram...</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "h-full w-full overflow-y-auto scrollbar-none rounded-[1.4rem] bg-white transition-all duration-700 ease-out border-0",
          isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
          isActive ? "pointer-events-auto" : "pointer-events-none"
        )}
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
            minWidth: "100%",
            padding: "0",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

export default function CircularGallery({ items }: CircularGalleryProps) {
  const t = useTranslations("social");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const resumeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const scaleActive = isMobile ? 0.82 : 1.0;
  const scaleSide = isMobile ? 0.62 : 0.8;
  const scaleHidden = isMobile ? 0.45 : 0.6;

  const renderedItems = useMemo(
    () =>
      items.length === 0
        ? []
        : PRELOAD_OFFSETS.map((offset) =>
            items[wrapIndex(activeIndex + offset, items.length)],
          ).filter(
            (item, index, array) =>
              array.findIndex((entry) => entry.id === item.id) === index,
          ),
    [activeIndex, items],
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-white/25 bg-white/55 shadow-[0_2px_32px_rgba(15,31,36,0.07),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl backdrop-saturate-[165%] dark:border-white/10 dark:bg-card/60 dark:shadow-[0_2px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] h-[30rem] sm:h-[34rem] lg:h-[38rem]"
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

        <div className="relative h-full animate-fade-in">
          {renderedItems.map((item) => {
            const itemIndex = items.findIndex((entry) => entry.id === item.id);
            const offset = shortestOffset(activeIndex, itemIndex, items.length);
            const isVisible = VISIBLE_OFFSETS.has(offset as -1 | 0 | 1);
            const isActive = offset === 0;
            const distance = Math.abs(offset);
            const scale = isActive
              ? scaleActive
              : distance === 1
                ? scaleSide
                : scaleHidden;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={isVisible ? 0 : -1}
                onClick={() => {
                  if (isActive) return;
                  setActiveIndex(itemIndex);
                  setIsPaused(true);
                }}
                onKeyDown={(event) => {
                  if (!isVisible || isActive) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setActiveIndex(itemIndex);
                  setIsPaused(true);
                }}
                className="absolute left-1/2 top-1/2 w-[326px] text-left transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                style={{
                  transform: getOffsetTransform(offset, scale, isMobile),
                  opacity: isActive ? 1 : distance === 1 ? 0.6 : 0,
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
                    ? t("activePost", { title: item.title })
                    : t("viewPost", { title: item.title })
                }
              >
                <div
                  className={
                    isActive ? "pointer-events-auto" : "pointer-events-none"
                  }
                >
                  <InstagramEmbedCard
                    key={item.permalink}
                    permalink={item.permalink}
                    isActive={isActive}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={() => setActiveIndex((current) => wrapIndex(current - 1, items.length))}
          className="absolute left-3 sm:left-6 top-1/2 z-50 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:border-white/40"
          aria-label={t("galleryPrev")}
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <button
          type="button"
          onClick={() => setActiveIndex((current) => wrapIndex(current + 1, items.length))}
          className="absolute right-3 sm:right-6 top-1/2 z-50 -translate-y-1/2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:border-white/40"
          aria-label={t("galleryNext")}
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
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
