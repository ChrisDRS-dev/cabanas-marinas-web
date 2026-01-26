"use client";

import { usePathname } from "next/navigation";

type StickyCTAProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export default function StickyCTA({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: StickyCTAProps) {
  const pathname = usePathname();
  if (pathname?.startsWith("/reservar")) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur">
        <a
          href={primaryHref}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
        >
          {primaryLabel}
        </a>
        <a
          href={secondaryHref}
          className="flex items-center justify-center rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1ebe5b]"
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  );
}
