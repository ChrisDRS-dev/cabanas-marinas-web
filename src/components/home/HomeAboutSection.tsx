import FadeIn from "@/components/FadeIn";

export default function HomeAboutSection({
  eyebrow,
  title,
  description,
  benefits,
}: {
  eyebrow: string;
  title: string;
  description: string;
  benefits: Array<{ title: string; description: string }>;
}) {
  return (
    <section id="conocer" className="mx-auto max-w-6xl px-6 py-10">
      <FadeIn className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.slice(0, 4).map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <h3 className="text-base font-semibold">{benefit.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
