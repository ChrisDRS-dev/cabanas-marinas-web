"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type LightboxItem = {
  id: string;
  image: string;
  title?: string;      // Used for activities (e.g. "Kayak")
  subtitle?: string;   // Used for guest name in reviews (e.g. "Chris")
  description: string;  // Used for comment/description text
};

type ImageLightboxProps = {
  items: LightboxItem[];
  activeIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
};

export default function ImageLightbox({
  items,
  activeIndex,
  onClose,
  onChange,
}: ImageLightboxProps) {
  const t = useTranslations("reviews");
  const activeItem = items[activeIndex];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && items.length > 1) {
        onChange(activeIndex === 0 ? items.length - 1 : activeIndex - 1);
      }
      if (event.key === "ArrowRight" && items.length > 1) {
        onChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, items.length, onChange, onClose]);

  if (!activeItem) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071015]/95 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl flex flex-col rounded-[2rem] border border-white/10 bg-[#0b1418]/98 shadow-[0_30px_120px_rgba(0,0,0,0.6)] overflow-hidden max-h-[90vh]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("galleryClose") || "Cerrar"}
          className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/40 text-white/80 transition hover:border-white/24 hover:text-white cursor-pointer hover:bg-black/60 shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                onChange(activeIndex === 0 ? items.length - 1 : activeIndex - 1)
              }
              aria-label={t("galleryPrev") || "Anterior"}
              className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/40 text-white/80 transition hover:border-white/24 hover:text-white sm:left-5 cursor-pointer hover:bg-black/60 shadow-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1)
              }
              aria-label={t("galleryNext") || "Siguiente"}
              className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/40 text-white/80 transition hover:border-white/24 hover:text-white sm:right-5 cursor-pointer hover:bg-black/60 shadow-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Unified Scrollable Container for Image + Details */}
        <div className="overflow-y-auto flex-1 hide-scrollbar">
          {/* Image Container */}
          <div className="flex bg-[#050b0e] items-center justify-center p-4 pt-16 pb-6 min-h-[300px]">
            <img
              src={activeItem.image}
              alt={activeItem.title || activeItem.subtitle || "Image"}
              className="max-h-[60vh] w-auto max-w-full rounded-[1.2rem] object-contain shadow-md"
            />
          </div>

          {/* Details Box */}
          <div className="border-t border-white/8 bg-[#0d1519]/90 px-6 py-6 sm:px-8">
            <div className="space-y-3">
              {activeItem.title && (
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {activeItem.title}
                </h3>
              )}
              {activeItem.subtitle && (
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-white/50">
                  {activeItem.subtitle}
                </p>
              )}
              <p className={cn(
                "text-white/86 text-base sm:text-lg leading-[1.6]",
                activeItem.subtitle ? "font-display italic text-[1.05rem] leading-[1.7]" : ""
              )}>
                {activeItem.subtitle ? `“${activeItem.description}”` : activeItem.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
