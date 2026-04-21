"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { localizeHref, type AppLocale } from "@/i18n/routing";
import { siteData } from "@/lib/siteData";

function buildWhatsAppConfirmLink(reservationId: string, oper: string, totalPagado: string) {
  const lines = [
    "Hola, realicé mi pago con tarjeta y adjunto el comprobante para confirmar mi reserva.",
    reservationId ? `ID de reserva: ${reservationId}` : null,
    oper ? `Código de operación: ${oper}` : null,
    totalPagado ? `Monto pagado: $${totalPagado}` : null,
  ].filter(Boolean) as string[];

  return `${siteData.links.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export default function ResultadoContent() {
  const locale = useLocale() as AppLocale;
  const searchParams = useSearchParams();

  const estado = searchParams.get("Estado") ?? searchParams.get("estado") ?? "";
  const totalPagado = searchParams.get("TotalPagado") ?? searchParams.get("totalPagado") ?? "";
  const oper = searchParams.get("Oper") ?? searchParams.get("oper") ?? "";
  const reservationId = searchParams.get("PARM_1") ?? searchParams.get("parm_1") ?? "";
  const razon = searchParams.get("Razon") ?? searchParams.get("razon") ?? "";

  const isApproved = estado === "Aprobada";
  const isDenied = estado === "Denegada";

  if (!estado) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No encontramos el resultado del pago. Si completaste el pago, envíanos el comprobante por WhatsApp para confirmarlo.
        </p>
        <a
          href={siteData.links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white"
        >
          Escribir por WhatsApp
        </a>
        <Link
          href={localizeHref(locale, "/")}
          className="rounded-full border border-border px-6 py-2 text-sm font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (isApproved) {
    const whatsappLink = buildWhatsAppConfirmLink(reservationId, oper, totalPagado);

    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-6 py-16">
        {/* Estado del pago */}
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-6 text-center">
          <p className="text-3xl">✓</p>
          <h1 className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            Pago procesado
          </h1>
          {totalPagado && (
            <p className="mt-1 text-sm text-muted-foreground">
              Monto: <span className="font-semibold text-foreground">${totalPagado}</span>
            </p>
          )}
          {oper && (
            <p className="mt-1 text-xs text-muted-foreground">
              Código de operación: <span className="font-mono">{oper}</span>
            </p>
          )}
        </div>

        {/* ID de reserva */}
        {reservationId && (
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">ID de reserva</p>
            <p className="mt-1 select-all font-mono text-lg font-semibold text-foreground">
              {reservationId.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Guarda este código — lo necesitarás para identificar tu pago.
            </p>
          </div>
        )}

        {/* Instrucciones de confirmación manual */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            Último paso: envíanos el comprobante
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tu reserva quedará confirmada cuando nuestro equipo verifique el pago. Envíanos la captura de pantalla del comprobante por WhatsApp con el ID de reserva.
          </p>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"
        >
          Enviar comprobante por WhatsApp
        </a>

        <Link
          href={localizeHref(locale, "/")}
          className="w-full rounded-full border border-border px-4 py-2 text-center text-sm font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-6 py-16">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-6 text-center">
          <p className="text-3xl">✗</p>
          <h1 className="mt-2 text-2xl font-semibold text-rose-700 dark:text-rose-400">
            Pago no procesado
          </h1>
          {razon && (
            <p className="mt-2 text-sm text-muted-foreground">
              Razón: <span className="font-medium text-foreground">{razon}</span>
            </p>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Puedes intentar de nuevo o contactarnos por WhatsApp para coordinar otro método de pago.
        </p>

        <div className="flex flex-col gap-2">
          {reservationId && (
            <Link
              href={localizeHref(locale, `/reservar/pago?method=CARD&rid=${reservationId}`)}
              className="w-full rounded-full bg-foreground px-4 py-2 text-center text-sm font-semibold text-background"
            >
              Intentar de nuevo
            </Link>
          )}
          <a
            href={siteData.links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Contactar por WhatsApp
          </a>
          <Link
            href={localizeHref(locale, "/")}
            className="w-full rounded-full border border-border px-4 py-2 text-center text-sm font-semibold"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
