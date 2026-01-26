"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReservationWizard from "@/components/reservar/ReservationWizard";

export default function ReservationOverlay() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const show =
    pathname === "/" &&
    (searchParams.get("reservar") === "1" ||
      searchParams.get("reservar") === "true");

  useEffect(() => {
    if (!show) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [show]);

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("reservar");
    params.delete("package");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/");
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={handleClose}
    >
      <div
        className="glass-panel relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-none sm:h-[90vh] sm:rounded-[2.25rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80 text-lg font-semibold text-foreground shadow-sm transition hover:brightness-105"
        >
          ×
        </button>
        <div className="h-full overflow-y-auto">
          <ReservationWizard mode="modal" />
        </div>
      </div>
    </div>
  );
}
