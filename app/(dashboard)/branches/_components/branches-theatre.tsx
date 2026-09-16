"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Store,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { BranchRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  BranchDetailPanel,
  type BranchEditRow,
} from "./branch-detail-drawer";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function branchInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadgeClass(active: boolean): string {
  return active
    ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white"
    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground";
}

function addressSnippet(address: string | null | undefined): string {
  const t = (address ?? "").trim();
  if (!t) return "No address";
  return t.length > 42 ? `${t.slice(0, 40)}…` : t;
}

export type BranchesTheatreProps = {
  rows: BranchRecord[];
  filteredRows: BranchRecord[];
  edits: Record<string, BranchEditRow>;
  onEditChange: (branchId: string, next: BranchEditRow) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterActive: "all" | "active" | "inactive";
  onFilterActive: (value: "all" | "active" | "inactive") => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  stats: { total: number; active: number; inactive: number };
  canManage: boolean;
  selectedId: string | null;
  selectedBranch: BranchRecord | null;
  onSelect: (branch: BranchRecord) => void;
  onClearSelection: () => void;
  mobileShowDetail: boolean;
  savingId: string | null;
  onSave: (branchId: string) => void;
  onAddBranch?: () => void;
};

function BranchesContextBanner({
  stats,
  filteredCount,
  totalCount,
  canManage,
}: {
  stats: { total: number; active: number; inactive: number };
  filteredCount: number;
  totalCount: number;
  canManage: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {stats.total} {stats.total === 1 ? "location" : "locations"}
        </span>
        <span className={dashboardHintClass()}>
          {stats.active} active · {stats.inactive} inactive
        </span>
        {filteredCount !== totalCount ? (
          <span className={dashboardHintClass()}>
            · showing {filteredCount} of {totalCount}
          </span>
        ) : null}
      </p>
      {!canManage ? (
        <span className={cn(dashboardHintClass(), "text-[#9a2e16]")}>
          View only — needs{" "}
          <span className="font-mono text-[10px]">business.manage_settings</span>
        </span>
      ) : (
        <span className={cn(dashboardHintClass(), "hidden sm:inline")}>
          Save persists name, address, status, and receipt block together.
        </span>
      )}
    </div>
  );
}

