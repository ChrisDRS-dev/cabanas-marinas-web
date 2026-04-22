import { Suspense } from "react";
import ReservationPageGate from "@/components/ReservationPageGate";
import { getTranslations, setRequestLocale } from "next-intl/server";
import NavbarMobile from "@/components/NavbarMobile";

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "booking.page" });
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarMobile brand={common("brand")} />
      <main>
        <section className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(0,133,161,0.12),transparent_42%),radial-gradient(circle_at_top_right,rgba(255,179,71,0.18),transparent_36%)]">
          <div className="mx-auto max-w-3xl px-6 pb-8 pt-10">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("description")}
            </p>
          </div>
        </section>

        <Suspense>
          <ReservationPageGate />
        </Suspense>
      </main>
    </div>
  );
}
