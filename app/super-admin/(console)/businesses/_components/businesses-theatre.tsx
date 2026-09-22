"use client";

import { useMemo, type ReactNode } from "react";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SaBusinessRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export type StatusFilter = "all" | "active" | "inactive" | "stuck";

export type BusinessesPanel =
  | { kind: "create" }
  | { kind: "business"; id: string };

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

function LiveDot({ live = false }: { live?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0",
        live
          ? "bg-emerald-500 shadow-[0_0_0_2px_color-mix(in_srgb,rgb(16,185,129)_25%,transparent)]"
          : "bg-[var(--pos-primary,#0f766e)]",
      )}
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
  tenantsOnline,
  tenantsOnSupport,
  visibleCount,
  selectedCount,
  loading,
}: {
  counts: { all: number; active: number; inactive: number; stuck: number };
  tenantsOnline: number | null;
  tenantsOnSupport: number;
  visibleCount: number;
  selectedCount: number;
  loading: boolean;
}) {
  const onlineLabel = tenantsOnline === null ? "—" : String(tenantsOnline);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        HAIRLINE,
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span
          className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"
          title="Distinct tenants with an open app / till / dashboard socket"
        >
          <LiveDot live />
          {onlineLabel} online
        </span>
        <span className={dashboardHintClass()}>
          {tenantsOnline === null
            ? "checking…"
            : `${tenantsOnSupport} on support`}
          {" · "}
          {loading ? "—" : counts.all} tenants
          {" · "}
          {loading ? "—" : counts.active} active
          {" · "}
          {loading ? "—" : counts.stuck} stuck
          {" · "}
          {visibleCount} shown
          {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
        </span>
      </p>
    </div>
  );
}

export type BusinessesTheatreProps = {
  rows: SaBusinessRow[];
  stuckIds: Set<string>;
  counts: { all: number; active: number; inactive: number; stuck: number };
  /** Distinct tenants with an open realtime socket; null while first fetch runs. */
  tenantsOnline: number | null;
  tenantsOnSupport: number;
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
  modalBody: ReactNode;
  modalFooter?: ReactNode;
  selectionBar?: ReactNode;
};

export function BusinessesTheatre({
  rows,
  stuckIds,
  counts,
  tenantsOnline,
  tenantsOnSupport,
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
  modalBody,
  modalFooter,
  selectionBar,
}: BusinessesTheatreProps) {
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
  };

  const clearSelection = () => {
    onClearSelection();
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const modalTitle =
    selected?.kind === "create"
      ? "New tenant"
      : (selectedBusiness?.name ?? "Tenant");

  const modalDescription =
    selected?.kind === "create"
      ? "Name and slug are required. Defaults use Nairobi / KES."
      : selectedBusiness
        ? `${selectedBusiness.slug} · ${selectedBusiness.active ? "active" : "inactive"}`
        : "Tenant details";

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        counts={counts}
        tenantsOnline={tenantsOnline}
        tenantsOnSupport={tenantsOnSupport}
        visibleCount={filteredRows.length}
        selectedCount={selectedIds.length}
        loading={loading}
      />
      {selectionBar}

      <div className={cn("overflow-hidden border bg-white", HAIRLINE)}>
        <div className="space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3">
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(dashboardInputClass(), "h-9 pl-7 text-[13px]")}
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
              className={cn(
                dashboardInputClass(),
                "h-8 cursor-pointer text-[12px]",
              )}
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
                  if (el)
                    el.indeterminate =
                      someVisibleSelected && !allVisibleSelected;
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

        <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
          <li>
            <button
              type="button"
              onClick={() => selectPanel({ kind: "create" })}
              className={cn(
                "relative flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors",
                "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
              )}
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]">
                <Plus className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-foreground">
                  New tenant
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  Create a business
                </p>
              </div>
              <ChevronRight
                className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
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
                      "relative flex w-full items-start gap-2 px-3 py-3 text-left",
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
                        <p className="truncate text-[14px] font-semibold tracking-[-0.015em] text-foreground">
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
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                        aria-hidden
                      />
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
      >
        <DialogContent
          className="max-h-[min(90dvh,40rem)] gap-0 overflow-hidden rounded-none border p-0 sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12">
            <DialogTitle className="text-[15px] font-semibold tracking-tight">
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {modalDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {selected ? modalBody : null}
          </div>

          {modalFooter ? (
            <DialogFooter className="shrink-0 border-t border-border px-4 py-2.5 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-none"
                onClick={clearSelection}
              >
                Close
              </Button>
              <div className="flex flex-wrap justify-end gap-2">{modalFooter}</div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
