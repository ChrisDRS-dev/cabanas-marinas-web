import FAQAccordion from "@/components/FAQAccordion";
import InfoChips from "@/components/InfoChips";
import MapCard from "@/components/MapCard";
import NavbarMobile from "@/components/NavbarMobile";
import PlanCard from "@/components/PlanCard";
import { siteData } from "@/lib/siteData";

export default function HomePage() {
  const {
    brand,
    infoChips,
    about,
    benefits,
    plans,
    planNotes,
    steps,
    gallery,
    location,
    faq,
    finalCta,
  } = siteData;

  return (
    <div className="bg-background text-foreground">
      <NavbarMobile
        brand={brand.name}
        primaryHref="/reservar"
        primaryLabel="Reservar"
      />
      <main className="pb-28">
        <section
          id="galeria"
          className="relative overflow-hidden border-b border-border/70"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,133,161,0.18),transparent_55%)]" />
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,200,120,0.35),transparent_65%)] blur-2xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgba(0,133,161,0.25),transparent_60%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="flex flex-col gap-5">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Galeria
              </p>
              <h1 className="font-display text-3xl font-semibold sm:text-4xl lg:text-5xl">
                {brand.headline}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                {brand.subtitle}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/reservar"
                  className="rounded-full bg-primary px-5 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-105"
                >
                  Reservar ahora
                </a>
                <a
                  href="#planes"
                  className="rounded-full border border-border bg-background/70 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-foreground backdrop-blur transition hover:bg-secondary"
                >
                  Ver planes
                </a>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  Check-in flexible
                </span>
                <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  Vista al mar
                </span>
                <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">
                  Pago seguro
                </span>
              </div>
            </div>
            <div className="gallery-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scroll-smooth">
              {gallery.map((item) => (
                <div
                  key={item.title}
                  className="relative min-w-[78%] snap-center overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-black/5 sm:min-w-[48%] lg:min-w-[34%]"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: item.image ? `url(${item.image})` : "",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{ background: item.accent }}
                  />
                  <div className="relative space-y-3 text-white">
                    <h2 className="font-display text-2xl font-semibold">
                      {item.title}
                    </h2>
                    <p className="text-sm text-white/85">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Paquetes y horarios
              </p>
              <h2 className="font-display text-3xl font-semibold">
                Planes claros, decisiones rapidas
              </h2>
              <p className="text-sm text-muted-foreground">
                Elige entre 4 horas, 8 horas o la experiencia especial de
                amanecer.
              </p>
            </div>
            <a
              href="/reservar"
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:bg-secondary"
            >
              Ver detalles y reservar
            </a>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <a
                key={plan.name}
                href={`/reservar?package=${plan.id}`}
                className="transition hover:-translate-y-1"
              >
                <PlanCard {...plan} />
              </a>
            ))}
          </div>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {planNotes.slice(0, 2).map((note) => (
              <p key={note}>- {note}</p>
            ))}
          </div>
          <div className="mt-6">
            <InfoChips items={infoChips} />
          </div>
        </section>

        <section id="conocer" className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Conoce el lugar
              </p>
              <h2 className="font-display text-3xl font-semibold">
                {about.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {about.description}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.slice(0, 4).map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-3xl border border-border bg-card/80 p-5 shadow-lg shadow-black/5"
                >
                  <h3 className="text-base font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="mx-auto max-w-6xl px-6 py-14"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Como funciona
              </p>
              <h2 className="font-display text-3xl font-semibold">
                Reserva en tres pasos
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/5"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Paso {index + 1}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ubicacion" className="mx-auto max-w-6xl px-6 py-14">
          <MapCard {...location} />
        </section>

        <section id="faq" className="mx-auto max-w-4xl px-6 py-14">
          <div className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Preguntas rapidas
            </p>
            <h2 className="font-display text-3xl font-semibold">
              Todo lo esencial antes de reservar
            </h2>
          </div>
          <div className="mt-8">
            <FAQAccordion items={faq} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary px-6 py-12 text-primary-foreground shadow-xl shadow-primary/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/70">
                Listo para reservar
              </p>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                {finalCta.title}
              </h2>
              <a
                href="/reservar"
                className="inline-flex items-center justify-center rounded-full bg-background px-6 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:brightness-105"
              >
                {finalCta.button}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{brand.name}</p>
            <p>Horario general: 8:00 a.m. - 10:00 p.m.</p>
          </div>
          <div className="flex gap-4">
            <a href="#planes" className="hover:text-foreground">
              Planes
            </a>
            <a href="#ubicacion" className="hover:text-foreground">
              Ubicacion
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
