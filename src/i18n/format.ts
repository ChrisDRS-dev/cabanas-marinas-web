import type { AppLocale } from "@/i18n/routing";

export function getDateLocale(locale: AppLocale) {
  return locale === "es" ? "es-PA" : "en-US";
}

export function getMonthLocale(locale: AppLocale) {
  return locale === "es" ? "es-ES" : "en-US";
}
