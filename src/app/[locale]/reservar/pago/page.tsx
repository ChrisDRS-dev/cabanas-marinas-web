import { Suspense } from "react";
import PaymentConfirmation from "@/components/PaymentConfirmation";

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense>
        <PaymentConfirmation />
      </Suspense>
    </main>
  );
}
