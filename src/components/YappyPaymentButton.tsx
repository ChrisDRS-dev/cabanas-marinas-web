"use client";

const YAPPY_STATIC_LINK =
  "https://link.yappy.com.pa/stc/GXqG1kCpTLfAbMHmc7E9nxSk16Vdr9BZvaim7nGhYrA%3D";

type Props = {
  reservationId?: string | null;
  disabled?: boolean;
  blockedReason?: string | null;
  onPaymentStarted?: () => void;
};

export default function YappyPaymentButton({ disabled = false }: Props) {
  return (
    <a
      href={disabled ? undefined : YAPPY_STATIC_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      className={[
        "flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors",
        disabled
          ? "pointer-events-none cursor-not-allowed bg-muted text-muted-foreground opacity-60"
          : "bg-[#00ADEF] text-white hover:bg-[#0099d6] active:bg-[#0088c0]",
      ].join(" ")}
    >
      Pagar con Yappy
    </a>
  );
}
