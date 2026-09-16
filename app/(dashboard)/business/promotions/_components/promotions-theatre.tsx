"use client";

import { useMemo } from "react";
import {
  CalendarClock,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Target,
  Zap,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { NotificationCampaign } from "@/lib/api";
import {
  campaignStatusMeta,
  campaignTypeLabel,
  campaignWhenLabel,
  deliveryRate,
  type PromoSortKey,
  type PromoStatusTab,
} from "@/lib/promotions-campaign-utils";
import { cn } from "@/lib/utils";

export type PromoStatsData = {
  drafts: number;
  scheduled: number;
  active: number;
  completed: number;
  totalReach: number;
  totalTargeted: number;
};

export type PromotionsTheatreProps = {
  rows: NotificationCampaign[];
  filtered: NotificationCampaign[];
  loading: boolean;
  statusTab: PromoStatusTab;
  onStatusTab: (tab: PromoStatusTab) => void;
  tabCounts: Record<PromoStatusTab, number>;
  search: string;
  onSearch: (value: string) => void;
  typeFilter: "" | "FLASH_SALE" | "WEEKLY_DEALS";
  onTypeFilter: (value: "" | "FLASH_SALE" | "WEEKLY_DEALS") => void;
  sortKey: PromoSortKey;
  onSortKey: (value: PromoSortKey) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  stats: PromoStatsData;
  selectedRow: NotificationCampaign | null;
  detailOpen: boolean;
  createOpen: boolean;
  onSelect: (row: NotificationCampaign) => void;
  onCreate: () => void;
  onReload: () => void;
  scopeLabel: (row: NotificationCampaign) => string;
  dockRef?: (node: HTMLDivElement | null) => void;
};

const STATUS_TABS: { id: PromoStatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "drafts", label: "Drafts" },
  { id: "past", label: "Past" },
];

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function campaignInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusChipClass(status: string): string {
  switch (status) {
    case "RUNNING":
      return "border-amber-600/30 bg-amber-500/10 text-amber-800";
    case "SCHEDULED":
      return "border-sky-600/30 bg-sky-500/10 text-sky-800";
    case "DRAFT":
      return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground";
    case "COMPLETED":
      return "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] text-[var(--pos-primary,#0f766e)]";
    case "CANCELLED":
      return "border-rose-600/30 bg-rose-500/10 text-rose-700";
    default:
      return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground";
  }
}

