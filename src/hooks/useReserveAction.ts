"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { localizeHref, type AppLocale } from "@/i18n/routing";

export default function useReserveAction() {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const { requireAuthFor } = useAuth();

  return async (href: string) => {
    const localizedHref = localizeHref(locale, href);
    const allowed = await requireAuthFor(localizedHref);
    if (allowed) {
      router.push(localizedHref);
    }
  };
}
