import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import NavbarMobile from "@/components/NavbarMobile";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";

type HomeMessages = {
  reviews: {
    modalTitle: string;
    modalDescription: string;
  };
};

export default async function ReviewsFormPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const common = await getTranslations({ locale, namespace: "common" });
  const reviewsT = await getTranslations({ locale, namespace: "reviews" });
  const messages = await getMessages({ locale });
  const home = messages.home as unknown as HomeMessages;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavbarMobile brand={common("brand")} />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <ReviewSubmissionForm
          eyebrow={reviewsT("guestComment")}
          title={home.reviews.modalTitle}
          description={home.reviews.modalDescription}
        />
      </main>
    </div>
  );
}
