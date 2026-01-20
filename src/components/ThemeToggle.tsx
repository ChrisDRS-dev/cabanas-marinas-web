"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("theme") as ThemeMode | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const nextTheme = getInitialTheme();
    setTheme(nextTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme, mounted]);
  }, [theme, mounted]);

  return (
    <Switch
      checked={theme === "dark"}
      onCheckedChange={(checked) =>
        setTheme(checked ? "dark" : "light")
      }
      aria-label="Cambiar tema"
      className="h-5 w-9"
    />
  );
}
