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
  if (rail.gatewayType === "KOPOKOPO") return "KopoKopo";
  if (rail.gatewayType === "DARAJA") return "Daraja";
  return rail.displayName || "M-Pesa";
}

export function mpesaRailHint(rail: MpesaRailOption): string {
  if (rail.gatewayType === "CUSTODY_MPESA") {
    return "M-Pesa Express · till on Kiosk HO · PIN only · no B2B";
  }
  if (rail.gatewayType === "KOPOKOPO") {
    return "Your KopoKopo till · money lands on your till";
  }
  if (rail.gatewayType === "DARAJA") {
    return "Your Daraja shortcode · money lands on your till";
  }
  return rail.displayName || "M-Pesa prompt";
}

export function mpesaRailGlyph(rail: MpesaRailOption): string {
  if (rail.gatewayType === "CUSTODY_MPESA") return "T";
  if (rail.gatewayType === "KOPOKOPO") return "K";
  if (rail.gatewayType === "DARAJA") return "D";
  if (rail.gatewayType === "PESAPAL") return "P";
  return (rail.displayName || "M").slice(0, 1).toUpperCase();
}

export function pickDefaultMpesaRail(
  rails: MpesaRailOption[],
): MpesaRailOption | null {
  if (rails.length === 0) return null;
  return rails.find((r) => r.isDefault) ?? rails[0] ?? null;
}

function RailTile({
  rail,
  active,
  onSelect,
  disabled,
  compact,
  interactive,
}: {
  rail: MpesaRailOption;
  active: boolean;
  onSelect?: (configId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  interactive: boolean;
}) {
  const custody = rail.gatewayType === "CUSTODY_MPESA";
  const body = (
    <>
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
    </>
  );

  if (!interactive) {
    return (
      <div
        className={cn(
          "flex min-h-[3.25rem] items-start gap-2 px-2.5 py-2",
          active
            ? custody
              ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)]"
              : "bg-[color-mix(in_srgb,#00a651_12%,white)]"
            : "bg-white",
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(rail.configId)}
      aria-pressed={active}
      disabled={disabled}
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
      {body}
    </button>
  );
}

/**
 * Cashier / storefront STK lane chooser.
 * Always shows the active lane (even when there is only one) so the till
 * operator knows whether this is KopoKopo, Daraja BYO, or till/paybill.
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
  if (rails.length === 0) return null;

  const selectable = rails.length > 1;
  const selected =
    rails.find((r) => r.configId === selectedConfigId) ?? rails[0]!;

  return (
    <fieldset className={cn("space-y-1.5", className)} disabled={disabled}>
      <legend
        className={cn(
          "font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {selectable ? "Which M-Pesa lane?" : "Sending via"}
      </legend>
      <div
        className={cn(
          "grid gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          selectable
            ? rails.length === 2
              ? "grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-1",
        )}
      >
        {selectable
          ? rails.map((rail) => (
              <RailTile
                key={rail.configId}
                rail={rail}
                active={selected.configId === rail.configId}
                onSelect={onSelect}
                disabled={disabled}
                compact={compact}
                interactive
              />
            ))
          : (
              <RailTile
                rail={selected}
                active
                compact={compact}
                interactive={false}
              />
            )}
      </div>
    </fieldset>
  );
}
