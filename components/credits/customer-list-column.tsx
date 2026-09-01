"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search } from "lucide-react";

import { DashboardLoading, dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  CRM_PILL_ACTIVE,
  CRM_PILL_IDLE,
  CRM_RAIL,
  customerInitials,
  customerTableCheckboxClass,
} from "@/components/credits/customer-crm-ui";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import type { CustomerRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type DateOption = { id: string; label: string };

type Props = {
  rows: CustomerRecord[];
  loading: boolean;
  focusedId: string | null;
  selectedIds: Set<string>;
  canSelect: boolean;
  search: string;
  onSearch: (v: string) => void;
  dateOptions: DateOption[];
  datePreset: string;
  onDatePreset: (id: string) => void;
  periodLabel: string;
  outstandingOnly: boolean;
  onOutstandingOnly: (v: boolean) => void;
  originFilter: "all" | "inferred" | "verified";
  onOriginFilter: (v: "all" | "inferred" | "verified") => void;
  onFocus: (id: string) => void;
  onToggleSelect: (id: string) => void;
  formatKes: (n: number | string) => string;
};

export function CustomerListColumn({
  rows,
  loading,
  focusedId,
  selectedIds,
  canSelect,
  search,
  onSearch,
  dateOptions,
  datePreset,
  onDatePreset,
  periodLabel,
  outstandingOnly,
  onOutstandingOnly,
  originFilter,
  onOriginFilter,
  onFocus,
  onToggleSelect,
  formatKes,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <aside className={cn(CRM_RAIL, "lg:max-w-[19rem]")}>
      <div className="shrink-0 space-y-2 border-b border-border/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Customers
          </p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {loading ? "…" : rows.length}
          </span>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            className={cn(dashboardInputClass(), "h-9 pl-9 text-sm")}
            placeholder="Name, phone, C-12…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search customers"
          />
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <span className="inline-flex items-center gap-1.5">
            <Filter className="size-3.5" />
            Filters
          </span>
          <ChevronDown
            className={cn("size-3.5 transition-transform", filtersOpen && "rotate-180")}
          />
        </button>
        {filtersOpen ? (
          <div className="space-y-2.5 rounded-xl border border-border/50 bg-card/60 p-2.5">
            <div className="flex flex-wrap gap-1">
              {dateOptions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onDatePreset(id)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-medium",
                    datePreset === id ? CRM_PILL_ACTIVE : CRM_PILL_IDLE,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
            <div className="flex rounded-lg border border-border/50 bg-muted/30 p-0.5 text-[10px] font-medium">
              {(
                [
                  ["all", "All"],
                  ["inferred", "Inferred"],
                  ["verified", "Verified"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOriginFilter(id)}
                  className={cn(
                    "flex-1 rounded-md px-1.5 py-1",
                    originFilter === id ? CRM_PILL_ACTIVE : CRM_PILL_IDLE,
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={outstandingOnly}
                onChange={(e) => onOutstandingOnly(e.target.checked)}
                className={customerTableCheckboxClass("size-3.5")}
              />
              Outstanding tab only
            </label>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <DashboardLoading label="Loading…" />
        ) : rows.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No customers match.
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => {
              const focused = focusedId === row.id;
              const selected = selectedIds.has(row.id);
              const owed = Number(row.credit.balanceOwed ?? 0);
              return (
                <li key={row.id}>
                  <div
                    className={cn(
                      "group flex items-start gap-2 rounded-xl border px-2 py-2 transition-all",
                      focused
                        ? "border-[#8B6F3A]/35 bg-[#F9F6F0]/80 shadow-sm ring-1 ring-[#8B6F3A]/10"
                        : "border-transparent hover:border-border/60 hover:bg-muted/30",
                    )}
                  >
                    {canSelect ? (
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(customerTableCheckboxClass(), "mt-2")}
                        aria-label={`Select ${row.name}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                      onClick={() => onFocus(row.id)}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold",
                          focused
                            ? "bg-[#8B6F3A] text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {customerInitials(row.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-tight">
                          {row.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                          {row.customerNo != null ? `C-${row.customerNo}` : "—"}
                          {customerPrimaryPhone(row.phones)
                            ? ` · ${customerPrimaryPhone(row.phones)}`
                            : ""}
                        </span>
                        {owed > 0 ? (
                          <span className="mt-1 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Owes {formatKes(owed)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
