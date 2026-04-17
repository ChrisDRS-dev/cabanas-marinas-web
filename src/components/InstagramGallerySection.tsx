import CircularGallery from "@/components/CircularGallery";
import FadeIn from "@/components/FadeIn";
import type { InstagramEmbedPost } from "@/lib/instagram-embeds";

type InstagramGallerySectionProps = {
  items: InstagramEmbedPost[];
  profileUrl: string;
};

export default function InstagramGallerySection({
  items,
  profileUrl: _profileUrl,
}: InstagramGallerySectionProps) {
  return (
    <section id="instagram" className="mx-auto max-w-6xl px-6 py-18">
      <FadeIn className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Contenido social
          </p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Lo más reciente en Instagram
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Síguenos en Instagram y descubre los momentos que vivimos frente al mar, cada día.
          </p>
        </div>
        <CircularGallery items={items} />
      </FadeIn>
    </section>
  );
}
