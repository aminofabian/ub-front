"use client";

import Link from "next/link";
import { Search } from "lucide-react";

import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { BoardFilterButton } from "@/components/credits/customer-board-theme";
import { APP_ROUTES } from "@/lib/config";
import type { AisleRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { AisleBar, AislePanel } from "./aisle-ui";

type FilterMode = "all" | "active" | "inactive";

const FILTERS: { id: FilterMode; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

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
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name or code"
          aria-label="Search shelf zones"
          className={dashboardInputClass(false, "h-8 pl-8 text-sm")}
        />
      </label>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter aisles">
        {FILTERS.map(({ id, label }) => (
          <BoardFilterButton
            key={id}
            compact
            selected={filterMode === id}
            onClick={() => onFilterMode(id)}
          >
            {label}
          </BoardFilterButton>
        ))}
      </div>

      {unassignedCount > 0 ? (
        <Link
          href={`${APP_ROUTES.products}?aisleUnset=1`}
          className="block rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 py-2 text-[11px] leading-snug text-amber-950 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <span className="font-semibold">
            {unassignedCount.toLocaleString()} unassigned
          </span>
          <span className="mt-0.5 block opacity-80">
            Products with no aisle — review in catalog
          </span>
        </Link>
      ) : null}

      <AislePanel className="min-h-[min(50dvh,24rem)] flex-1 lg:min-h-0">
        {loading ? (
          <p className="px-3 py-6 text-xs text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground">
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
                    "border-b border-border/50 last:border-0",
                    focused && "bg-muted/40",
                    !row.active && "opacity-70",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full gap-2.5 px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    onClick={() => onFocus(row.id)}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold tabular-nums",
                        focused
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                          {row.name}
                        </p>
                        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {row.code}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <AisleBar pct={pct} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
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
      </AislePanel>
    </div>
  );
}
