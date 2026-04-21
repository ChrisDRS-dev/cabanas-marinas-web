"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTranslations } from "next-intl";

type ThemeMode = "light" | "dark";
const DEFAULT_THEME: ThemeMode = "dark";

function getThemeSnapshot(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem("theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;
  return DEFAULT_THEME;
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener("cm:theme-change", handleChange);
  mediaQuery.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("cm:theme-change", handleChange);
    mediaQuery.removeEventListener("change", handleChange);
  };
}

export default function ThemeToggle() {
  const t = useTranslations("common");
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    () => DEFAULT_THEME
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        window.localStorage.setItem("theme", nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        window.dispatchEvent(new Event("cm:theme-change"));
      }}
      aria-label={t("themeToggle")}
      title={theme === "dark" ? t("themeToLight") : t("themeToDark")}
      className="group flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <SunMedium
          className={`absolute h-5 w-5 transition-all duration-300 ${
            theme === "dark"
              ? "scale-75 rotate-45 opacity-0"
              : "scale-100 rotate-0 opacity-100"
          }`}
        />
        <MoonStar
          className={`absolute h-5 w-5 transition-all duration-300 ${
            theme === "dark"
              ? "scale-100 rotate-0 opacity-100"
              : "scale-75 -rotate-45 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
