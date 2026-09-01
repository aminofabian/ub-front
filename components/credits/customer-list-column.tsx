"use client";

import { Search } from "lucide-react";

import {
  BoardFilterButton,
  CrmBar,
  NavyRadioOption,
  NavySidebarSection,
  WhiteCard,
} from "@/components/credits/customer-board-theme";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { customerTableCheckboxClass } from "@/components/credits/customer-crm-ui";
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
  maxOwed: number;
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
  maxOwed,
}: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <div className="space-y-2">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, C-number, phone"
            aria-label="Search customers"
            className={dashboardInputClass(false, "h-10 pl-9")}
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Origin filter">
          {(
            [
              ["all", "Everyone"],
              ["inferred", "Inferred"],
              ["verified", "Verified"],
            ] as const
          ).map(([id, label]) => (
            <BoardFilterButton
              key={id}
              compact
              selected={originFilter === id}
              onClick={() => onOriginFilter(id)}
            >
              {label}
            </BoardFilterButton>
          ))}
        </div>
        <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={outstandingOnly}
            onChange={(e) => onOutstandingOnly(e.target.checked)}
            className={customerTableCheckboxClass("size-3.5")}
          />
          Outstanding tab only
        </label>
      </div>

      <NavySidebarSection title="Added">
        {dateOptions.map(({ id, label }) => (
          <NavyRadioOption
            key={id}
            name="customer-added"
            value={id}
            checked={datePreset === id}
            onChange={() => onDatePreset(id)}
            label={label}
          />
        ))}
      </NavySidebarSection>
      <p className="px-0.5 text-[11px] text-muted-foreground">{periodLabel}</p>

      <WhiteCard className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            No customers match this view.
          </p>
        ) : (
          <ul>
            {rows.map((row, index) => {
              const focused = focusedId === row.id;
              const selected = selectedIds.has(row.id);
              const owed = Number(row.credit.balanceOwed ?? 0);
              const pct = Math.max((owed / maxOwed) * 100, owed > 0 ? 4 : 0);
              return (
                <li
                  key={row.id}
                  className={cn(
                    "border-b border-border/50 last:border-0",
                    focused && "bg-muted/40",
                  )}
                >
                  <div className="grid gap-2 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                    {canSelect ? (
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect(row.id)}
                        className={cn(customerTableCheckboxClass(), "mt-1")}
                        aria-label={`Select ${row.name}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => onFocus(row.id)}
                    >
                      <div className="flex items-start gap-2">
                        <p className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                          {index + 1}
                        </p>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">
                              {row.name}
                            </p>
                            {row.customerNo != null ? (
                              <span className="text-[12px] tabular-nums text-muted-foreground">
                                C-{row.customerNo}
                              </span>
                            ) : null}
                          </div>
                          {owed > 0 ? (
                            <div className="mt-2">
                              <CrmBar pct={pct} />
                            </div>
                          ) : null}
                          <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
                            {customerPrimaryPhone(row.phones) || "No phone"}
                            {owed > 0 ? ` · Owes ${formatKes(owed)}` : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </WhiteCard>
    </div>
  );
}