function PromotionsBanner({
  statusTab,
  onStatusTab,
  tabCounts,
  search,
  loading,
  shownCount,
  totalCount,
  onReload,
  onCreate,
}: {
  statusTab: PromoStatusTab;
  onStatusTab: (tab: PromoStatusTab) => void;
  tabCounts: Record<PromoStatusTab, number>;
  search: string;
  loading: boolean;
  shownCount: number;
  totalCount: number;
  onReload: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <div
        role="tablist"
        aria-label="Promotion status"
        className="flex flex-wrap gap-1"
      >
        {STATUS_TABS.map(({ id, label }) => {
          const active = statusTab === id;
          const count = tabCounts[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-none border px-2 text-[11px] font-semibold transition-colors",
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onStatusTab(id)}
            >
              {label}
              <span
                className={cn(
                  "rounded-none px-1 py-0 text-[9px] tabular-nums",
                  active ? "text-white/90" : "opacity-80",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />

      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5 tabular-nums")}>
        <LiveDot />
        {loading ? (
          "Loading promotions…"
        ) : (
          <>
            <span className="font-semibold text-foreground">{shownCount}</span> shown
            {search.trim() || statusTab !== "all" ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-foreground">{totalCount}</span>{" "}
                total
              </>
            ) : null}
            {search.trim() ? (
              <span className="hidden sm:inline">
                {" "}
                · matching “{search.trim()}”
              </span>
            ) : null}
          </>
        )}
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-none px-2 text-[11px]"
          disabled={loading}
          onClick={() => onReload()}
        >
          <RefreshCw
            className={cn("size-3", loading && "animate-spin")}
            aria-hidden
          />
          Reload
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 rounded-none px-2 text-[11px]"
          onClick={onCreate}
        >
          <Plus className="size-3" aria-hidden />
          New
        </Button>
      </div>
    </div>
  );
}

function PromotionsPulse({
  stats,
  totalCampaigns,
  rows,
  onSelect,
  onCreate,
  className,
}: {
  stats: PromoStatsData;
  totalCampaigns: number;
  rows: NotificationCampaign[];
  onSelect: (row: NotificationCampaign) => void;
  onCreate: () => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  const attention = useMemo(
    () =>
      rows
        .filter((r) => r.status === "RUNNING" || r.status === "SCHEDULED")
        .slice(0, 5),
    [rows],
  );

  const deliveryPct =
    stats.totalTargeted > 0
      ? Math.round((stats.totalReach / stats.totalTargeted) * 100)
      : null;

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M10 68 Q 50 28 90 68"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="50"
          cy="40"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.5 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-4 top-4")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Campaigns
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {totalCampaigns.toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {stats.active} sending · {stats.scheduled} scheduled · {stats.drafts}{" "}
          drafts
        </p>
      </article>

      <article className={cn(card, "right-4 top-[28%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Reach
        </p>
        <p
          className="mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {stats.totalReach.toLocaleString()}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          shoppers notified
          {deliveryPct != null ? ` · ${deliveryPct}% delivery` : ""}
        </p>
      </article>

      {attention.length > 0 ? (
        <article className={cn(card, "bottom-4 left-4 max-h-[40%] overflow-y-auto")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Live &amp; queued
          </p>
          <ul className="mt-2 space-y-1">
            {attention.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : (
        <article className={cn(card, "bottom-4 right-4")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Get started
          </p>
          <p className={cn(dashboardHintClass(), "mt-2 max-w-[14rem]")}>
            Create a flash sale or weekly deals alert. Shoppers see a short
            message in their account.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-3 h-7 gap-1 rounded-none px-2 text-[11px]"
            onClick={onCreate}
          >
            <Plus className="size-3" aria-hidden />
            New promotion
          </Button>
        </article>
      )}
    </div>
  );
}

function PromotionsFocus({
  row,
  scopeLabel,
  className,
}: {
  row: NotificationCampaign;
  scopeLabel: string;
  className?: string;
}) {
  const meta = campaignStatusMeta(row.status);
  const rate = deliveryRate(row);
  const isFlash = row.campaignType === "FLASH_SALE";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="46"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="1.2 1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-[1] flex max-w-md flex-col items-center text-center">
        <span
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          {isFlash ? (
            <Zap className="size-6 text-[var(--pos-primary,#0f766e)]" />
          ) : (
            <Megaphone className="size-6 text-[var(--pos-primary,#0f766e)]" />
          )}
        </span>
        <h3
          className="mt-4 text-[1.45rem] font-semibold leading-tight tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {row.title || row.name}
        </h3>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{row.name}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
              statusChipClass(row.status),
            )}
          >
            {meta.label}
          </span>
          <span className="inline-flex items-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
            {campaignTypeLabel(row.campaignType)}
          </span>
        </div>
        <dl className="mt-6 grid w-full grid-cols-3 gap-2 text-left">
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>Reach</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {row.recipientsTargeted.toLocaleString()}
            </dd>
          </div>
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>Sent</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {row.recipientsSent.toLocaleString()}
              {rate != null ? (
                <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                  {rate}%
                </span>
              ) : null}
            </dd>
          </div>
          <div className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white/80 px-2.5 py-2">
            <dt className={dashboardHintClass()}>When</dt>
            <dd className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug">
              {campaignWhenLabel(row)}
            </dd>
          </div>
        </dl>
        <p
          className={cn(
            dashboardHintClass(),
            "mt-4 flex items-center gap-1.5 text-center",
          )}
        >
          <Target className="size-3.5 shrink-0" aria-hidden />
          {scopeLabel}
        </p>
      </div>
    </div>
  );
}

export function PromotionsTheatre(props: PromotionsTheatreProps) {
  const {
    rows,
    filtered,
    loading,
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
    stats,
    selectedRow,
    detailOpen,
    createOpen,
    onSelect,
    onCreate,
    onReload,
    scopeLabel,
    dockRef,
  } = props;

  const isLg = useMediaLg();

  const setDockRoot = (node: HTMLDivElement | null) => {
    dockRef?.(node);
  };

  const dockOccupied =
    (isLg && detailOpen && !!selectedRow) || (isLg && createOpen);

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;

    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search promotions…"
              aria-label="Search promotions"
            />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className={cn(dashboardSelectClass(), "h-8 w-full py-0 text-[11px]")}
              value={typeFilter}
              onChange={(e) =>
                onTypeFilter(
                  e.target.value as "" | "FLASH_SALE" | "WEEKLY_DEALS",
                )
              }
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              <option value="FLASH_SALE">Flash sale</option>
              <option value="WEEKLY_DEALS">Weekly deals</option>
            </select>
            <select
              className={cn(dashboardSelectClass(), "h-8 w-full py-0 text-[11px]")}
              value={sortKey}
              onChange={(e) => onSortKey(e.target.value as PromoSortKey)}
              aria-label="Sort promotions"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="reach">Reach</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {filtered.length}
              {hasActiveFilters ? ` of ${rows.length}` : ""}{" "}
              {filtered.length === 1 ? "promotion" : "promotions"}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className={cn(
                  dashboardHintClass(),
                  "underline-offset-2 hover:underline",
                )}
                onClick={onClearFilters}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {loading ? (
            <div className="space-y-2 px-2 py-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-none border border-border/50 bg-muted/30"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Megaphone
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                No promotions yet
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                Create a flash sale or weekly deals alert for registered shoppers.
              </p>
              <Button
                size="sm"
                className="mt-3 gap-1.5 rounded-none"
                onClick={onCreate}
              >
                <Plus className="size-3.5" aria-hidden />
                New promotion
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className={cn(dashboardHintClass())}>
                {search.trim()
                  ? `No promotions match “${search.trim()}”.`
                  : "No promotions match this filter."}
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-none"
                  onClick={onClearFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((row) => {
                const active = selectedRow?.id === row.id && detailOpen;
                const meta = campaignStatusMeta(row.status);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border text-[9px] font-bold uppercase",
                          active || row.status === "RUNNING"
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {campaignInitials(row.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[11.5px]" : "text-[13px]",
                          )}
                        >
                          {row.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {campaignWhenLabel(row)} · {scopeLabel(row)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-none border px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                          statusChipClass(row.status),
                        )}
                      >
                        {meta.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = selectedRow && detailOpen ? (
    <PromotionsFocus
      row={selectedRow}
      scopeLabel={scopeLabel(selectedRow)}
      className="h-full min-h-0"
    />
  ) : (
    <PromotionsPulse
      stats={stats}
      totalCampaigns={rows.length}
      rows={rows}
      onSelect={onSelect}
      onCreate={onCreate}
      className="h-full min-h-0"
    />
  );

  const inspect = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Details
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a promotion
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The centre shows reach and schedule. Select a campaign to send, pause,
          or review delivery in the dock.
        </p>
      </div>
      <div className="space-y-2">
        {stats.active > 0 ? (
          <p
            className={cn(
              dashboardHintClass(),
              "flex items-center gap-1.5 text-[var(--pos-primary,#0f766e)]",
            )}
          >
            <LiveDot />
            {stats.active} sending now
          </p>
        ) : null}
        {stats.scheduled > 0 ? (
          <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
            <CalendarClock className="size-3.5 shrink-0" aria-hidden />
            {stats.scheduled} scheduled
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <PromotionsBanner
        statusTab={statusTab}
        onStatusTab={onStatusTab}
        tabCounts={tabCounts}
        search={search}
        loading={loading}
        shownCount={filtered.length}
        totalCount={rows.length}
        onReload={onReload}
        onCreate={onCreate}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            {selectedRow && detailOpen ? "Campaign" : "Promo pulse"}
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {dockOccupied ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>
    </div>
  );
}
