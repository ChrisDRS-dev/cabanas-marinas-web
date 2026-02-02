"use client";

import type { ReactNode } from "react";
import useReserveAction from "@/hooks/useReserveAction";

type ReserveButtonProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export default function ReserveButton({
  href,
  className,
  children,
}: ReserveButtonProps) {
  const reserve = useReserveAction();

  return (
    <button
      type="button"
      onClick={() => void reserve(href)}
      className={className}
    >
      {children}
    </button>
  );
}
