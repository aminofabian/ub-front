"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  Store,
  UserPlus,
  Users,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  SaMarketplaceSupplierRow,
  SaMarketplaceSupplierStats,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export type PortalFilter = "all" | "has_users" | "needs_invite";
export type ShopFilter = "all" | "linked" | "orphan";
export type SortKey =
  | "updatedAt,desc"
  | "name,asc"
  | "createdAt,desc"
  | "supplierNumber,asc";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "text-[var(--pos-primary,#0f766e)]";
  if (s === "suspended") return "text-[#9a2e16]";
  return "text-muted-foreground";
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ContextBanner({
  stats,
  visibleCount,
  totalElements,
  loading,
}: {
  stats: SaMarketplaceSupplierStats | null;
  visibleCount: number;
  totalElements: number;
  loading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        HAIRLINE,
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {loading ? "—" : totalElements} identit
          {totalElements === 1 ? "y" : "ies"}
        </span>
        <span className={dashboardHintClass()}>
          {loading ? "—" : stats?.active ?? 0} active
          {" · "}
          {loading ? "—" : stats?.needingInvite ?? 0} need invite
          {" · "}
          showing {visibleCount}
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Pick a supplier on the left. Manage shops, invites, and portal users in
        the panel.
      </p>
    </div>
  );
}

function MarketplacePulse({
  stats,
  loading,
  onPickNeedingInvite,
  className,
}: {
  stats: SaMarketplaceSupplierStats | null;
  loading: boolean;
  onPickNeedingInvite: () => void;
  className?: string;
}) {
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
          d="M18 38 C 34 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 52 C 46 62, 64 56, 78 66"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[16%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Identities
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : (stats?.total ?? 0)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading
            ? "Loading"
            : `${stats?.active ?? 0} active · ${stats?.draft ?? 0} draft`}
        </p>
      </div>

      <div className={cn(card, "right-3 top-[10%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Linked shops
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--pos-primary,#0f766e)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : (stats?.withLinkedShops ?? 0)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Suppliers with at least one tenant link
        </p>
      </div>

      <div className={cn(card, "bottom-[18%] left-[8%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Portal
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : (stats?.withPortalUsers ?? 0)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Have portal users · {loading ? "—" : (stats?.needingInvite ?? 0)} need
          invite
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[8%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onPickNeedingInvite}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <UserPlus
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Filter: needs invite
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Show identities with no portal users yet.
        </p>
      </button>
    </div>
  );
}

function MarketplaceFocus({
  supplier,
  className,
}: {
  supplier: SaMarketplaceSupplierRow;
  className?: string;
}) {
  const shopCount = supplier.linkedShopCount ?? 0;
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Store className="size-3" aria-hidden />
          {supplier.supplierNumber || "Marketplace"}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {supplier.name}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {supplier.username ? `@${supplier.username}` : "No public hub username"}
          {" · "}
          Updated {formatWhen(supplier.updatedAt)}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          <span className={cn("font-semibold capitalize", statusTone(supplier.status))}>
            {supplier.status}
          </span>
          {" · "}
          <span className="font-semibold tabular-nums">{supplier.portalUserCount}</span>{" "}
          portal
          {" · "}
          <span className="font-semibold tabular-nums">{shopCount}</span> shop
          {shopCount === 1 ? "" : "s"}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Edit invites and users in the panel
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold tracking-[-0.02em] transition-colors",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
          : cn(HAIRLINE, "bg-white text-muted-foreground hover:text-foreground"),
      )}
    >
      {children}
    </button>
  );
}

export type MarketplaceSuppliersTheatreProps = {
  rows: SaMarketplaceSupplierRow[];
  stats: SaMarketplaceSupplierStats | null;
  loading: boolean;
  busy: boolean;
  totalElements: number;
  totalPages: number;
  page: number;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  portalFilter: PortalFilter;
  onPortalFilterChange: (value: PortalFilter) => void;
  shopFilter: ShopFilter;
  onShopFilterChange: (value: ShopFilter) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  onPageChange: (page: number) => void;
  selected: SaMarketplaceSupplierRow | null;
  onSelect: (row: SaMarketplaceSupplierRow) => void;
  onClearSelection: () => void;
  drawerBody: ReactNode;
};

