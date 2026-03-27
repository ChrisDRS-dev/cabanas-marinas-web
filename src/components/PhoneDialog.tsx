"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const DIAL_COUNTRIES = [
  { code: "PA", flag: "🇵🇦", name: "Panamá",            dial: "+507", min: 8,  max: 8  },
  { code: "US", flag: "🇺🇸", name: "EE. UU. / Canadá", dial: "+1",   min: 10, max: 10 },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica",        dial: "+506", min: 8,  max: 8  },
  { code: "CO", flag: "🇨🇴", name: "Colombia",          dial: "+57",  min: 10, max: 10 },
  { code: "VE", flag: "🇻🇪", name: "Venezuela",         dial: "+58",  min: 10, max: 10 },
  { code: "MX", flag: "🇲🇽", name: "México",            dial: "+52",  min: 10, max: 10 },
  { code: "EC", flag: "🇪🇨", name: "Ecuador",           dial: "+593", min: 9,  max: 9  },
  { code: "DO", flag: "🇩🇴", name: "Rep. Dominicana",   dial: "+1",   min: 10, max: 10 },
  { code: "ES", flag: "🇪🇸", name: "España",            dial: "+34",  min: 9,  max: 9  },
  { code: "AR", flag: "🇦🇷", name: "Argentina",         dial: "+54",  min: 10, max: 10 },
  { code: "CL", flag: "🇨🇱", name: "Chile",             dial: "+56",  min: 9,  max: 9  },
  { code: "PE", flag: "🇵🇪", name: "Perú",              dial: "+51",  min: 9,  max: 9  },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (phone: string) => void;
  submitLabel?: string;
};

export default function PhoneDialog({
  open,
  onClose,
  onSaved,
  submitLabel = "Guardar",
}: Props) {
  const [dialCode, setDialCode] = useState("+507");
  const [localNumber, setLocalNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const selectedCountry =
    DIAL_COUNTRIES.find((c) => c.dial === dialCode) ?? DIAL_COUNTRIES[0];
  const localDigits = localNumber.replace(/\D/g, "");
  const isValid = localDigits.length >= selectedCountry.min;
  const previewNumber = localDigits.length > 0 ? `${dialCode} ${localDigits}` : null;

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    if (!localDigits) {
      setError("Ingresa tu número de teléfono.");
      return;
    }
    if (localDigits.length < selectedCountry.min) {
      setError(`El número para ${selectedCountry.name} debe tener ${selectedCountry.min} dígitos.`);
      return;
    }
    if (localDigits.length > selectedCountry.max) {
      setError(`El número para ${selectedCountry.name} no puede tener más de ${selectedCountry.max} dígitos.`);
      return;
    }
    const fullPhone = `${dialCode}${localDigits}`;
    try {
      setSaving(true);
      const response = await fetch("/api/profile/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error("No se pudo guardar el teléfono. Intenta de nuevo.");
      }
      const saved = result?.phone ?? fullPhone;
      setLocalNumber("");
      setDialCode("+507");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el teléfono.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 px-0 pb-0 sm:items-center sm:px-4 sm:py-6">
      <div className="w-full max-w-md rounded-t-[2rem] border border-border/70 bg-card px-6 pb-8 pt-6 shadow-2xl sm:rounded-3xl">
        {/* Drag handle – mobile */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />

        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Número de contacto
        </p>
        <h3 className="mt-1 text-xl font-semibold text-foreground">
          ¿Cuál es tu número?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo usaremos para coordinar tu llegada y confirmar la reserva por WhatsApp.
        </p>

        {/* Yappy notice */}
        <div className="mt-3 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-700 dark:text-sky-400">
          Si pagas con <span className="font-semibold">Yappy</span>, la solicitud de pago se enviará a este número.
        </div>

        {/* Country selector */}
        <div className="mt-5">
          <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
            País
          </label>
          <select
            value={`${selectedCountry.code}|${selectedCountry.dial}`}
            onChange={(e) => {
              const [, dial] = e.target.value.split("|");
              setDialCode(dial);
              setLocalNumber("");
              setError(null);
            }}
            disabled={saving}
            className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {DIAL_COUNTRIES.map((c) => (
              <option key={c.code} value={`${c.code}|${c.dial}`}>
                {c.flag}  {c.name} ({c.dial})
              </option>
            ))}
          </select>
        </div>

        {/* Local number input */}
        <div className="mt-3">
          <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">
            Número local ({selectedCountry.min} dígitos)
          </label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-2xl border border-border/70 bg-background/60 px-3 py-3 text-sm font-semibold text-muted-foreground">
              {dialCode}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={localNumber}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                if (raw.length <= selectedCountry.max) {
                  setLocalNumber(raw);
                  setError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) void handleSave();
              }}
              placeholder={"0".repeat(selectedCountry.min)}
              disabled={saving}
              maxLength={selectedCountry.max}
              className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-foreground tracking-wider placeholder:font-normal placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Preview */}
        {previewNumber && (
          <p className="mt-2 text-xs text-muted-foreground">
            Número completo:{" "}
            <span className="font-semibold text-foreground">{previewNumber}</span>
            {isValid && <span className="ml-2 text-emerald-500">✓</span>}
          </p>
        )}

        {/* Error */}
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            className="w-full rounded-full"
            onClick={() => void handleSave()}
            disabled={saving || !isValid}
          >
            {saving ? "Guardando..." : submitLabel}
          </Button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
