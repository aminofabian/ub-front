"use client";

import { Search } from "lucide-react";

import {
  BoardFilterButton,
  BoardSearchInput,
  INK,
  MUTED,
  NAVY_DEEP,
  NavyRadioOption,
  NavySidebarSection,
  WhiteCard,
} from "@/components/credits/customer-board-theme";
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
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/70"
            aria-hidden
          />
          <BoardSearchInput
            value={search}
            onChange={onSearch}
            placeholder="Search name, C-number, phone"
            aria-label="Search customers"
            className="pl-10"
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
        <label className="flex min-h-10 cursor-pointer items-center gap-2 px-1 text-[12px] text-white/90">
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
      <p className="px-1 text-[11px] text-white/75">{periodLabel}</p>

      <WhiteCard className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-[13px]" style={{ color: MUTED }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-[15px] leading-relaxed" style={{ color: INK }}>
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
                    "border-b border-[#eef1f4] last:border-0",
                    focused && "bg-[#f4f7fb]",
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
                      className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0c3a66]"
                      onClick={() => onFocus(row.id)}
                    >
                      <div className="flex items-start gap-2">
                        <p
                          className="text-[13px] font-semibold tabular-nums"
                          style={{ color: MUTED }}
                        >
                          {index + 1}
                        </p>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p
                              className="truncate text-[15px] font-semibold tracking-[-0.02em]"
                              style={{ color: INK }}
                            >
                              {row.name}
                            </p>
                            {row.customerNo != null ? (
                              <span
                                className="text-[12px] tabular-nums"
                                style={{ color: MUTED }}
                              >
                                C-{row.customerNo}
                              </span>
                            ) : null}
                          </div>
                          {owed > 0 ? (
                            <div className="mt-2 h-2 w-full bg-[#d5deea]">
                              <div
                                className="h-2 origin-left"
                                style={{
                                  width: "100%",
                                  transform: `scaleX(${pct / 100})`,
                                  background: index === 0 ? "#0c3a66" : "#2a6aa3",
                                  boxShadow: "1px 2px 4px rgba(7, 30, 54, 0.22)",
                                }}
                              />
                            </div>
                          ) : null}
                          <p
                            className="mt-1.5 text-[12px] leading-snug"
                            style={{ color: MUTED }}
                          >
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
