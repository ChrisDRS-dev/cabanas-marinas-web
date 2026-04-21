"use client";

import { useTranslations } from "next-intl";
import CircularGallery from "@/components/CircularGallery";
import FadeIn from "@/components/FadeIn";
import type { InstagramEmbedPost } from "@/lib/instagram-embeds";

type InstagramGallerySectionProps = {
  items: InstagramEmbedPost[];
  profileUrl: string;
};

export default function InstagramGallerySection({
  items,
  profileUrl,
}: InstagramGallerySectionProps) {
  const t = useTranslations("home.sections");

  return (
    <section id="instagram" className="mx-auto max-w-6xl px-6 py-18">
      <FadeIn className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("socialEyebrow")}
          </p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            {t("socialTitle")}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("socialDescription")}
            {" "}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary transition hover:opacity-80"
            >
              {t("socialProfile")}
            </a>
          </p>
        </div>
        <CircularGallery items={items} />
      </FadeIn>
    </section>
  );
}
