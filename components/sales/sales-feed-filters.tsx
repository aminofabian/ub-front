"use client";

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  CreditCard,
  Gift,
  Layers,
  ShoppingBag,
  Smartphone,
  Store,
  Wallet,
  X,
} from "lucide-react";

import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import type { DatePreset } from "@/lib/analytics-date-range";
import {
  CHANNEL_FILTER_OPTIONS,
  type ChannelFilter,
} from "@/lib/sale-channel-filter";
import {
  PAYMENT_METHOD_CHIPS,
  type PaymentFilter,
} from "@/lib/sale-payment-filter";

export type SalesDatePreset = Extract<
  DatePreset,
  "today" | "yesterday" | "last3" | "last7" | "last30" | "thisMonth" | "custom"
>;

export type StatusFilter = "all" | "completed" | "refunded";

export const DATE_FILTER_OPTIONS: { id: SalesDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3", label: "3d" },
  { id: "last7", label: "7d" },
  { id: "last30", label: "30d" },
  { id: "thisMonth", label: "Month" },
  { id: "custom", label: "Custom" },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Any" },
  { id: "completed", label: "Done" },
  { id: "refunded", label: "Refund" },
];

const PAYMENT_ICONS: Record<
  Exclude<PaymentFilter, "all" | "other">,
  LucideIcon
> = {
  cash: Banknote,
  mpesa: Smartphone,
  split: Layers,
  credit: CreditCard,
  wallet: Wallet,
  loyalty: Gift,
};

const SEGMENT =
  "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors";
const SEGMENT_IDLE =
  "text-muted-foreground hover:bg-muted/70 hover:text-foreground";
const SEGMENT_ACTIVE = "bg-[#F9F6F0] text-[#8B6F3A]";

function Seg({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(SEGMENT, active ? SEGMENT_ACTIVE : SEGMENT_IDLE)}
    >
      {children}
    </button>
  );
}

function FilterCluster({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-0.5">{children}</div>
    </div>
  );
}

export function SalesFeedFilters({
  datePreset,
  onDatePresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  channelFilter,
  onChannelFilterChange,
  showChannelFilter = true,
}: {
  datePreset: SalesDatePreset;
  onDatePresetChange: (id: SalesDatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (id: StatusFilter) => void;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (id: PaymentFilter) => void;
  channelFilter: ChannelFilter;
  onChannelFilterChange: (id: ChannelFilter) => void;
  showChannelFilter?: boolean;
}) {
  const showTender =
    channelFilter === "all" || channelFilter === "walk_in";

  const hasExtraFilters =
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    channelFilter !== "all";

  const clearExtra = () => {
    onStatusFilterChange("all");
    onPaymentFilterChange("all");
    onChannelFilterChange("all");
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b border-border/40 px-2.5 py-1.5">
        <FilterCluster label="When">
          <div role="group" aria-label="Period">
            <div className="flex flex-wrap items-center gap-0.5">
              {DATE_FILTER_OPTIONS.map(({ id, label }) => (
                <Seg
                  key={id}
                  active={datePreset === id}
                  onClick={() => onDatePresetChange(id)}
                >
                  {label}
                </Seg>
              ))}
            </div>
          </div>
        </FilterCluster>

        {hasExtraFilters ? (
          <button
            type="button"
            onClick={clearExtra}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            title="Clear filters"
          >
            <X className="size-3" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      {datePreset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 bg-muted/20 px-2.5 py-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className={cn(dashboardInputClass(), "h-8 w-auto py-1 text-xs")}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className={cn(dashboardInputClass(), "h-8 w-auto py-1 text-xs")}
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2.5 py-1.5">
        {showChannelFilter ? (
          <FilterCluster label="Channel">
            <div role="group" aria-label="Channel">
              <div className="flex flex-wrap items-center gap-0.5">
                {CHANNEL_FILTER_OPTIONS.map(({ id, label, short }) => {
                  const Icon =
                    id === "online_store"
                      ? ShoppingBag
                      : id === "walk_in"
                        ? Store
                        : null;
                  return (
                    <Seg
                      key={id}
                      active={channelFilter === id}
                      onClick={() => onChannelFilterChange(id)}
                      title={label}
                    >
                      {Icon ? (
                        <Icon className="size-3 opacity-70" aria-hidden />
                      ) : null}
                      {short}
                    </Seg>
                  );
                })}
              </div>
            </div>
          </FilterCluster>
        ) : null}

        <FilterCluster label="Status">
          <div role="group" aria-label="Status">
            <div className="flex flex-wrap items-center gap-0.5">
              {STATUS_OPTIONS.map(({ id, label }) => (
                <Seg
                  key={id}
                  active={statusFilter === id}
                  onClick={() => onStatusFilterChange(id)}
                >
                  {label}
                </Seg>
              ))}
            </div>
          </div>
        </FilterCluster>

        {showTender ? (
          <FilterCluster label="Pay">
            <div role="group" aria-label="Payment">
              <div className="flex flex-wrap items-center gap-0.5">
                {PAYMENT_METHOD_CHIPS.map(({ id, label, short }) => {
                  const active = paymentFilter === id;
                  const Icon = PAYMENT_ICONS[id];
                  return (
                    <Seg
                      key={id}
                      active={active}
                      onClick={() =>
                        onPaymentFilterChange(active ? "all" : id)
                      }
                      title={label}
                    >
                      <Icon className="size-3 opacity-70" aria-hidden />
                      {short}
                    </Seg>
                  );
                })}
                <Seg
                  active={paymentFilter === "other"}
                  onClick={() =>
                    onPaymentFilterChange(
                      paymentFilter === "other" ? "all" : "other",
                    )
                  }
                  title="Other"
                >
                  Other
                </Seg>
              </div>
            </div>
          </FilterCluster>
        ) : null}
      </div>
    </div>
  );
}
