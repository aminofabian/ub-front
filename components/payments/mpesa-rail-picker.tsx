"use client";

import { cn } from "@/lib/utils";

export type MpesaRailOption = {
  configId: string;
  gatewayType: string;
  label: string | null;
  displayName: string;
  isDefault?: boolean;
};

export function mpesaRailTitle(rail: MpesaRailOption): string {
  const label = rail.label?.trim();
  if (label) return label;
  if (rail.gatewayType === "CUSTODY_MPESA") return "Till / paybill";
  return rail.displayName || "M-Pesa";
}

export function mpesaRailHint(rail: MpesaRailOption): string {
  if (rail.gatewayType === "CUSTODY_MPESA") {
    return "Lipa Na M-Pesa to this till or paybill";
  }
  if (rail.gatewayType === "KOPOKOPO" || rail.gatewayType === "DARAJA") {
    return "Prompt lands on your shop till";
  }
  return rail.displayName || "M-Pesa prompt";
}

export function mpesaRailGlyph(rail: MpesaRailOption): string {
  if (rail.gatewayType === "CUSTODY_MPESA") return "C";
  if (rail.gatewayType === "KOPOKOPO") return "K";
  if (rail.gatewayType === "DARAJA") return "M";
  if (rail.gatewayType === "PESAPAL") return "P";
  return (rail.displayName || "M").slice(0, 1).toUpperCase();
}

export function pickDefaultMpesaRail(
  rails: MpesaRailOption[],
): MpesaRailOption | null {
  if (rails.length === 0) return null;
  return rails.find((r) => r.isDefault) ?? rails[0] ?? null;
}

/**
 * Sharp lane strip — cashier + storefront pick which STK / custody rail to prompt.
 * Hidden when there is only one rail (caller still uses that config id).
 */
export function MpesaRailPicker({
  rails,
  selectedConfigId,
  onSelect,
  disabled,
  compact,
  className,
}: {
  rails: MpesaRailOption[];
  selectedConfigId: string | null;
  onSelect: (configId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  if (rails.length <= 1) return null;

  return (
    <fieldset className={cn("space-y-1.5", className)} disabled={disabled}>
      <legend
        className={cn(
          "font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        Which M-Pesa lane?
      </legend>
      <div
        className={cn(
          "grid gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          rails.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
        )}
      >
        {rails.map((rail) => {
          const active = selectedConfigId === rail.configId;
          const custody = rail.gatewayType === "CUSTODY_MPESA";
          return (
            <button
              key={rail.configId}
              type="button"
              onClick={() => onSelect(rail.configId)}
              aria-pressed={active}
              className={cn(
                "flex min-h-[3.25rem] items-start gap-2 px-2.5 py-2 text-left transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? custody
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)]"
                    : "bg-[color-mix(in_srgb,#00a651_12%,white)]"
                  : "bg-white hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center border text-[10px] font-bold uppercase tracking-wide",
                  active
                    ? custody
                      ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,white)] text-[var(--pos-primary,#0f766e)]"
                      : "border-[#00a651] bg-[color-mix(in_srgb,#00a651_14%,white)] text-[#007a3d]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                )}
                aria-hidden
              >
                {mpesaRailGlyph(rail)}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block font-semibold tracking-[-0.02em]",
                    compact ? "text-[12px]" : "text-[13px]",
                    active
                      ? custody
                        ? "text-[var(--pos-primary,#0f766e)]"
                        : "text-[#007a3d]"
                      : "text-[var(--order-ink,#15231f)]",
                  )}
                >
                  {mpesaRailTitle(rail)}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {mpesaRailHint(rail)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
