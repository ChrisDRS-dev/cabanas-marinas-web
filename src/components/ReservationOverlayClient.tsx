"use client";

import { Suspense } from "react";
import ReservationOverlay from "@/components/ReservationOverlay";

export default function ReservationOverlayClient() {
  return (
    <Suspense fallback={null}>
      <ReservationOverlay />
    </Suspense>
  );
}
