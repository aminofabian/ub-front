"use client";

import {
  CreditCard,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";

import { GatewayStatusBadge } from "@/components/payments/gateway-status-badge";
import { PaymentBrandMark } from "@/components/payments/payment-brand-mark";
import { Button } from "@/components/ui/button";
import type {
  AvailableGatewayRecord,
  GatewayConfigRecord,
  MpesaCustodyAvailabilityRecord,
} from "@/lib/api";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function isManualGateway(config: GatewayConfigRecord) {
  return config.gatewayType === "MANUAL";
}

export function isCustodyMpesaGateway(config: GatewayConfigRecord) {
  return config.gatewayType === "CUSTODY_MPESA";
}

export function custodyProviderLabel(provider: string | null | undefined) {
  if (provider === "KOPOKOPO") return "KopoKopo";
  if (provider === "DARAJA") return "Daraja";
  return null;
}

export function gatewayDisplayName(
  config: GatewayConfigRecord,
  available: AvailableGatewayRecord[],
) {
  if (isManualGateway(config)) {
    return "Manual payment";
  }
  if (isCustodyMpesaGateway(config)) {
    return "Lipa Na M-Pesa (till / paybill)";
  }
  return (
    available.find((a) => a.gatewayType === config.gatewayType)?.displayName ??
    config.gatewayType
  );
}

export function gatewayGlyph(type: string) {
  if (type === "KOPOKOPO") return "K";
  if (type === "MPESA_STK" || type === "SAFARICOM" || type === "DARAJA") return "M";
  if (type === "PAYSTACK") return "P";
  if (type === "MANUAL") return "T";
  if (type === "CUSTODY_MPESA") return "C";
  return type.slice(0, 1).toUpperCase() || "?";
}

export type AcceptPaymentsPanelProps = {
  loading: boolean;
  configs: GatewayConfigRecord[];
  available: AvailableGatewayRecord[];
  canWrite: boolean;
  rowBusyId: string | null;
  kopokopoNeedsAttention: boolean;
  /** Live platform custody readiness for CUSTODY_MPESA rows. */
  custodyAvailability?: MpesaCustodyAvailabilityRecord | null;
  onAddMethod: () => void;
  onEdit: (config: GatewayConfigRecord) => void;
  onManage: (config: GatewayConfigRecord) => void;
  compact?: boolean;
};

export function AcceptPaymentsPanel({
  loading,
  configs,
  available,
  canWrite,
  rowBusyId,
  kopokopoNeedsAttention,
  custodyAvailability = null,
  onAddMethod,
  onEdit,
  onManage,
  compact = false,
}: AcceptPaymentsPanelProps) {
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact ? (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          API gateways need a successful connection test before activation. Manual
          till / paybill methods go live immediately.
        </p>
      ) : null}

      {kopokopoNeedsAttention ? (
        <div
          role="status"
          className="border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2.5 text-[12px] text-[#9a2e16]"
        >
          <p className="font-semibold">KopoKopo is not active yet</p>
          <p className="mt-1 leading-relaxed opacity-90">
            Open <strong>Manage</strong> on the KopoKopo row → <strong>Test</strong>{" "}
            → <strong>Activate</strong> → <strong>Till webhooks</strong>.
          </p>
        </div>
      ) : null}

      {canWrite ? (
        <Button
          type="button"
          size="sm"
          className="h-8 w-full gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] text-white shadow-none hover:bg-[#0d6b63] sm:w-auto"
          onClick={onAddMethod}
        >
          <Plus className="size-4" aria-hidden />
          Add method
        </Button>
      ) : null}

      {loading ? (
        <div
          className={cn(
            HUB_SURFACE,
            "flex items-center gap-2 px-4 py-8 text-[13px] text-[#666666]",
          )}
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading payment methods…
        </div>
      ) : configs.length === 0 ? (
        <div className={cn(HUB_SURFACE, "border-dashed px-4 py-10 text-center")}>
          <span className="mx-auto flex size-10 items-center justify-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white text-[var(--pos-primary,#0f766e)]">
            <CreditCard className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-[14px] font-semibold tracking-[-0.015em] text-[#141414]">
            No payment methods yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-[#666666]">
            {canWrite
              ? "Add KopoKopo for M-Pesa STK and supplier Send Money, or a till / paybill."
              : "Ask an admin to connect a payment gateway."}
          </p>
        </div>
      ) : (
        <ul
          className={cn(
            HUB_SURFACE,
            "divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
          )}
        >
          {configs.map((config) => {
            const busy = rowBusyId === config.id;
            const name = gatewayDisplayName(config, available);
            const custody = isCustodyMpesaGateway(config);
            return (
              <li
                key={config.id}
                className={cn(
                  "flex flex-col gap-2.5 px-3 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  custody &&
                    "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]",
                )}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {custody ? (
                    <span
                      className="mt-0.5 grid size-7 shrink-0 place-items-center border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[10px] font-bold uppercase tracking-wide text-[var(--pos-primary,#0f766e)]"
                      aria-hidden
                    >
                      C
                    </span>
                  ) : (
                    <PaymentBrandMark
                      gatewayType={config.gatewayType}
                      displayName={name}
                      logoUrl={
                        available.find((a) => a.gatewayType === config.gatewayType)
                          ?.logoUrl
                      }
                      glyph={gatewayGlyph(config.gatewayType)}
                      size="md"
                      className="mt-0.5"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-foreground">
                        {config.label}
                      </p>
                      <GatewayStatusBadge status={config.status} />
                      {custody ? (
                        <span className="border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
                          PIN prompt
                          {custodyProviderLabel(config.custodyProvider)
                            ? ` · ${custodyProviderLabel(config.custodyProvider)}`
                            : ""}
                        </span>
                      ) : null}
                      {custody && custodyAvailability ? (
                        <span
                          title={custodyAvailability.message ?? undefined}
                          className={cn(
                            "border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                            custodyAvailability.available
                              ? "border-[#007a3d]/40 text-[#007a3d]"
                              : "border-destructive/40 text-destructive",
                          )}
                        >
                          {custodyAvailability.available
                            ? "Kiosk rail ready"
                            : "Kiosk rail off"}
                        </span>
                      ) : null}
                      {config.isDefault ? (
                        <span className="border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {name}
                      {config.lastTestedAt
                        ? ` · Tested ${new Date(config.lastTestedAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {canWrite ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-none shadow-none"
                      disabled={busy}
                      onClick={() => void onEdit(config)}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] text-white shadow-none hover:bg-[#0d6b63]"
                    disabled={busy}
                    onClick={() => onManage(config)}
                  >
                    <MoreHorizontal className="size-3.5" aria-hidden />
                    Manage
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
