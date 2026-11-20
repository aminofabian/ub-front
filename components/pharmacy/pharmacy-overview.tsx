"use client";

import { Check, Circle } from "lucide-react";
import type { ReactNode } from "react";

import { RX_INK, RX_MUTED, RX_RULE, formatDate } from "@/components/pharmacy/pharmacy-ui";
import { Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import type { BatchSafetyView, DispensingClass, PharmacyDashboard } from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

type Props = {
  dashboard: PharmacyDashboard | null;
  canReadStock: boolean;
  onOpenMedicines: (cls: DispensingClass | null) => void;
  onOpenStock: (view: BatchSafetyView) => void;
  onOpenDispensing?: () => void;
  onOpenSettings: () => void;
};

/** One thing that needs someone: how many, what it is in plain words, and where to deal with it. */
type Need = {
  key: string;
  count: number | null;
  /** Stops something being sold or dispensed safely; shown first and in terracotta. */
  blocking: boolean;
  text: string;
  detail?: string;
  action: string;
  onAction: () => void;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * The pharmacy's front page answers one question: what needs me now? Everything that needs a
 * person is one list, most urgent first, each row with the place to fix it. The numbers that
 * are only good to know sit below, quieter. Set-up shows only what is left to do.
 */
export function PharmacyOverview({
  dashboard,
  canReadStock,
  onOpenMedicines,
  onOpenStock,
  onOpenDispensing,
  onOpenSettings,
}: Props) {
  if (!dashboard) {
    return <p className={cn("px-1 py-6 text-sm", RX_MUTED)}>Loading…</p>;
  }
  const { medicines, stock, checklist } = dashboard;
  const days = dashboard.licenceDaysLeft;

  const needs: Need[] = [];
  if (medicines.unclassified > 0) {
    needs.push({
      key: "unclassified",
      count: medicines.unclassified,
      blocking: true,
      text: plural(medicines.unclassified, "medicine has no dispensing class", "medicines have no dispensing class"),
      detail: "They cannot be sold until someone classifies them.",
      action: "Classify",
      onAction: () => onOpenMedicines("UNCLASSIFIED"),
    });
  }
  if (canReadStock && stock.expired > 0) {
    needs.push({
      key: "expired",
      count: stock.expired,
      blocking: true,
      text: plural(stock.expired, "expired batch is still on the shelf", "expired batches are still on the shelf"),
      detail: "The till will not sell them. Take them off the shelf and write them off.",
      action: "Review",
      onAction: () => onOpenStock("expired"),
    });
  }
  if (canReadStock && stock.medicineMissingDetails > 0) {
    needs.push({
      key: "missing",
      count: stock.medicineMissingDetails,
      blocking: true,
      text: plural(
        stock.medicineMissingDetails,
        "medicine batch has no lot number or expiry date",
        "medicine batches have no lot number or expiry date",
      ),
      detail: "A batch with no expiry date cannot be sold.",
      action: "Add them",
      onAction: () => onOpenStock("missing_details"),
    });
  }
  if (days != null && days <= 60) {
    needs.push({
      key: "licence",
      count: null,
      blocking: days < 0,
      text:
        days < 0
          ? `Your premises licence date passed on ${formatDate(dashboard.licenceExpiresOn)}`
          : `Your premises licence expires on ${formatDate(dashboard.licenceExpiresOn)}`,
      detail: days < 0 ? "Renew it, then update the date here." : `${days} ${plural(days, "day", "days")} left.`,
      action: "Update",
      onAction: onOpenSettings,
    });
  }
  if ((dashboard.awaitingSecondCheck ?? 0) > 0) {
    const n = dashboard.awaitingSecondCheck ?? 0;
    needs.push({
      key: "check",
      count: n,
      blocking: false,
      text: plural(n, "dispensing record is waiting for a second check", "dispensing records are waiting for a second check"),
      action: "Open the log",
      onAction: () => onOpenDispensing?.(),
    });
  }
  if (canReadStock && stock.quarantined > 0) {
    needs.push({
      key: "quarantined",
      count: stock.quarantined,
      blocking: false,
      text: plural(stock.quarantined, "batch is in quarantine", "batches are in quarantine"),
      detail: "Release each one or write it off.",
      action: "Review",
      onAction: () => onOpenStock("quarantined"),
    });
  }
  if (canReadStock && stock.shortDated > 0) {
    needs.push({
      key: "short",
      count: stock.shortDated,
      blocking: false,
      text: `${plural(stock.shortDated, "batch expires", "batches expire")} within ${stock.shortDatedDays} days`,
      action: "See which",
      onAction: () => onOpenStock("short_dated"),
    });
  }
  if (dashboard.dispensingStaffWithoutPin > 0) {
    needs.push({
      key: "pin",
      count: dashboard.dispensingStaffWithoutPin,
      blocking: false,
      text: plural(
        dashboard.dispensingStaffWithoutPin,
        "person who may dispense has no till PIN",
        "people who may dispense have no till PIN",
      ),
      detail: "Without a PIN they cannot approve a cashier's sale.",
      action: "Settings",
      onAction: onOpenSettings,
    });
  }
  needs.sort((a, b) => Number(b.blocking) - Number(a.blocking));

  const todo = checklist.filter((s) => !s.done);
  const done = checklist.length - todo.length;

  return (
    <div className={cn("grid items-start gap-3", todo.length > 0 ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "")}>
      <div className="flex min-w-0 flex-col gap-3">
        <Panel title="Needs attention" flush>
          {needs.length === 0 ? (
            <p className={cn("flex items-center gap-2 px-4 py-5 text-sm", RX_MUTED)}>
              <Check className="size-4 text-[var(--op-accent,#1d4b3b)]" aria-hidden />
              Nothing needs you right now.
            </p>
          ) : (
            <ul>
              {needs.map((n, i) => (
                <li
                  key={n.key}
                  className={cn("grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-3 border-b px-4 py-3 last:border-0", RX_RULE)}
                >
                  <span
                    className={cn(
                      "text-right text-[1.375rem] font-semibold leading-none tabular-nums",
                      n.blocking ? "text-[#8A4129]" : RX_INK,
                    )}
                  >
                    {n.count ?? ""}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-[14.5px] leading-snug", RX_INK)}>{n.text}</span>
                    {n.detail ? <span className={cn("block text-[13px] leading-snug", RX_MUTED)}>{n.detail}</span> : null}
                  </span>
                  <Button
                    type="button"
                    variant={i === 0 ? "default" : "outline"}
                    className="h-11 min-w-[6.5rem] rounded-[2px] px-3.5 sm:h-9"
                    onClick={n.onAction}
                  >
                    {n.action}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="At a glance">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <Fact label="Dispensed today" value={dashboard.dispensedToday} />
            <Fact label="Medicines" value={medicines.total} />
            <Fact label="Prescription only" value={medicines.prescriptionOnly} />
            <Fact label="Controlled" value={medicines.controlled} />
            <Fact label="Over the counter" value={medicines.otc} />
            <Fact label="Staff who may dispense" value={dashboard.dispensingStaff} />
            <Fact
              label="Premises licence"
              value={dashboard.premisesLicenceNo ?? "Not recorded"}
              small
              note={dashboard.licenceExpiresOn ? `Expires ${formatDate(dashboard.licenceExpiresOn)}` : undefined}
              className="col-span-2"
            />
          </dl>
        </Panel>
      </div>

      {todo.length > 0 ? (
        <Panel title="Finish setting up" description={`${done} of ${checklist.length} done`}>
          <ul className="space-y-3">
            {todo.map((s) => (
              <li key={s.key} className="flex gap-2.5 text-sm">
                <Circle className={cn("mt-0.5 size-4 shrink-0", RX_MUTED)} aria-hidden />
                <span className="min-w-0">
                  <span className={cn("block font-medium leading-snug", RX_INK)}>{s.label}</span>
                  {s.hint ? <span className={cn("block text-[13px] leading-snug", RX_MUTED)}>{s.hint}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Fact({
  label,
  value,
  note,
  small,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={cn("text-[12.5px]", RX_MUTED)}>{label}</dt>
      <dd className={cn("mt-0.5 font-medium tabular-nums", small ? "text-[15px]" : "text-[1.25rem] leading-tight", RX_INK)}>
        {value}
      </dd>
      {note ? <dd className={cn("text-[12.5px]", RX_MUTED)}>{note}</dd> : null}
    </div>
  );
}
