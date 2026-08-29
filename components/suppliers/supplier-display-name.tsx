"use client";

import { Link2Off } from "lucide-react";

import {
  displaySupplierName,
  isSystemUnassignedSupplier,
  UNLINKED_SUPPLIER_DISPLAY_LABEL,
} from "@/lib/supplier-display";
import { cn } from "@/lib/utils";

type SupplierDisplayNameProps = {
  name?: string | null;
  code?: string | null;
  fallback?: string;
  className?: string;
  /** When true, always render the pill even for real supplier names (unused). */
  badge?: boolean;
};

/** Styled supplier title — pill for the synthetic unlinked bucket, plain text otherwise. */
export function SupplierDisplayName({
  name,
  code,
  fallback,
  className,
}: SupplierDisplayNameProps) {
  if (isSystemUnassignedSupplier({ name, code })) {
    return <UnlinkedSupplierBadge className={className} />;
  }
  return (
    <span className={className}>
      {displaySupplierName({ name, code, fallback })}
    </span>
  );
}

export function UnlinkedSupplierBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-dashed",
        "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)]",
        "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,transparent)]",
        "px-1.5 py-0.5 text-[11px] font-semibold leading-tight tracking-tight",
        "text-[color-mix(in_srgb,var(--order-ink,#15231f)_78%,var(--pos-primary,#0f766e))]",
        className,
      )}
    >
      <Link2Off className="size-3 shrink-0 opacity-75" aria-hidden />
      <span className="truncate">{UNLINKED_SUPPLIER_DISPLAY_LABEL}</span>
    </span>
  );
}
