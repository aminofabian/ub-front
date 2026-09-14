"use client";

import { Building2, Loader2, Search, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { type ExtraRow } from "./extra-costs-section";
import {
  nsdBorder,
  nsdFieldLabel,
  nsdInput,
  nsdSelect,
  nsdTextarea,
} from "./new-supply-drawer-ui";

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
  /** Opens the delivery-details drawer (working phase). */
  onEditDelivery?: () => void;
  /**
   * `pick` — focused supplier + receipt columns before a vendor is chosen.
   * `strip` — compact context bar once receiving.
   */
  layout?: "pick" | "strip";
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
  onEditDelivery,
  layout,
}: DeliverySetupSectionProps) {
  const mode =
    layout ?? (supplier ? "strip" : "pick");

  if (mode === "strip" && supplier) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border border-primary/25 bg-primary/[0.04] px-2.5 py-2">
        <span className="flex size-7 shrink-0 items-center justify-center border border-primary/25 bg-background text-primary">
          <Truck className="size-3.5" aria-hidden />
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
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none px-2.5 text-[11px] touch-manipulation"
            disabled={busy}
            onClick={onEditDelivery}
          >
            Delivery details
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-none px-2 text-[11px] text-muted-foreground touch-manipulation"
            disabled={busy}
            onClick={onClearSupplier}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  /* ── Pick phase: two balanced columns ─────────────────────────────── */
  return (
    <div className="grid min-h-0 flex-1 gap-0 overflow-hidden border border-border bg-card lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
      {/* Supplier column */}
      <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
          <span
            className="flex size-5 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 text-[9px] font-bold tabular-nums text-primary"
            aria-hidden
          >
            1
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-tight text-foreground">
              Supplier
            </p>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Who delivered this stock?
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
          <div className="relative shrink-0">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(nsdInput, "bg-background pl-9")}
              placeholder="Search suppliers…"
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
            className={cn(
              "min-h-0 flex-1 overflow-auto bg-background",
              nsdBorder,
            )}
            role="listbox"
            aria-label="Suppliers"
          >
            {supplierLoading && supplierHits.length === 0 ? (
              <li
                className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground"
                role="presentation"
              >
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading suppliers…
              </li>
            ) : supplierHits.length === 0 ? (
              <li
                className="px-3 py-3 text-xs text-muted-foreground"
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
            <p className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Updating…
            </p>
          ) : null}
        </div>
      </div>

      {/* Receipt column */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-[#e8eef5] px-2.5 py-1.5 dark:bg-muted/40">
          <span
            className="flex size-5 shrink-0 items-center justify-center border border-border bg-background text-[9px] font-bold tabular-nums text-muted-foreground"
            aria-hidden
          >
            2
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-tight text-foreground">
              Receipt
            </p>
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Branch and receive time
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-2.5">
          <div className="grid gap-2.5">
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
                <p className="text-xs text-destructive">
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

          <details className="border-t border-border/50 pt-2">
            <summary className="cursor-pointer list-none text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground/80 [&::-webkit-details-marker]:hidden">
              References{" "}
              <span className="font-normal normal-case">(optional)</span>
              {(docRef.trim() || notes.trim()) && (
                <span className="ml-1 font-mono normal-case text-primary">
                  · set
                </span>
              )}
            </summary>
            <div className="mt-2 grid gap-2">
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
                  className={cn(
                    nsdTextarea,
                    "min-h-[2.5rem] bg-background text-xs",
                  )}
                  rows={2}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  disabled={busy}
                  placeholder="Internal note…"
                />
              </label>
            </div>
          </details>

          <div className="mt-auto border border-dashed border-border bg-muted/20 px-2.5 py-2.5">
            <p className="text-[11px] font-medium text-foreground">
              Next: pick a supplier
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              Their linked products open in the receive grid. You can still
              edit receipt details after choosing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
