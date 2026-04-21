"use client";

import Link from "next/link";
import { Instagram } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type StickyCTAProps = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  instagramHref: string;
};

export default function StickyCTA({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  instagramHref,
}: StickyCTAProps) {
  const pathname = usePathname();
  const { session, dismissed } = useAuth();

  if (pathname?.startsWith("/reservar")) {
    return null;
  }
  if (!session || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur">
        <Link
          href={primaryHref}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110"
        >
          {primaryLabel}
        </Link>
        <a
          href={secondaryHref}
          className="flex items-center justify-center rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/30 transition hover:bg-[#1ebe5b]"
        >
          {secondaryLabel}
        </a>
        <a
          href={instagramHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f58529,#feda77,#dd2a7b,#8134af,#515bd4)] text-white shadow-lg shadow-[#dd2a7b]/25 transition hover:scale-[1.03]"
        >
          <Instagram className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}