export function MarketplaceSuppliersTheatre({
  rows,
  stats,
  loading,
  busy,
  totalElements,
  totalPages,
  page,
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
  portalFilter,
  onPortalFilterChange,
  shopFilter,
  onShopFilterChange,
  sort,
  onSortChange,
  onPageChange,
  selected,
  onSelect,
  onClearSelection,
  drawerBody,
}: MarketplaceSuppliersTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const selectRow = (row: SaMarketplaceSupplierRow) => {
    onSelect(row);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSelection = () => {
    onClearSelection();
    setMobileDrawerOpen(false);
  };

  useEffect(() => {
    if (selected && !isLg) setMobileDrawerOpen(true);
  }, [selected, isLg]);

  const drawerOpen = !!selected && (isLg || mobileDrawerOpen);

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
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Search name, S-number, phone…"
              aria-label="Search marketplace suppliers"
            />
          </label>
          <select
            className={cn(dashboardInputClass(), "h-8 cursor-pointer text-[12px]")}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            aria-label="Sort suppliers"
          >
            <option value="updatedAt,desc">Recently updated</option>
            <option value="createdAt,desc">Newest first</option>
            <option value="name,asc">Name A–Z</option>
            <option value="supplierNumber,asc">Supplier number</option>
          </select>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["", "All", stats?.total],
                ["active", "Active", stats?.active],
                ["draft", "Draft", stats?.draft],
                ["suspended", "Susp.", stats?.suspended],
              ] as const
            ).map(([value, label, count]) => (
              <Chip
                key={value || "all"}
                active={statusFilter === value}
                onClick={() => onStatusFilterChange(value)}
              >
                {label}
                {typeof count === "number" ? (
                  <span className="tabular-nums opacity-70">{count}</span>
                ) : null}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip
              active={portalFilter === "all"}
              onClick={() => onPortalFilterChange("all")}
            >
              Any portal
            </Chip>
            <Chip
              active={portalFilter === "has_users"}
              onClick={() => onPortalFilterChange("has_users")}
            >
              Has users
              {typeof stats?.withPortalUsers === "number" ? (
                <span className="tabular-nums opacity-70">
                  {stats.withPortalUsers}
                </span>
              ) : null}
            </Chip>
            <Chip
              active={portalFilter === "needs_invite"}
              onClick={() => onPortalFilterChange("needs_invite")}
            >
              Needs invite
              {typeof stats?.needingInvite === "number" ? (
                <span className="tabular-nums opacity-70">
                  {stats.needingInvite}
                </span>
              ) : null}
            </Chip>
          </div>
          <div className="flex flex-wrap gap-1">
            <Chip
              active={shopFilter === "all"}
              onClick={() => onShopFilterChange("all")}
            >
              Any shops
            </Chip>
            <Chip
              active={shopFilter === "linked"}
              onClick={() => onShopFilterChange("linked")}
            >
              Linked
            </Chip>
            <Chip
              active={shopFilter === "orphan"}
              onClick={() => onShopFilterChange("orphan")}
            >
              No shops
            </Chip>
          </div>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {rows.length} on this page · {totalElements} total
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {rows.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {loading
                ? "Loading identities…"
                : "No suppliers match these filters."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {rows.map((row) => {
                const active = selected?.id === row.id;
                const shopCount = row.linkedShopCount ?? 0;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(row)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center border",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Store className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] leading-snug text-muted-foreground">
                          {row.supplierNumber || row.id.slice(0, 8)}
                          {" · "}
                          <span className={cn("capitalize", statusTone(row.status))}>
                            {row.status}
                          </span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5">
                            <Users className="size-2.5" aria-hidden />
                            {row.portalUserCount}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Building2 className="size-2.5" aria-hidden />
                            {shopCount}
                          </span>
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-2 border-t px-2.5 py-2",
            HAIRLINE,
          )}
        >
          <button
            type="button"
            disabled={busy || page <= 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold disabled:opacity-50",
              HAIRLINE,
            )}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            Prev
          </button>
          <span className={cn(dashboardHintClass(), "tabular-nums")}>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={busy || page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold disabled:opacity-50",
              HAIRLINE,
            )}
          >
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    );
  };

  const room = selected ? (
    <MarketplaceFocus supplier={selected} className="h-full min-h-0" />
  ) : (
    <MarketplacePulse
      stats={stats}
      loading={loading}
      onPickNeedingInvite={() => onPortalFilterChange("needs_invite")}
      className="h-full min-h-0"
    />
  );

  const inspect = selected ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a supplier
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Tenant shop links, portal invites, users, and session controls open in
          this panel.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Store className="size-3.5 shrink-0" aria-hidden />
        Create a draft with New identity
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        stats={stats}
        visibleCount={rows.length}
        totalElements={totalElements}
        loading={loading}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border lg:grid",
          HAIRLINE,
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
            Marketplace floor
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selected ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className={cn("overflow-hidden border bg-white", HAIRLINE)}>
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        contextLabel="Marketplace"
        title={selected?.name ?? "Supplier"}
        description={
          selected
            ? `${selected.supplierNumber || selected.id.slice(0, 8)} · ${selected.status}`
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selected ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {drawerBody}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
