"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { SaBusinessRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | "active" | "inactive" | "stuck";

export type BusinessesPanel =
  | { kind: "create" }
  | { kind: "business"; id: string };

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

function panelEquals(a: BusinessesPanel | null, b: BusinessesPanel) {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "business" && b.kind === "business") return a.id === b.id;
  return true;
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

function ContextBanner({
  counts,
  visibleCount,
  selectedCount,
  loading,
}: {
  counts: { all: number; active: number; inactive: number; stuck: number };
  visibleCount: number;
  selectedCount: number;
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
          {loading ? "—" : counts.all} tenant{counts.all === 1 ? "" : "s"}
        </span>
        <span className={dashboardHintClass()}>
          {loading ? "—" : counts.active} active
          {" · "}
          {loading ? "—" : counts.stuck} stuck
          {" · "}
          showing {visibleCount}
          {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Pick a tenant on the left. Manage domains, users, and plan in the panel.
      </p>
    </div>
  );
}

function BusinessesPulse({
  counts,
  loading,
  onCreate,
  onPickStuck,
  className,
}: {
  counts: { all: number; active: number; inactive: number; stuck: number };
  loading: boolean;
  onCreate: () => void;
  onPickStuck: () => void;
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

      <div className={cn(card, "left-3 top-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Fleet
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : counts.all}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading ? "—" : counts.active} active · {loading ? "—" : counts.inactive}{" "}
          inactive
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "right-3 top-[14%] text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onPickStuck}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Stuck signups
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            !loading && counts.stuck > 0 ? "text-amber-800" : undefined,
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : counts.stuck}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Filter to incomplete onboardings
        </p>
      </button>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onCreate}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Plus
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          New tenant
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Provision a business with Nairobi defaults.
        </p>
      </button>
    </div>
  );
}

function BusinessFocus({
  panel,
  business,
  stuck,
  className,
}: {
  panel: BusinessesPanel;
  business: SaBusinessRow | null;
  stuck: boolean;
  className?: string;
}) {
  if (panel.kind === "create") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
          className,
        )}
      >
        <div className="max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Plus className="size-3" aria-hidden />
            New tenant
          </span>
          <h2
            className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Create tenant
          </h2>
          <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
            Slug drives the default hostname. Attach a custom domain after
            creation if needed.
          </p>
        </div>
        <p
          className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
        >
          <LiveDot />
          Fill the form in the panel
        </p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className={cn("flex h-full items-center justify-center px-5", className)}>
        <p className={dashboardHintClass()}>Tenant not in this list.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
          <Building2 className="size-3" aria-hidden />
          {business.subscriptionTier || "tier"}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {business.name}
        </h2>
        <p className={cn(dashboardHintClass(), "font-mono text-[13px] leading-relaxed")}>
          {business.slug}
          {business.ownerPhone?.trim()
            ? ` · ${business.ownerPhone.trim()}`
            : ""}
        </p>
        {(business.ownerName?.trim() || business.ownerEmail?.trim()) ? (
          <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
            Owner{" "}
            <span className="font-medium text-foreground">
              {business.ownerName?.trim() || "—"}
            </span>
            {business.ownerEmail?.trim()
              ? ` · ${business.ownerEmail.trim()}`
              : ""}
          </p>
        ) : null}
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          <span
            className={cn(
              "font-semibold",
              business.active
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-muted-foreground",
            )}
          >
            {business.active ? "Active" : "Inactive"}
          </span>
          {stuck ? (
            <>
              {" · "}
              <span className="font-semibold text-amber-800">Stuck signup</span>
            </>
          ) : null}
          {" · "}
          created {formatWhen(business.createdAt)}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Manage or remove from the panel
      </p>
    </div>
  );
}

