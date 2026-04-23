import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isAppLocale } from '@/i18n/routing';
import "../globals.css";
import "leaflet/dist/leaflet.css";
import StickyCTA from "@/components/StickyCTA";
import AuthProvider from "@/components/AuthProvider";
import { INSTAGRAM_PROFILE_URL } from "@/lib/instagram-embeds";

export const metadata: Metadata = {
  title: "Cabañas Marinas | Cabañas frente al mar",
  description:
    "Cabañas frente al mar para desconectarte de verdad. Reservas por horas o día completo.",
  icons: {
    icon: "/logo/favicon-logo.png",
    shortcut: "/logo/favicon-logo.png",
    apple: "/logo/favicon-logo.png",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem("theme");
    const theme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();`,
          }}
        />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            {children}
            <StickyCTA
              primaryHref="/?reservar=1"
              secondaryHref="https://wa.me/50762811651"
              instagramHref={INSTAGRAM_PROFILE_URL}
            />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
