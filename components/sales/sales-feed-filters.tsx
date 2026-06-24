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
  { id: "all", label: "Any status" },
  { id: "completed", label: "Completed" },
  { id: "refunded", label: "Refunded" },
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

const PAYMENT_TONES: Record<
  Exclude<PaymentFilter, "all" | "other">,
  { dot: string; active: string }
> = {
  cash: { dot: "bg-emerald-500", active: "bg-emerald-50 text-emerald-900 ring-emerald-200" },
  mpesa: { dot: "bg-sky-500", active: "bg-sky-50 text-sky-900 ring-sky-200" },
  split: { dot: "bg-violet-500", active: "bg-violet-50 text-violet-900 ring-violet-200" },
  credit: { dot: "bg-amber-500", active: "bg-amber-50 text-amber-900 ring-amber-200" },
  wallet: { dot: "bg-teal-500", active: "bg-teal-50 text-teal-900 ring-teal-200" },
  loyalty: { dot: "bg-pink-500", active: "bg-pink-50 text-pink-900 ring-pink-200" },
};

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#AAAAAA]">
      {children}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
        "ring-1 ring-inset",
        active
          ? "bg-[#F9F6F0] text-[#8B6F3A] ring-[#E8DFD0] shadow-sm"
          : "bg-transparent text-[#666666] ring-transparent hover:bg-[#FAFAFA] hover:text-[#333333]",
        className,
      )}
    >
      {children}
    </button>
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
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#F3F3F3] px-3 py-2">
          <FilterLabel>Period</FilterLabel>
          <div
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Date range"
          >
            {DATE_FILTER_OPTIONS.map(({ id, label }) => (
              <Chip
                key={id}
                active={datePreset === id}
                onClick={() => onDatePresetChange(id)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>

        {datePreset === "custom" ? (
          <div className="flex flex-wrap items-end gap-2 border-b border-[#F3F3F3] bg-[#FAFAFA] px-3 py-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[#888888]">From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className={cn(dashboardInputClass(), "h-8 py-1 text-xs")}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-[#888888]">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className={cn(dashboardInputClass(), "h-8 py-1 text-xs")}
              />
            </label>
          </div>
        ) : null}

        {showChannelFilter ? (
          <div className="flex items-center gap-2 border-b border-[#F3F3F3] px-3 py-2">
            <FilterLabel>Channel</FilterLabel>
            <div
              className="flex min-w-0 flex-1 flex-wrap gap-1"
              role="group"
              aria-label="Sales channel"
            >
              {CHANNEL_FILTER_OPTIONS.map(({ id, label, short }) => {
                const active = channelFilter === id;
                const Icon =
                  id === "online_store"
                    ? ShoppingBag
                    : id === "walk_in"
                      ? Store
                      : null;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => onChannelFilterChange(id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all",
                      active
                        ? id === "online_store"
                          ? "bg-indigo-50 text-indigo-900 ring-indigo-200"
                          : "bg-[#F9F6F0] text-[#8B6F3A] ring-[#E8DFD0]"
                        : "bg-transparent text-[#666666] ring-transparent hover:bg-[#FAFAFA]",
                    )}
                  >
                    {Icon ? (
                      <Icon className="size-3 opacity-75" aria-hidden />
                    ) : null}
                    {short}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:max-w-[42%]">
            <FilterLabel>Status</FilterLabel>
            <div
              className="flex min-w-0 flex-1 flex-wrap gap-1"
              role="group"
              aria-label="Sale status"
            >
              {STATUS_OPTIONS.map(({ id, label }) => (
                <Chip
                  key={id}
                  active={statusFilter === id}
                  onClick={() => onStatusFilterChange(id)}
                  title={label}
                >
                  {id === "all" ? "Any" : label}
                </Chip>
              ))}
            </div>
          </div>

          {showTender ? (
            <div
              className="hidden h-5 w-px shrink-0 bg-[#EEEEEE] sm:block"
              aria-hidden
            />
          ) : null}

          {showTender ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FilterLabel>Tender</FilterLabel>
            <div
              className="flex min-w-0 flex-1 flex-wrap gap-1"
              role="group"
              aria-label="Payment method"
            >
              {PAYMENT_METHOD_CHIPS.map(({ id, label, short }) => {
                const active = paymentFilter === id;
                const Icon = PAYMENT_ICONS[id];
                const tone = PAYMENT_TONES[id];
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() =>
                      onPaymentFilterChange(active ? "all" : id)
                    }
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset transition-all",
                      active
                        ? tone.active
                        : "bg-transparent text-[#666666] ring-transparent hover:bg-[#FAFAFA]",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        active ? tone.dot : "bg-[#CCCCCC]",
                      )}
                      aria-hidden
                    />
                    <Icon className="size-3 opacity-70" aria-hidden />
                    <span>{short}</span>
                  </button>
                );
              })}
              <Chip
                active={paymentFilter === "other"}
                onClick={() =>
                  onPaymentFilterChange(
                    paymentFilter === "other" ? "all" : "other",
                  )
                }
                title="Other payment methods"
              >
                Other
              </Chip>
            </div>
          </div>
          ) : null}
        </div>
      </div>

      {hasExtraFilters ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-[11px] text-[#888888]">
            {statusFilter !== "all" ? (
              <span>
                {statusFilter === "completed" ? "Completed only" : "Refunds only"}
              </span>
            ) : null}
            {statusFilter !== "all" && paymentFilter !== "all" ? (
              <span className="mx-1 text-[#CCCCCC]">·</span>
            ) : null}
            {channelFilter !== "all" ? (
              <span>
                {CHANNEL_FILTER_OPTIONS.find((c) => c.id === channelFilter)
                  ?.label ?? "Channel"}
              </span>
            ) : null}
            {channelFilter !== "all" && paymentFilter !== "all" ? (
              <span className="mx-1 text-[#CCCCCC]">·</span>
            ) : null}
            {paymentFilter !== "all" ? (
              <span>
                {PAYMENT_METHOD_CHIPS.find((c) => c.id === paymentFilter)?.label ??
                  "Other"}{" "}
                tender
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={clearExtra}
            className="text-[11px] font-medium text-[#B08D48] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
