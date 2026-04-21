import GalleryCarousel from "@/components/GalleryCarousel";
import FadeIn from "@/components/FadeIn";

type PlanGalleryItem = {
  title: string;
  price: string;
  unit: string;
  duration: string;
  schedule: string;
  rule: string;
  note: string;
  image: string;
  accent: string;
  href: string;
};

export default function HomePlansSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: PlanGalleryItem[];
}) {
  return (
    <section
      id="planes"
      className="relative overflow-hidden border-b border-border/70"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,133,161,0.18),transparent_55%)]" />
      <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,200,120,0.35),transparent_65%)] blur-2xl" />
      <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgba(0,133,161,0.25),transparent_60%)]" />
      <FadeIn className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14">
        <div className="flex max-w-2xl flex-col gap-5">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        </div>
        <GalleryCarousel items={items} />
      </FadeIn>
    </section>
  );
}
