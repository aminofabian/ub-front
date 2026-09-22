"use client";

import { ArrowRight, Landmark, Loader2, Smartphone, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { FormDrawer } from "@/components/form-drawer";
import {
  ReceiveMpesaFlow,
  receiveInitialFromCustodyJson,
} from "@/components/payments/receive-mpesa-flow";
import {
  fetchGatewayConfigs,
  fetchMpesaCustodyAvailability,
  type GatewayConfigRecord,
} from "@/lib/api";
import {
  HUB_ACCENT,
  HUB_MUTED,
  HUB_SURFACE,
} from "@/lib/business-hub/constants";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Props = {
  ownerPhone?: string | null;
  countryCode?: string | null;
  permissions?: string[] | null;
  /** Compact strip for empty-shop boards */
  compact?: boolean;
};

const METHOD_CHIPS = ["Till", "Paybill", "Bank"] as const;

/**
 * Business hub card: show current M-Pesa landing spot + open guided setup
 * to add or update till / paybill / bank.
 */
export function ReceiveMpesaSetupCard({
  ownerPhone,
  countryCode,
  permissions,
  compact = false,
}: Props) {
  const canWrite = hasPermission(
    permissions ?? undefined,
    Permission.PaymentsGatewaysWrite,
  );
  const canRead = hasPermission(
    permissions ?? undefined,
    Permission.PaymentsGatewaysRead,
  );

  const [loading, setLoading] = useState(true);
  const [custody, setCustody] = useState<GatewayConfigRecord | null>(null);
  const [available, setAvailable] = useState(true);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!canRead && !canWrite) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, avail] = await Promise.all([
        fetchGatewayConfigs().catch(() => [] as GatewayConfigRecord[]),
        fetchMpesaCustodyAvailability().catch(() => null),
      ]);
      const row =
        list.find((c) => c.gatewayType === "CUSTODY_MPESA") ?? null;
      setCustody(row);
      setAvailable(avail?.available !== false);
    } finally {
      setLoading(false);
    }
  }, [canRead, canWrite]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!canWrite && !canRead) return null;

  const summary = custodySummary(custody);
  const configured = Boolean(custody);
  const needsSetup = !loading && !configured;
  const initial = receiveInitialFromCustodyJson(
    custody?.displayInstructionsJson,
    custody?.label,
  );

  return (
    <>
      <section
        aria-label="Payment method — where customers pay"
        className={cn(
          HUB_SURFACE,
          "text-left",
          needsSetup &&
            "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_32%,transparent)] border-l-[3px] border-l-[var(--pos-primary,#0f766e)]",
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            compact ? "items-center p-3 sm:p-3.5" : "items-start p-4 sm:p-5",
          )}
        >
          <span
            className={cn(
              "grid shrink-0 place-items-center border text-[var(--pos-primary,#0f766e)]",
              needsSetup
                ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)]"
                : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]",
              compact ? "size-10" : "size-11",
            )}
            aria-hidden
          >
            {summary.icon === "bank" ? (
              <Landmark className="size-4" />
            ) : summary.icon === "phone" ? (
              <Smartphone className="size-4" />
            ) : (
              <Store className="size-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pos-primary,#0f766e)]">
                Payment method
              </p>
              {needsSetup ? (
                <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--pos-primary,#0f766e)]">
                  Required
                </span>
              ) : null}
              {!loading && configured ? (
                <span className="inline-flex items-center border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-[#F7F7F5] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[color-mix(in_srgb,#141414_62%,transparent)]">
                  Active
                </span>
              ) : null}
            </div>

            {loading ? (
              <p className={cn("mt-1 flex items-center gap-2 text-[13px]", HUB_MUTED)}>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Checking…
              </p>
            ) : configured ? (
              <>
                <p className="mt-1 text-[12px] font-medium text-[color-mix(in_srgb,#141414_55%,transparent)]">
                  Customers pay to
                </p>
                <p className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
                  {summary.title}
                </p>
                {summary.detail ? (
                  <p className={cn("mt-0.5 truncate text-[12px]", HUB_MUTED)}>
                    {summary.detail}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
                  Set where customers pay
                </p>
                <p className={cn("mt-1 text-[12px] leading-snug", HUB_MUTED)}>
                  {available
                    ? "Add your till, paybill, or bank. Checkout sends M-Pesa here."
                    : "Kiosk receive isn’t on yet — you can still prepare where money should land."}
                </p>
                {!compact ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Payment options">
                    {METHOD_CHIPS.map((chip) => (
                      <li
                        key={chip}
                        className="inline-flex items-center border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-[#FAFAF8] px-2 py-1 text-[11px] font-semibold tracking-[-0.01em] text-[#141414]"
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          {canWrite ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-3 py-2 text-[13px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-[#0d6b63] active:scale-[0.98]",
                compact && "px-2.5 py-1.5 text-[12px]",
              )}
            >
              {configured ? "Change" : "Add method"}
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        {!compact && configured ? (
          <div className="border-t border-[color-mix(in_srgb,#141414_6%,transparent)] bg-[#FAFAF8] px-4 py-2.5 sm:px-5">
            <p className={cn("text-[12px] leading-snug", HUB_MUTED)}>
              Cashiers and your shop send Lipa Na M-Pesa here — no API keys.
              {canWrite
                ? " Change anytime, or re-test with a KES 1 prompt."
                : null}
            </p>
          </div>
        ) : null}

        {!compact && !configured && canWrite ? (
          <div className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,#141414_6%,transparent)] bg-[#FAFAF8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className={cn("text-[12px] leading-snug", HUB_MUTED)}>
              After you add it, prove the number with a KES 1 prompt.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[var(--pos-primary,#0f766e)] transition-opacity hover:opacity-80"
            >
              <span
                className="size-1.5 shrink-0"
                style={{ backgroundColor: HUB_ACCENT }}
                aria-hidden
              />
              Start setup
            </button>
          </div>
        ) : null}
      </section>

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={configured ? "Change payment method" : "Add payment method"}
        description="Customers pay to your till, paybill, or bank — then prove with KES 1."
        contextLabel="Business"
        appearance="sharp"
        width="wide"
        icon={
          <Store className="size-4 text-[var(--pos-primary,#0f766e)]" aria-hidden />
        }
      >
        <ReceiveMpesaFlow
          appearance="sharp"
          embedded
          mode={configured ? "update" : "setup"}
          ownerPhone={ownerPhone}
          countryCode={countryCode}
          initial={initial}
          showSkip={false}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            void refresh();
          }}
          doneLabel="Done"
        />
      </FormDrawer>
    </>
  );
}

function custodySummary(custody: GatewayConfigRecord | null): {
  title: string;
  detail: string | null;
  icon: "till" | "bank" | "phone";
} {
  if (!custody) {
    return { title: "Not set", detail: null, icon: "phone" };
  }
  const label = custody.label?.trim();
  try {
    const o = JSON.parse(custody.displayInstructionsJson ?? "{}") as Record<
      string,
      string
    >;
    if (o.type === "till" && o.tillNumber) {
      return {
        title: label || `Till ${o.tillNumber}`,
        detail: label ? `Buy Goods · ${o.tillNumber}` : "Buy Goods till",
        icon: "till",
      };
    }
    if (o.businessNumber) {
      const bankish =
        (label ?? "").toLowerCase().includes("bank") ||
        (o.accountNumber ?? "").length >= 8;
      return {
        title:
          label ||
          `Paybill ${o.businessNumber}${o.accountNumber ? ` · ${o.accountNumber}` : ""}`,
        detail: o.accountNumber
          ? `Paybill ${o.businessNumber} · Acc ${o.accountNumber}`
          : `Paybill ${o.businessNumber}`,
        icon: bankish ? "bank" : "till",
      };
    }
  } catch {
    // fall through
  }
  return {
    title: label || "M-Pesa destination",
    detail: "Lipa Na M-Pesa",
    icon: "phone",
  };
}
