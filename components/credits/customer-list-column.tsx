"use client";

import { Search } from "lucide-react";

import {
  BoardFilterButton,
  CrmBar,
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
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className="shrink-0 space-y-1.5 rounded-md border border-border/60 bg-muted/15 p-1.5">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Name, C-no, phone"
            aria-label="Search customers"
            className={dashboardInputClass(false, "h-7 pl-7 text-[11px]")}
          />
        </label>

        <div className="flex flex-wrap items-center gap-1">
          <div className="flex flex-wrap gap-0.5" role="group" aria-label="Origin filter">
            {(
              [
                ["all", "All"],
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
          <label className="ml-auto flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={outstandingOnly}
              onChange={(e) => onOutstandingOnly(e.target.checked)}
              className={customerTableCheckboxClass("size-2.5")}
            />
            Tab only
          </label>
        </div>

        <div>
          <p className="mb-0.5 px-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Joined
            <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
              {" "}
              · {periodLabel}
            </span>
          </p>
          <div
            className="flex flex-wrap gap-0.5"
            role="group"
            aria-label="Joined date filter"
          >
            {dateOptions.map(({ id, label }) => (
              <BoardFilterButton
                key={id}
                compact
                selected={datePreset === id}
                onClick={() => onDatePreset(id)}
              >
                {label}
              </BoardFilterButton>
            ))}
          </div>
        </div>
      </div>

      <WhiteCard className="min-h-0 flex-1">
        {loading ? (
          <p className="px-2.5 py-5 text-[11px] text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-2.5 py-5 text-[11px] text-muted-foreground">No matches.</p>
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
                    "border-b border-border/40 last:border-0",
                    focused && "bg-muted/50",
                  )}
                >
                  <div className="grid gap-1 px-1.5 py-1.5 sm:grid-cols-[auto_minmax(0,1fr)]">
                    {canSelect ? (
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect(row.id)}
                        className={cn(customerTableCheckboxClass(), "mt-0.5 size-2.5")}
                        aria-label={`Select ${row.name}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => onFocus(row.id)}
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-bold tabular-nums",
                            focused
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
                            <p className="text-[12px] font-medium leading-tight text-foreground">
                              {row.name}
                            </p>
                            {row.customerNo != null ? (
                              <span className="text-[9px] tabular-nums text-muted-foreground">
                                C-{row.customerNo}
                              </span>
                            ) : null}
                          </div>
                          {owed > 0 ? (
                            <div className="mt-0.5">
                              <CrmBar pct={pct} className="h-0.5" />
                            </div>
                          ) : null}
                          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                            {customerPrimaryPhone(row.phones) || "No phone"}
                            {owed > 0 ? ` · ${formatKes(owed)}` : ""}
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