export type BusinessesTheatreProps = {
  rows: SaBusinessRow[];
  stuckIds: Set<string>;
  counts: { all: number; active: number; inactive: number; stuck: number };
  tiers: string[];
  loading: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  tierFilter: string;
  onTierFilterChange: (value: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  selectedIds: string[];
  onToggleSelected: (id: string, checked: boolean) => void;
  onSelectAllVisible: (checked: boolean) => void;
  selected: BusinessesPanel | null;
  onSelect: (panel: BusinessesPanel) => void;
  onClearSelection: () => void;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
  selectionBar?: ReactNode;
};

export function BusinessesTheatre({
  rows,
  stuckIds,
  counts,
  tiers,
  loading,
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
  searchInput,
  onSearchInputChange,
  selectedIds,
  onToggleSelected,
  onSelectAllVisible,
  selected,
  onSelect,
  onClearSelection,
  drawerBody,
  drawerFooter,
  selectionBar,
}: BusinessesTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return rows.filter((b) => {
      const phone = b.ownerPhone?.trim().toLowerCase() ?? "";
      const ownerName = b.ownerName?.trim().toLowerCase() ?? "";
      const ownerEmail = b.ownerEmail?.trim().toLowerCase() ?? "";
      if (
        q &&
        !b.name.toLowerCase().includes(q) &&
        !b.slug.toLowerCase().includes(q) &&
        !b.id.toLowerCase().includes(q) &&
        !phone.includes(q) &&
        !ownerName.includes(q) &&
        !ownerEmail.includes(q)
      ) {
        return false;
      }
      if (statusFilter === "active" && !b.active) return false;
      if (statusFilter === "inactive" && b.active) return false;
      if (statusFilter === "stuck" && !stuckIds.has(b.id)) return false;
      if (
        tierFilter.trim() &&
        b.subscriptionTier.toLowerCase() !== tierFilter.trim().toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [rows, searchInput, statusFilter, tierFilter, stuckIds]);

  const selectedBusiness =
    selected?.kind === "business"
      ? (rows.find((r) => r.id === selected.id) ?? null)
      : null;

  const allVisibleSelected =
    filteredRows.length > 0 &&
    filteredRows.every((b) => selectedIds.includes(b.id));
  const someVisibleSelected = filteredRows.some((b) =>
    selectedIds.includes(b.id),
  );

  const selectPanel = (panel: BusinessesPanel) => {
    onSelect(panel);
    if (panel.kind === "business") {
      history.replaceState(null, "", `#business-${panel.id}`);
    } else {
      history.replaceState(null, "", `#create`);
    }
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSelection = () => {
    onClearSelection();
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  useEffect(() => {
    if (selected && !isLg) setMobileDrawerOpen(true);
  }, [selected, isLg]);

  const drawerOpen = !!selected && (isLg || mobileDrawerOpen);

  const drawerTitle =
    selected?.kind === "create"
      ? "Create tenant"
      : selectedBusiness?.name ?? "Tenant";

  const drawerDescription =
    selected?.kind === "create"
      ? "Provision a new business with Nairobi defaults"
      : selectedBusiness
        ? `${selectedBusiness.slug} · ${selectedBusiness.active ? "active" : "inactive"}`
        : undefined;

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
              placeholder="Search name, owner, slug, phone, ID…"
              aria-label="Search tenants"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All", counts.all],
                ["active", "Active", counts.active],
                ["inactive", "Off", counts.inactive],
                ["stuck", "Stuck", counts.stuck],
              ] as const
            ).map(([value, label, count]) => (
              <Chip
                key={value}
                active={statusFilter === value}
                onClick={() => onStatusFilterChange(value)}
              >
                {label}
                <span className="tabular-nums opacity-70">{count}</span>
              </Chip>
            ))}
          </div>
          {tiers.length > 0 ? (
            <select
              className={cn(dashboardInputClass(), "h-8 cursor-pointer text-[12px]")}
              value={tierFilter}
              onChange={(e) => onTierFilterChange(e.target.value)}
              aria-label="Filter by subscription tier"
            >
              <option value="">All tiers</option>
              {tiers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                }}
                onChange={(e) => onSelectAllVisible(e.target.checked)}
                aria-label="Select all visible tenants"
              />
              Select visible
            </label>
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {filteredRows.length} shown
              {loading ? " · loading…" : ""}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            <li>
              <button
                type="button"
                onClick={() => selectPanel({ kind: "create" })}
                className={cn(
                  "relative flex w-full items-start gap-2.5 text-left transition-colors",
                  denser
                    ? "px-2.5 py-2 sm:px-3"
                    : "min-h-[3.25rem] px-3 py-3",
                  panelEquals(selected, { kind: "create" })
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                    : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                )}
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]">
                  <Plus className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold tracking-[-0.015em] text-foreground",
                      denser ? "text-[12.5px]" : "text-[14px]",
                    )}
                  >
                    New tenant
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                    Provision a business
                  </p>
                </div>
              </button>
            </li>

            {filteredRows.length === 0 ? (
              <li>
                <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
                  {loading
                    ? "Loading tenants…"
                    : searchInput.trim()
                      ? `No tenants match “${searchInput.trim()}”.`
                      : "No tenants in this view."}
                </p>
              </li>
            ) : (
              filteredRows.map((row) => {
                const active = panelEquals(selected, {
                  kind: "business",
                  id: row.id,
                });
                const checked = selectedIds.includes(row.id);
                const stuck = stuckIds.has(row.id);
                return (
                  <li key={row.id}>
                    <div
                      className={cn(
                        "relative flex w-full items-start gap-2 text-left",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : checked
                            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]"
                            : null,
                      )}
                    >
                      <label className="mt-1.5 flex size-5 shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                          checked={checked}
                          onChange={(e) =>
                            onToggleSelected(row.id, e.target.checked)
                          }
                          aria-label={`Select ${row.name}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          selectPanel({ kind: "business", id: row.id })
                        }
                        className="flex min-w-0 flex-1 items-start gap-2.5 text-left transition-colors"
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
                          <Building2 className="size-3.5" />
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
                            {row.slug}
                            {" · "}
                            <span
                              className={
                                row.active
                                  ? "text-[var(--pos-primary,#0f766e)]"
                                  : undefined
                              }
                            >
                              {row.active ? "active" : "inactive"}
                            </span>
                            {stuck ? (
                              <span className="text-amber-800"> · stuck</span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] leading-snug text-muted-foreground">
                            {row.ownerName?.trim() || row.ownerEmail?.trim()
                              ? [
                                  row.ownerName?.trim() || null,
                                  row.ownerEmail?.trim() || null,
                                  row.ownerPhone?.trim() || null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : row.ownerPhone?.trim()
                                ? row.ownerPhone.trim()
                                : "No owner linked"}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                            <span className="capitalize">
                              {row.subscriptionTier}
                            </span>
                            <span>{formatWhen(row.createdAt)}</span>
                          </p>
                        </div>
                        {!denser ? (
                          <ChevronRight
                            className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    );
  };

  const room = selected ? (
    <BusinessFocus
      panel={selected}
      business={selectedBusiness}
      stuck={selectedBusiness ? stuckIds.has(selectedBusiness.id) : false}
      className="h-full min-h-0"
    />
  ) : (
    <BusinessesPulse
      counts={counts}
      loading={loading}
      onCreate={() => selectPanel({ kind: "create" })}
      onPickStuck={() => onStatusFilterChange("stuck")}
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
          Pick a tenant
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Open manage for domains and users, or create a new business in this
          panel.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        Deep links use #create or #business-id
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        counts={counts}
        visibleCount={filteredRows.length}
        selectedCount={selectedIds.length}
        loading={loading}
      />
      {selectionBar}

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
            Tenant floor
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
        contextLabel="Tenants"
        title={drawerTitle}
        description={drawerDescription}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={drawerFooter}
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
