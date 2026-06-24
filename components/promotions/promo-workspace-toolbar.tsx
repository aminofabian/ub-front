"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import type { PromoSortKey, PromoStatusTab } from "@/lib/promotions-campaign-utils";
import { cn } from "@/lib/utils";

import {
  promoFilterRail,
  promoTabBtn,
  promoTabCount,
  promoTabRail,
  STATUS_TAB_ICONS,
  supInput,
  supKicker,
  supSelect,
} from "./promotions-ui-tokens";

const STATUS_TABS: { id: PromoStatusTab; label: string; hint?: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active", hint: "Currently sending" },
  { id: "scheduled", label: "Scheduled" },
  { id: "drafts", label: "Drafts" },
  { id: "past", label: "Past", hint: "Completed or cancelled" },
];

export function PromoWorkspaceToolbar({
  statusTab,
  onStatusTab,
  tabCounts,
  search,
  onSearch,
  typeFilter,
  onTypeFilter,
  sortKey,
  onSortKey,
  hasActiveFilters,
  onClearFilters,
  shownCount,
  totalCount,
}: {
  statusTab: PromoStatusTab;
  onStatusTab: (tab: PromoStatusTab) => void;
  tabCounts: Record<PromoStatusTab, number>;
  search: string;
  onSearch: (v: string) => void;
  typeFilter: "" | "FLASH_SALE" | "WEEKLY_DEALS";
  onTypeFilter: (v: "" | "FLASH_SALE" | "WEEKLY_DEALS") => void;
  sortKey: PromoSortKey;
  onSortKey: (v: PromoSortKey) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  shownCount: number;
  totalCount: number;
}) {
  const activeTabMeta = STATUS_TABS.find((t) => t.id === statusTab);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={supKicker}>Campaign library</p>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Your promotions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTabMeta?.hint ??
              "Browse, filter, and open any promotion to send, pause, or review results."}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{shownCount}</span> shown
          {hasActiveFilters || statusTab !== "all" ? (
            <span> · {totalCount} total</span>
          ) : null}
        </p>
      </div>

      <div className={promoTabRail} role="tablist" aria-label="Promotion status">
        {STATUS_TABS.map((tab) => {
          const active = statusTab === tab.id;
          const Icon = STATUS_TAB_ICONS[tab.id];
          const count = tabCounts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={tab.hint}
              onClick={() => onStatusTab(tab.id)}
              className={promoTabBtn(active)}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              {tab.label}
              <span className={promoTabCount(active)}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={promoFilterRail}>
        <div className="relative min-w-0 flex-1 sm:min-w-[14rem]">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name or message…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className={cn(supInput, "pl-9")}
            aria-label="Search promotions"
          />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:hidden">
            <SlidersHorizontal className="size-3" aria-hidden />
            Filters
          </div>
          <select
            value={typeFilter}
            onChange={(e) =>
              onTypeFilter(e.target.value as "" | "FLASH_SALE" | "WEEKLY_DEALS")
            }
            className={cn(supSelect, "w-full sm:min-w-[10.5rem]")}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="FLASH_SALE">Flash sale</option>
            <option value="WEEKLY_DEALS">Weekly deals</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => onSortKey(e.target.value as PromoSortKey)}
            className={cn(supSelect, "w-full sm:min-w-[10.5rem]")}
            aria-label="Sort promotions"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="reach">Largest audience</option>
          </select>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border/60",
                "bg-muted/30 px-3 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-muted/50 hover:text-foreground sm:w-auto",
              )}
            >
              <X className="size-3.5" aria-hidden />
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
