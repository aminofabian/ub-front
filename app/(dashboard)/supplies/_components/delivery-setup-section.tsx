"use client";

import { Building2, ChevronDown, Loader2, Search, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { ExtraCostsBody, type ExtraRow } from "./extra-costs-section";
import {
  nsdFieldLabel,
  nsdInput,
  nsdSelect,
  nsdTextarea,
} from "./new-supply-drawer-ui";

const nsdSetupBlock = cn(
  "overflow-hidden border border-border bg-card",
);

function SetupBlock({
  step,
  title,
  children,
  className,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(nsdSetupBlock, className)}>
      <div className="flex items-center gap-2 border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
        <span
          className="flex size-4 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-[9px] font-bold tabular-nums text-primary"
          aria-hidden
        >
          {step}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="p-2 sm:p-2.5">{children}</div>
    </div>
  );
}

function formatReceivedShort(value: string): string {
  if (!value.trim()) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DeliverySetupSectionProps = {
  busy: boolean;
  supplier: SupplierRecord | null;
  supplierQuery: string;
  supplierHits: SupplierRecord[];
  supplierLoading: boolean;
  onSupplierQueryChange: (value: string) => void;
  onSelectSupplier: (supplier: SupplierRecord) => void;
  onClearSupplier: () => void;
  branchId: string;
  branches: { id: string; name: string }[];
  branchesLoading: boolean;
  branchLocked: boolean;
  selectedBranchName: string;
  onBranchChange: (branchId: string) => void;
  receivedAtLocal: string;
  onReceivedAtChange: (value: string) => void;
  docRef: string;
  onDocRefChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  extras: ExtraRow[];
  onExtrasChange: (extras: ExtraRow[]) => void;
  showExtras: boolean;
  /** When true and a supplier is selected, show a one-line summary instead of the full form. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function DeliverySetupSection({
  busy,
  supplier,
  supplierQuery,
  supplierHits,
  supplierLoading,
  onSupplierQueryChange,
  onSelectSupplier,
  onClearSupplier,
  branchId,
  branches,
  branchesLoading,
  branchLocked,
  selectedBranchName,
  onBranchChange,
  receivedAtLocal,
  onReceivedAtChange,
  docRef,
  onDocRefChange,
  notes,
  onNotesChange,
  extras,
  onExtrasChange,
  showExtras,
  collapsed = false,
  onToggleCollapsed,
}: DeliverySetupSectionProps) {
  const extrasOpen = extras.length > 0;

  if (collapsed && supplier) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-primary/25 bg-primary/[0.04] px-2.5 py-2">
        <span className="flex size-6 shrink-0 items-center justify-center border border-primary/25 bg-background text-primary">
          <Truck className="size-3" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {supplier.name}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {[
              selectedBranchName || null,
              formatReceivedShort(receivedAtLocal),
              docRef.trim() || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 rounded-none px-2 text-[11px] touch-manipulation"
          disabled={busy}
          onClick={onToggleCollapsed}
        >
          Edit
          <ChevronDown className="size-3" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {supplier && onToggleCollapsed ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={onToggleCollapsed}
          >
            Collapse setup
          </button>
        </div>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-2 lg:gap-2.5">
        <SetupBlock step="1" title="Vendor" className="relative z-20 overflow-visible">
          {supplier ? (
            <div className="flex items-start gap-2 border border-primary/30 bg-primary/[0.05] px-2 py-1.5">
              <span className="flex size-7 shrink-0 items-center justify-center border border-primary/25 bg-background text-primary">
                <Truck className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {supplier.name}
                </p>
                {supplier.code?.trim() ? (
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {supplier.code.trim()}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Supplier selected
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-none px-2.5 text-xs touch-manipulation"
                disabled={busy}
                onClick={onClearSupplier}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  className={cn(nsdInput, "bg-background pl-9")}
                  placeholder="Search or pick a vendor…"
                  value={supplierQuery}
                  onChange={(e) => onSupplierQueryChange(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                  autoFocus
                  aria-autocomplete="list"
                  aria-controls="new-supply-vendor-list"
                  aria-expanded
                  aria-label="Search suppliers"
                />
              </div>
              <ul
                id="new-supply-vendor-list"
                className="max-h-44 overflow-auto border border-border bg-background"
                role="listbox"
                aria-label="Suppliers"
              >
                {supplierLoading && supplierHits.length === 0 ? (
                  <li
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground"
                    role="presentation"
                  >
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Loading suppliers…
                  </li>
                ) : supplierHits.length === 0 ? (
                  <li
                    className="px-3 py-2.5 text-xs text-muted-foreground"
                    role="presentation"
                  >
                    {supplierQuery.trim()
                      ? "No suppliers match that search"
                      : "No suppliers yet — add one on the Suppliers page"}
                  </li>
                ) : (
                  supplierHits.map((s) => (
                    <li key={s.id} role="option">
                      <button
                        type="button"
                        className="flex w-full flex-col items-start border-b border-border/60 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 touch-manipulation hover:bg-muted/50 active:bg-muted/60 sm:py-2"
                        onClick={() => onSelectSupplier(s)}
                        disabled={busy}
                      >
                        <span className="font-medium leading-tight text-foreground">
                          {s.name}
                        </span>
                        {s.code?.trim() ? (
                          <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {s.code.trim()}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {supplierLoading && supplierHits.length > 0 ? (
                <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  Updating…
                </p>
              ) : supplierHits.length > 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  {supplierQuery.trim()
                    ? `${supplierHits.length} match${supplierHits.length === 1 ? "" : "es"}`
                    : `${supplierHits.length} supplier${supplierHits.length === 1 ? "" : "s"} — type to filter`}
                </p>
              ) : null}
            </div>
          )}
        </SetupBlock>

        <SetupBlock step="2" title="Receipt">
          <div className="grid gap-2 sm:grid-cols-2">
            {branchLocked ? (
              selectedBranchName ? (
                <div className="flex flex-col gap-1">
                  <span className={nsdFieldLabel}>Branch</span>
                  <div className="flex h-9 items-center gap-1.5 border border-border bg-background px-2.5 sm:h-8">
                    <Building2
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {selectedBranchName}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="col-span-2 text-xs text-destructive">
                  No branch assigned — contact your administrator.
                </p>
              )
            ) : (
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Branch</span>
                <select
                  className={cn(nsdSelect, "bg-background")}
                  value={branchId}
                  onChange={(e) => onBranchChange(e.target.value)}
                  disabled={busy || branchesLoading || branches.length === 0}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className={nsdFieldLabel}>Received</span>
              <input
                type="datetime-local"
                className={cn(nsdInput, "bg-background")}
                value={receivedAtLocal}
                onChange={(e) => onReceivedAtChange(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <details className="mt-2 border-t border-border/50 pt-2">
            <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80 [&::-webkit-details-marker]:hidden">
              References{" "}
              <span className="font-normal normal-case">(optional)</span>
              {(docRef.trim() || notes.trim()) && (
                <span className="ml-1 font-mono normal-case text-primary">· set</span>
              )}
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Delivery note / DN ref</span>
                <input
                  className={cn(nsdInput, "bg-background font-mono text-xs")}
                  value={docRef}
                  onChange={(e) => onDocRefChange(e.target.value)}
                  disabled={busy}
                  placeholder="e.g. DN-1042"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Notes</span>
                <textarea
                  className={cn(nsdTextarea, "min-h-[2rem] bg-background text-xs")}
                  rows={1}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  disabled={busy}
                  placeholder="Internal note…"
                />
              </label>
            </div>
          </details>
        </SetupBlock>
      </div>

      {showExtras ? (
        <details className={cn(nsdSetupBlock, "group p-0")} open={extrasOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 sm:px-3 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-bold tabular-nums text-muted-foreground"
                aria-hidden
              >
                3
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Extra costs
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Transport, handling — added to payable
                </p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                extras.length > 0
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {extras.length > 0
                ? `${extras.length} line${extras.length === 1 ? "" : "s"}`
                : "Optional"}
            </span>
          </summary>
          <div className="border-t border-border/50 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
            <ExtraCostsBody extras={extras} onChange={onExtrasChange} busy={busy} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
