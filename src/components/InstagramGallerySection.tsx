import CircularGallery from "@/components/CircularGallery";
import FadeIn from "@/components/FadeIn";
import type { InstagramGalleryItem } from "@/lib/instagram";

type InstagramGallerySectionProps = {
  items: InstagramGalleryItem[];
  profileUrl: string;
};

export default function InstagramGallerySection({
  items,
  profileUrl,
}: InstagramGallerySectionProps) {
  return (
    <section id="instagram" className="mx-auto max-w-6xl px-6 py-16">
      <FadeIn className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Contenido social
          </p>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Lo más reciente en Instagram
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Un vistazo rápido a fotos y videos recientes de Cabañas Marinas. Cada tarjeta abre el post real en Instagram.
          </p>
        </div>

        <CircularGallery
          items={items}
          bend={14}
          textColor="#ffffff"
          borderRadius={0.18}
          scrollSpeed={5200}
          scrollEase={0.05}
        />

        <div className="flex justify-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-lg shadow-black/5 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f58529,#feda77,#dd2a7b,#8134af,#515bd4)] text-white">
              IG
            </span>
            Síguenos en Instagram
          </a>
        </div>
      </FadeIn>
    </section>
  );
}
