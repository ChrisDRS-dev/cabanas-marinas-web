import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import StickyCTA from "@/components/StickyCTA";
import AuthGate from "@/components/AuthGate";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();`,
          }}
        />
        <AuthProvider>
          {children}
          <StickyCTA
            primaryHref="/?reservar=1"
            primaryLabel="Mi reserva"
            secondaryHref="https://wa.me/50762811651"
            secondaryLabel="WhatsApp"
            instagramHref={INSTAGRAM_PROFILE_URL}
          />
          <AuthGate />
        </AuthProvider>
      </body>
    </html>
  );
}
