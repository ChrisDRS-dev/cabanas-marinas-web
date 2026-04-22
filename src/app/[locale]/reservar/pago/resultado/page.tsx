import { Suspense } from "react";
import ResultadoContent from "./ResultadoContent";

export default function ResultadoPage() {
  return (
    <Suspense>
      <ResultadoContent />
    </Suspense>
  );
}
