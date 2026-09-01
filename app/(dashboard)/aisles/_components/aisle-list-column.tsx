"use client";

import Link from "next/link";
import { Search } from "lucide-react";

import {
  BoardSearchInput,
  INK,
  MUTED,
  NavySidebarSection,
  NavyRadioOption,
  WhiteCard,
} from "@/components/credits/customer-board-theme";
import { APP_ROUTES } from "@/lib/config";
import type { AisleRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "active" | "inactive";

type Props = {
  rows: AisleRecord[];
  loading: boolean;
  focusedId: string | null;
  search: string;
  onSearch: (v: string) => void;
  filterMode: FilterMode;
  onFilterMode: (v: FilterMode) => void;
  unassignedCount: number;
  maxProducts: number;
  onFocus: (id: string) => void;
};

export function AisleListColumn({
  rows,
  loading,
  focusedId,
  search,
  onSearch,
  filterMode,
  onFilterMode,
  unassignedCount,
  maxProducts,
  onFocus,
}: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/70"
          aria-hidden
        />
        <BoardSearchInput
          value={search}
          onChange={onSearch}
          placeholder="Search zone name or code"
          aria-label="Search shelf zones"
          className="pl-10"
        />
      </label>

      <NavySidebarSection title="Show">
        {(
          [
            ["all", "All zones"],
            ["active", "Active only"],
            ["inactive", "Inactive"],
          ] as const
        ).map(([id, label]) => (
          <NavyRadioOption
            key={id}
            name="aisle-filter"
            value={id}
            checked={filterMode === id}
            onChange={() => onFilterMode(id)}
            label={label}
          />
        ))}
      </NavySidebarSection>

      {unassignedCount > 0 ? (
        <Link
          href={`${APP_ROUTES.products}?aisleUnset=1`}
          className="block rounded-none px-3 py-3 text-[12px] leading-snug text-white/90 underline-offset-2 hover:bg-white/10 hover:text-white hover:underline"
          style={{ background: "rgba(7, 30, 54, 0.55)" }}
        >
          <span className="font-semibold text-white">
            {unassignedCount.toLocaleString()} unassigned
          </span>
          <span className="mt-0.5 block text-white/75">
            Products with no walk stop — review in catalog
          </span>
        </Link>
      ) : null}

      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
        Aisles · walk order
      </p>

      <WhiteCard className="min-h-[min(50dvh,24rem)] flex-1 overflow-hidden lg:min-h-0">
        {loading ? (
          <p className="px-4 py-8 text-[13px]" style={{ color: MUTED }}>
            Loading walk path…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-[15px] leading-relaxed" style={{ color: INK }}>
            No shelf zones match this view.
          </p>
        ) : (
          <ul>
            {rows.map((row, index) => {
              const focused = focusedId === row.id;
              const count = row.productCount;
              const pct = Math.max((count / maxProducts) * 100, count > 0 ? 4 : 0);
              return (
                <li
                  key={row.id}
                  className={cn(
                    "border-b border-[#eef1f4] last:border-0",
                    focused && "bg-[#f4f7fb]",
                    !row.active && "opacity-70",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0c3a66]"
                    onClick={() => onFocus(row.id)}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center font-mono text-[11px] font-bold tabular-nums",
                        focused
                          ? "bg-[#0c3a66] text-white"
                          : "bg-[#eef1f4] text-[#3a5570]",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p
                          className="truncate text-[15px] font-semibold tracking-[-0.02em]"
                          style={{ color: INK }}
                        >
                          {row.name}
                        </p>
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0c3a66]">
                          {row.code}
                        </span>
                      </div>
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
                      <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>
                        {count.toLocaleString()} product{count === 1 ? "" : "s"}
                        {!row.active ? " · inactive" : ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </WhiteCard>
    </div>
  );
}
