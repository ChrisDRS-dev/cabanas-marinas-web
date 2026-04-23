import { Suspense } from "react";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import FAQAccordionWrapper from "@/components/FAQAccordionWrapper";
import FadeIn from "@/components/FadeIn";
import HomeAboutSection from "@/components/home/HomeAboutSection";
import HomeActivitiesSection from "@/components/home/HomeActivitiesSection";
import HomePlansSection from "@/components/home/HomePlansSection";
import InstagramGallerySection from "@/components/InstagramGallerySection";
import MapCard from "@/components/MapCard";
import NavbarMobile from "@/components/NavbarMobile";
import ReservationOverlayClient from "@/components/ReservationOverlayClient";
import ReserveButton from "@/components/ReserveButton";
import ReviewsSection from "@/components/ReviewsSection";
import { type AppLocale, localizeHref } from "@/i18n/routing";
import { instagramEmbedPosts, INSTAGRAM_PROFILE_URL } from "@/lib/instagram-embeds";
import { mapApprovedReviews } from "@/lib/reviews";
import { siteData } from "@/lib/siteData";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 300;

type HomeMessages = {
  sections: {
    plansTitle: string;
    plansSubtitle: string;
    activitiesEyebrow: string;
    activitiesTitle: string;
    activitiesSubtitle: string;
    aboutEyebrow: string;
    finalEyebrow: string;
    faqEyebrow: string;
    faqTitle: string;
    footerPlans: string;
    footerLocation: string;
    footerFaq: string;
  };
  about: {
    title: string;
    description: string;
  };
  benefits: Array<{ title: string; description: string }>;
  plans: Array<{
    id: string;
    name: string;
    price: string;
    unit: string;
    duration: string;
    rule: string;
    schedule: string;
    note: string;
  }>;
  activities: Array<{ title: string; description: string }>;
  location: {
    title: string;
    description: string;
  };
  faq: Array<{ question: string; answer: string }>;
  reviews: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    modalTitle: string;
    modalDescription: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  finalCta: {
    title: string;
    button: string;
  };
};

async function loadHomeContent(locale: AppLocale) {
  const messages = await getMessages({ locale });
  const home = messages.home as unknown as HomeMessages;
  const supabase = supabasePublic();
  const reviewsResult = await supabase
    .from("reviews")
    .select(
      "id, rating, comment, stay_label, is_anonymous, display_name, guest_name, created_at, review_photos(id, public_url, sort_order, created_at)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);

  return {
    home,
    about: home.about,
    benefits: home.benefits,
    plans: home.plans,
    activities: home.activities.map((activity, index) => ({
      ...activity,
      image: siteData.activities[index]?.image ?? siteData.activities[0]?.image ?? "",
    })),
    location: {
      title: home.location.title,
      description: home.location.description,
      mapsUrl: siteData.location.mapsUrl,
      latitude: siteData.location.latitude,
      longitude: siteData.location.longitude,
    },
    faq: home.faq,
    reviews: home.reviews,
    finalCta: home.finalCta,
    approvedReviews: mapApprovedReviews(reviewsResult.data ?? []),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const common = await getTranslations({ locale, namespace: "common" });
  const {
    home,
    about,
    benefits,
    plans,
    activities,
    location,
    faq,
    reviews,
    finalCta,
    approvedReviews,
  } = await loadHomeContent(locale as AppLocale);

  const planGallery = plans.map((plan, index) => ({
    title: plan.name,
    price: plan.price,
    unit: plan.unit,
    duration: plan.duration,
    schedule: plan.schedule,
    rule: plan.rule,
    note: plan.note,
    image: siteData.gallery[index]?.image ?? "",
    accent:
      siteData.gallery[index]?.accent ??
      "linear-gradient(135deg, #0085a1 0%, #7fd7e4 100%)",
    href: localizeHref(locale as AppLocale, `/reservar?package=${plan.id}`),
  }));

  return (
    <div className="bg-background text-foreground">
      <NavbarMobile brand={common("brand")} />
      <main className="pb-28">
        <HomePlansSection
          title={home.sections.plansTitle}
          subtitle={home.sections.plansSubtitle}
          items={planGallery}
        />

        <HomeActivitiesSection
          eyebrow={home.sections.activitiesEyebrow}
          title={home.sections.activitiesTitle}
          subtitle={home.sections.activitiesSubtitle}
          activities={activities}
        />

        <ReviewsSection reviews={approvedReviews} content={reviews} />

        <InstagramGallerySection
          items={instagramEmbedPosts}
          profileUrl={INSTAGRAM_PROFILE_URL}
        />

        <section id="ubicacion" className="mx-auto max-w-6xl px-6 py-14">
          <FadeIn>
            <MapCard {...location} />
          </FadeIn>
        </section>

        <HomeAboutSection
          eyebrow={home.sections.aboutEyebrow}
          title={about.title}
          description={about.description}
          benefits={benefits}
        />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <FadeIn>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary px-6 py-12 text-primary-foreground shadow-xl shadow-primary/30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
              <div className="relative space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/70">
                  {home.sections.finalEyebrow}
                </p>
                <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                  {finalCta.title}
                </h2>
                <ReserveButton
                  href="/reservar"
                  className="inline-flex items-center justify-center rounded-full bg-background px-8 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:brightness-105"
                >
                  {finalCta.button}
                </ReserveButton>
              </div>
            </div>
          </FadeIn>
        </section>

        <section id="faq" className="mx-auto max-w-4xl px-6 pt-14 pb-20">
          <FadeIn>
            <div className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {home.sections.faqEyebrow}
              </p>
              <h2 className="font-display text-3xl font-semibold">
                {home.sections.faqTitle}
              </h2>
            </div>
            <div className="mt-8">
              <FAQAccordionWrapper items={faq} />
            </div>
          </FadeIn>
        </section>
      </main>

      <Suspense fallback={null}>
        <ReservationOverlayClient />
      </Suspense>

      <footer className="border-t border-border/70 bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{common("brand")}</p>
          </div>
          <div className="flex gap-4">
            <a href="#planes" className="hover:text-foreground">
              {home.sections.footerPlans}
            </a>
            <a href="#ubicacion" className="hover:text-foreground">
              {home.sections.footerLocation}
            </a>
            <a href="#faq" className="hover:text-foreground">
              {home.sections.footerFaq}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
