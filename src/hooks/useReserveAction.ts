"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function useReserveAction() {
  const router = useRouter();
  const { requireAuthFor } = useAuth();

  return async (href: string) => {
    const allowed = await requireAuthFor(href);
    if (allowed) {
      router.push(href);
    }
  };
}