function BranchPulse({
  stats,
  rows,
  onSelect,
  onAddBranch,
  className,
}: {
  stats: { total: number; active: number; inactive: number };
  rows: BranchRecord[];
  onSelect: (branch: BranchRecord) => void;
  onAddBranch?: () => void;
  className?: string;
}) {
  const inactiveRows = useMemo(
    () => rows.filter((b) => !b.active).slice(0, 4),
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
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 52 C 30 72, 48 78, 38 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {onAddBranch ? (
        <div className="absolute right-3 top-3 z-[2]">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-none shadow-none"
            onClick={onAddBranch}
          >
            <Plus className="size-3.5" aria-hidden />
            Add branch
          </Button>
        </div>
      ) : null}

      <article className={cn(card, "left-[8%] top-[18%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Total locations
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {stats.total}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Branches on this workspace
        </p>
      </article>

      <article className={cn(card, "right-[6%] top-[38%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Active
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--pos-primary,#0f766e)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {stats.active}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Available for assignment &amp; POS
        </p>
      </article>

      <article className={cn(card, "left-[12%] bottom-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Inactive
        </p>
        <p
          className={cn(
            "mt-2 text-[1.65rem] font-semibold leading-none tracking-[-0.04em] tabular-nums",
            stats.inactive > 0 ? "text-[#9a2e16]" : "text-foreground",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {stats.inactive}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Hidden from active pickers
        </p>
      </article>

      {inactiveRows.length > 0 ? (
        <article className={cn(card, "right-[5%] bottom-[8%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Inactive branches
          </p>
          <ul className="mt-2 space-y-1.5">
            {inactiveRows.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b)}
                  className="text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function BranchFocus({
  branch,
  editRow,
  className,
}: {
  branch: BranchRecord;
  editRow: BranchEditRow | undefined;
  className?: string;
}) {
  const active = editRow?.active ?? branch.active;
  const name = editRow?.name.trim() || branch.name;
  const address = editRow?.address.trim() || branch.address;

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
      <div className="relative z-[1] flex max-w-sm flex-col items-center text-center">
        <span
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-[1.1rem] font-bold tracking-wide text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          {branchInitials(name)}
        </span>
        <h3
          className="mt-4 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {name}
        </h3>
        <p className="mt-2 flex max-w-full items-center justify-center gap-1 text-[12px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{addressSnippet(address)}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
              statusBadgeClass(active),
            )}
          >
            {active ? "Active" : "Inactive"}
          </span>
          {editRow?.receipt.phone ? (
            <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-foreground">
              {editRow.receipt.phone}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BranchesTheatre(props: BranchesTheatreProps) {
  const {
    rows,
    filteredRows,
    edits,
    onEditChange,
    search,
    onSearchChange,
    filterActive,
    onFilterActive,
    activeFilterCount,
    onClearFilters,
    stats,
    canManage,
    selectedId,
    selectedBranch,
    onSelect,
    onClearSelection,
    mobileShowDetail,
    savingId,
    onSave,
    onAddBranch,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const mobileDetailOpen = mobileShowDetail && !!selectedBranch;

  const selectedEdit = selectedBranch ? edits[selectedBranch.id] : undefined;

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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Name, address, or ID…"
              aria-label="Search branches"
            />
          </label>
          <select
            className={cn(dashboardSelectClass(), "h-8 w-full py-0 text-[11px]")}
            value={filterActive}
            onChange={(e) =>
              onFilterActive(e.target.value as "all" | "active" | "inactive")
            }
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {filteredRows.length}
              {search.trim() || activeFilterCount > 0
                ? ` of ${rows.length}`
                : ""}{" "}
              {filteredRows.length === 1 ? "branch" : "branches"}
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={onClearFilters}
                className={cn(
                  dashboardHintClass(),
                  "underline-offset-2 hover:text-foreground hover:underline",
                )}
              >
                Clear filters
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
          {rows.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <Store
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                No branches yet
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                {canManage
                  ? "Add a location to get started."
                  : "Ask an admin to create locations."}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {search.trim()
                ? `No branches match “${search.trim()}”.`
                : "No branches match these filters."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredRows.map((branch) => {
                const active = selectedId === branch.id;
                return (
                  <li key={branch.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(branch)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
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
                          "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase tracking-wide",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {branchInitials(branch.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {branch.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {addressSnippet(branch.address)}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.02em]",
                            statusBadgeClass(branch.active),
                          )}
                        >
                          {branch.active ? "Active" : "Inactive"}
                        </span>
                        {!denser ? (
                          <ChevronRight
                            className="size-4 text-muted-foreground/70"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {canManage && onAddBranch ? (
          <button
            type="button"
            className={cn(
              dashboardHintClass(),
              "shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 text-left underline-offset-4 hover:text-foreground hover:underline sm:px-3",
            )}
            onClick={onAddBranch}
          >
            Add another branch
          </button>
        ) : null}
      </div>
    );
  };

  const room = selectedBranch ? (
    <BranchFocus
      branch={selectedBranch}
      editRow={selectedEdit}
      className="h-full min-h-0"
    />
  ) : (
    <BranchPulse
      stats={stats}
      rows={rows}
      onSelect={onSelect}
      onAddBranch={canManage ? onAddBranch : undefined}
      className="h-full min-h-0"
    />
  );

  const inspect =
    selectedBranch && selectedEdit ? (
      <BranchDetailPanel
        branch={selectedBranch}
        row={selectedEdit}
        onRowChange={(next) => onEditChange(selectedBranch.id, next)}
        canManage={canManage}
        saving={savingId === selectedBranch.id}
        onSave={() => onSave(selectedBranch.id)}
      />
    ) : selectedBranch && !selectedEdit ? (
      <div className="flex h-full flex-col bg-white px-4 py-6">
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Could not load edit state for this branch.
        </p>
      </div>
    ) : (
      <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dossier
          </p>
          <h3
            className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Pick a branch
          </h3>
          <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
            The map in the middle is your network. The list on the left names
            each location — select one to edit details and receipt settings.
          </p>
        </div>
        {stats.inactive > 0 ? (
          <p
            className={cn(
              dashboardHintClass(),
              "flex items-center gap-1.5 text-[#9a2e16]",
            )}
          >
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {stats.inactive} inactive — hidden from pickers
          </p>
        ) : null}
      </div>
    );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <BranchesContextBanner
        stats={stats}
        filteredCount={filteredRows.length}
        totalCount={rows.length}
        canManage={canManage}
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
            The network
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedBranch ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={mobileDetailOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Branch"
        title={selectedBranch?.name ?? "Branch"}
        description={
          selectedBranch
            ? addressSnippet(
                edits[selectedBranch.id]?.address ?? selectedBranch.address,
              )
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selectedBranch && selectedEdit ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            <BranchDetailPanel
              branch={selectedBranch}
              row={selectedEdit}
              onRowChange={(next) => onEditChange(selectedBranch.id, next)}
              canManage={canManage}
              saving={savingId === selectedBranch.id}
              onSave={() => onSave(selectedBranch.id)}
            />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
