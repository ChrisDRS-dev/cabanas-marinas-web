import { Suspense } from "react";
import ResultadoContent from "@/app/reservar/pago/resultado/ResultadoContent";

export default function ResultadoPage() {
  return (
    <Suspense>
      <ResultadoContent />
    </Suspense>
  );
}
