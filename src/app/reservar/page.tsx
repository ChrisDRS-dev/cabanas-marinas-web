import { Suspense } from "react";
import ReservationWizard from "@/components/reservar/ReservationWizard";

export default function ReservarPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(0,133,161,0.12),transparent_42%),radial-gradient(circle_at_top_right,rgba(255,179,71,0.18),transparent_36%)]">
        <div className="mx-auto max-w-3xl px-6 pb-8 pt-10">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Reserva online
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Elige tu fecha, horario y plan en un solo flujo
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Esta vista está enfocada solo en reservar. Si ya tienes una reserva
            pendiente o necesitas seguimiento, aún puedes volver al inicio para
            ver su estado.
          </p>
        </div>
      </section>

      <Suspense>
        <ReservationWizard mode="page" />
      </Suspense>
    </main>
  );
}
