import FAQAccordion from "@/components/FAQAccordion";
import MapCard from "@/components/MapCard";
import NavbarMobile from "@/components/NavbarMobile";
import GalleryCarousel from "@/components/GalleryCarousel";
import ReservationOverlayClient from "@/components/ReservationOverlayClient";
import SupabaseSmokeTestClient from "@/components/SupabaseSmokeTestClient";
import { siteData } from "@/lib/siteData";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const {
    brand,
    about,
    benefits,
    plans,
    steps,
    gallery,
    activities,
    location,
    faq,
    finalCta,
  } = siteData;
  const planGallery = plans.map((plan, index) => ({
    title: plan.name,
    price: plan.price,
    unit: plan.unit,
    duration: plan.duration,
    schedule: plan.schedule,
    rule: plan.rule,
    note: plan.note,
    image: gallery[index]?.image ?? "",
    accent:
      gallery[index]?.accent ??
      "linear-gradient(135deg, #0085a1 0%, #7fd7e4 100%)",
    href: `/?reservar=1&package=${plan.id}`,
  }));

  return (
    <div className="bg-background text-foreground">
      <NavbarMobile brand={brand.name} />
      <main className="pb-28">
        <section
          id="planes"
          className="relative overflow-hidden border-b border-border/70"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,133,161,0.18),transparent_55%)]" />
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,200,120,0.35),transparent_65%)] blur-2xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgba(0,133,161,0.25),transparent_60%)]" />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14">
            <div className="flex max-w-2xl flex-col gap-5">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl lg:text-5xl">
                Planes de reserva
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Elige entre 4 horas, 8 horas o la experiencia especial de
                amanecer.
              </p>
            </div>
            <GalleryCarousel items={planGallery} />
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
                  className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl"
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

        <section id="actividades" className="mx-auto max-w-6xl px-6 py-14">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Actividades
              </p>
              <h2 className="font-display text-3xl font-semibold">
                Experiencias para tu grupo
              </h2>
              <p className="text-sm text-muted-foreground">
                Descubre opciones para disfrutar el mar y el descanso.
              </p>
            </div>
            <div className="gallery-scroll flex gap-4 overflow-x-auto pb-2 pt-1 lg:grid lg:grid-cols-3 lg:overflow-visible">
              {activities.map((activity) => (
                <div
                  key={activity.title}
                  className="min-w-[250px] flex-1 rounded-3xl border border-border/80 bg-card shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="h-40 overflow-hidden rounded-t-3xl">
                    <img
                      src={activity.image}
                      alt={activity.title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <h3 className="text-lg font-semibold">{activity.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
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
                Reserva en cuatro pasos
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-border/80 bg-card p-6 shadow-lg shadow-black/5 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Paso {index + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
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
                href="/?reservar=1"
                className="inline-flex items-center justify-center rounded-full bg-background px-8 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:brightness-105"
              >
                {finalCta.button}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <ReservationOverlayClient />
      </Suspense>
      <SupabaseSmokeTestClient />

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
