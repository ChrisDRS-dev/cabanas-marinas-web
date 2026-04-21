"use client";

import { motion } from "motion/react";
import { useEffect, useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const LOCALES: AppLocale[] = ["es", "en"];

export default function LanguageSelector() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    LOCALES.filter((item) => item !== locale).forEach((item) => {
      router.prefetch(pathname, { locale: item });
    });
  }, [locale, pathname, router]);

  const handleChange = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;

    const navigate = () => {
      startTransition(() => {
        router.replace(pathname, { locale: nextLocale });
      });
    };

    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(() => {
        navigate();
      });
      return;
    }

    navigate();
  };

  return (
    <div
      aria-label="Language switcher"
      className="relative inline-flex items-center rounded-full border border-border/70 bg-background/80 p-1 shadow-sm backdrop-blur"
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
        className="absolute inset-y-1 rounded-full bg-foreground shadow-[0_10px_24px_rgba(10,12,18,0.12)]"
        style={{
          left: locale === "es" ? "0.25rem" : "calc(50% + 0.125rem)",
          width: "calc(50% - 0.375rem)",
        }}
      />
      {LOCALES.map((item) => {
        const active = item === locale;
        return (
          <motion.button
            key={item}
            type="button"
            onClick={() => handleChange(item)}
            disabled={isPending || active}
            whileTap={{ scale: active ? 1 : 0.96 }}
            className={`relative z-10 min-w-12 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 ${
              active
                ? "text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <motion.span
                animate={{
                  opacity: isPending && !active ? 0.72 : 1,
                  y: isPending && !active ? -0.5 : 0,
                }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {item}
              </motion.span>
              {isPending && !active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              ) : null}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
