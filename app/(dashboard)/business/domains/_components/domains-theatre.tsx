"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Star,
} from "lucide-react";

import { BuyKenyanDomainWizard } from "@/components/business/buy-kenyan-domain-wizard";
import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { DomainRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  DomainChip,
  domainInitials,
  sourceLabel,
  statusMeta,
} from "./domain-helpers";

export type TabId = "buy" | "manage" | "connect";

export type DomainOrderStats = {
  open: number;
  awaitingPay: number;
  reload: () => Promise<unknown>;
};

export type DomainsTheatreProps = {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  rows: DomainRecord[];
  filtered: DomainRecord[];
  query: string;
  onQueryChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  showListLoading: boolean;
  loadFailed: boolean;
  onReload: () => void;
  liveCount: number;
  pendingCount: number;
  orderStats: DomainOrderStats;
  platformRow: DomainRecord | undefined;
  selectedRow: DomainRecord | null;
  detailOpen: boolean;
  onSelect: (row: DomainRecord) => void;
  onConnectOpen: () => void;
  onBuyLive: () => void;
  rowBusyId: string | null;
  dockRef?: (node: HTMLDivElement | null) => void;
};

function DomainsBanner({
  tab,
  onTabChange,
  liveCount,
  pendingCount,
  orderStats,
  platformDomain,
  onReload,
  onConnectOpen,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  liveCount: number;
  pendingCount: number;
  orderStats: DomainOrderStats;
  platformDomain: string | null;
  onReload: () => void;
  onConnectOpen: () => void;
}) {
  const tabs: {
    id: TabId;
    label: string;
    icon: typeof Globe;
    count?: number;
  }[] = [
    {
      id: "buy",
      label: "Buy",
      icon: ShoppingCart,
      count: orderStats.awaitingPay || undefined,
    },
    {
      id: "manage",
      label: "Manage",
      icon: Globe,
    },
    { id: "connect", label: "Connect", icon: Link2 },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <div
        role="tablist"
        aria-label="Domains mode"
        className="flex flex-wrap gap-1"
      >
        {tabs.map(({ id, label, icon: Icon, count }) => {
          const active = tab === id;
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
              onClick={() => onTabChange(id)}
            >
              <Icon className="size-3" aria-hidden />
              {label}
              {count != null && count > 0 ? (
                <span
                  className={cn(
                    "rounded-none px-1 py-0 text-[9px] tabular-nums",
                    active ? "text-white/90" : "opacity-80",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />

      <p className={cn(dashboardHintClass(), "tabular-nums")}>
        <span className="font-semibold text-foreground">{liveCount}</span> live
        ·{" "}
        <span className="font-semibold text-foreground">{pendingCount}</span>{" "}
        pending
        {orderStats.open > 0 ? (
          <>
            {" "}
            ·{" "}
            <span className="font-semibold text-foreground">
              {orderStats.open}
            </span>{" "}
            purchase{orderStats.open === 1 ? "" : "s"}
          </>
        ) : null}
      </p>

      {platformDomain ? (
        <p
          className={cn(
            dashboardHintClass(),
            "hidden min-w-0 truncate font-mono text-[11px] lg:block",
          )}
          title={platformDomain}
        >
          Free URL · {platformDomain}
        </p>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => onReload()}
        >
          <RefreshCw className="size-3" aria-hidden />
          Reload
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={onConnectOpen}
        >
          <Plus className="size-3" aria-hidden />
          Connect
        </Button>
      </div>
    </div>
  );
}

function DomainPulse({
  liveCount,
  pendingCount,
  orderStats,
  platformRow,
  onTabChange,
  onSelect,
  rows,
  className,
}: {
  liveCount: number;
  pendingCount: number;
  orderStats: DomainOrderStats;
  platformRow: DomainRecord | undefined;
  onTabChange: (tab: TabId) => void;
  onSelect: (row: DomainRecord) => void;
  rows: DomainRecord[];
  className?: string;
}) {
  const attention = useMemo(
    () => rows.filter((r) => !r.active && (r.source || "") !== "platform_subdomain"),
    [rows],
  );

  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M8 72 Q 50 38 92 72"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="50"
          cy="42"
          r="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.5 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <article className={cn(card, "left-4 top-4")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Hostnames
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] p-2 text-left transition-colors hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)]"
            onClick={() => onTabChange("manage")}
          >
            <p className="text-[10px] text-muted-foreground">Live</p>
            <p
              className="mt-0.5 text-xl font-semibold tabular-nums tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {liveCount}
            </p>
          </button>
          <button
            type="button"
            className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] p-2 text-left transition-colors hover:border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)]"
            onClick={() => onTabChange("manage")}
          >
            <p className="text-[10px] text-muted-foreground">Pending</p>
            <p
              className="mt-0.5 text-xl font-semibold tabular-nums tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {pendingCount}
            </p>
          </button>
        </div>
        {orderStats.open > 0 ? (
          <button
            type="button"
            className={cn(
              dashboardHintClass(),
              "mt-2 text-left underline-offset-2 hover:underline",
            )}
            onClick={() => onTabChange("buy")}
          >
            {orderStats.open} open purchase
            {orderStats.awaitingPay
              ? ` · ${orderStats.awaitingPay} awaiting pay`
              : ""}
          </button>
        ) : null}
      </article>

      {platformRow ? (
        <article className={cn(card, "bottom-4 right-4")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Free shop URL
          </p>
          <p className="mt-1 truncate font-mono text-[13px] font-semibold">
            {platformRow.domain}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-2 h-7 gap-1 text-[11px]"
          >
            <a
              href={`https://${platformRow.domain}`}
              target="_blank"
              rel="noreferrer"
            >
              Visit
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </Button>
        </article>
      ) : null}

      {attention.length > 0 ? (
        <article className={cn(card, "bottom-4 left-4 max-h-[40%] overflow-y-auto")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Needs DNS
          </p>
          <ul className="mt-2 space-y-1">
            {attention.slice(0, 5).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  className="text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                >
                  {r.domain}
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function DomainFocus({
  row,
  className,
}: {
  row: DomainRecord;
  className?: string;
}) {
  const badge = statusMeta(row);
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
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white font-mono text-[1rem] font-bold tracking-wide text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          {domainInitials(row.domain)}
        </span>
        <h3
          className="mt-4 break-all text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {row.domain}
        </h3>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <DomainChip className={badge.className}>{badge.text}</DomainChip>
          <DomainChip className="border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground">
            {sourceLabel(row)}
          </DomainChip>
          {row.primary ? (
            <DomainChip className="border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]">
              <Star className="mr-0.5 inline size-3" aria-hidden />
              Primary
            </DomainChip>
          ) : null}
        </div>
        {row.active ? (
          <Button asChild variant="outline" size="sm" className="mt-5 gap-1.5">
            <a href={`https://${row.domain}`} target="_blank" rel="noreferrer">
              Visit site
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ConnectCenter({
  onConnectOpen,
  onTabChange,
  className,
}: {
  onConnectOpen: () => void;
  onTabChange: (tab: TabId) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto p-6",
        className,
      )}
    >
      <div className={cn(DASHBOARD_SECTION_SURFACE, "max-w-lg w-full")}>
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-none border border-border/60 bg-muted/40 text-muted-foreground">
            <Link2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Already own a domain?
            </h2>
            <p className={cn(dashboardHintClass(), "mt-2")}>
              Connect a hostname you manage elsewhere. We&apos;ll show DNS
              records, then you verify when they&apos;ve propagated.
            </p>
            <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                Enter the apex or subdomain you want to map.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                Update DNS at your registrar.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                Verify from domain details when ready.
              </li>
            </ol>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                className="gap-1.5"
                onClick={onConnectOpen}
              >
                <Plus className="size-3.5" aria-hidden />
                Connect domain
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onTabChange("manage")}
              >
                View your domains
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuyCenter({
  onBuyLive,
  className,
}: {
  onBuyLive: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5",
        className,
      )}
    >
      <div className={cn(DASHBOARD_SECTION_SURFACE, "space-y-4")}>
        <div className="min-w-0 max-w-xl">
          <p className="font-sans text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
            Kenyan TLDs
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Find and buy your .ke name
          </h2>
          <p className={cn(dashboardHintClass(), "mt-1.5")}>
            Search availability, pay with M-Pesa, and we register it for you.
          </p>
        </div>
        <BuyKenyanDomainWizard embedded onLive={onBuyLive} />
      </div>
    </div>
  );
}

export function DomainsTheatre(props: DomainsTheatreProps) {
  const {
    tab,
    onTabChange,
    rows,
    filtered,
    query,
    onQueryChange,
    sourceFilter,
    onSourceFilterChange,
    showListLoading,
    loadFailed,
    onReload,
    liveCount,
    pendingCount,
    orderStats,
    platformRow,
    selectedRow,
    detailOpen,
    onSelect,
    onConnectOpen,
    onBuyLive,
    rowBusyId,
    dockRef,
  } = props;

  const isLg = useMediaLg();

  const setDockRoot = (node: HTMLDivElement | null) => {
    dockRef?.(node);
  };

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
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search domains…"
              aria-label="Search domains"
            />
          </label>
          <select
            className={cn(dashboardSelectClass(), "h-8 w-full py-0 text-[11px]")}
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            <option value="platform_subdomain">Platform</option>
            <option value="hostafrica_purchase">Purchased</option>
            <option value="manual_connect">Connected</option>
          </select>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filtered.length}
            {query.trim() || sourceFilter !== "all"
              ? ` of ${rows.length}`
              : ""}{" "}
            {filtered.length === 1 ? "domain" : "domains"}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {showListLoading ? (
            <div className="space-y-2 px-2 py-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-none border border-border/50 bg-muted/30"
                />
              ))}
            </div>
          ) : loadFailed ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-[#9a2e16]">
                Could not load domains
              </p>
              <Button
                className="mt-3 gap-2"
                variant="outline"
                size="sm"
                onClick={() => onReload()}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                Try again
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Globe
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                No domains yet
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                Buy a .ke name or connect one you own.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTabChange("buy")}
                >
                  Buy
                </Button>
                <Button size="sm" onClick={onConnectOpen}>
                  Connect
                </Button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {query.trim()
                ? `No domains match “${query.trim()}”.`
                : "No domains match this filter."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((row) => {
                const active = selectedRow?.id === row.id;
                const badge = statusMeta(row);
                const busyRow = rowBusyId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (tab !== "manage") onTabChange("manage");
                        onSelect(row);
                      }}
                      disabled={busyRow}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                        busyRow && "opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center border font-mono text-[9px] font-bold uppercase",
                          active || row.active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {busyRow ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          domainInitials(row.domain)
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-mono font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[11.5px]" : "text-[13px]",
                          )}
                        >
                          {row.domain}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {sourceLabel(row)}
                          {row.primary ? " · Primary" : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-none border px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                          badge.className,
                        )}
                      >
                        {badge.text}
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

  const room =
    tab === "buy" ? (
      <BuyCenter onBuyLive={onBuyLive} className="h-full min-h-0" />
    ) : tab === "connect" ? (
      <ConnectCenter
        onConnectOpen={onConnectOpen}
        onTabChange={onTabChange}
        className="h-full min-h-0"
      />
    ) : selectedRow ? (
      <DomainFocus row={selectedRow} className="h-full min-h-0" />
    ) : (
      <DomainPulse
        liveCount={liveCount}
        pendingCount={pendingCount}
        orderStats={orderStats}
        platformRow={platformRow}
        onTabChange={onTabChange}
        onSelect={onSelect}
        rows={rows}
        className="h-full min-h-0"
      />
    );

  const centerLabel =
    tab === "buy"
      ? "Buy a domain"
      : tab === "connect"
        ? "Connect"
        : "Your domains";

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
          Pick a domain
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The center shows your hostname map. The list names what you have
          mapped.
        </p>
      </div>
      {platformRow ? (
        <div className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)]">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Free shop URL live
          </p>
          <p className="mt-1 truncate font-mono text-[12px]">{platformRow.domain}</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <DomainsBanner
        tab={tab}
        onTabChange={onTabChange}
        liveCount={liveCount}
        pendingCount={pendingCount}
        orderStats={orderStats}
        platformDomain={platformRow?.domain ?? null}
        onReload={onReload}
        onConnectOpen={onConnectOpen}
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
            {centerLabel}
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedRow && detailOpen ? null : inspect}
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
