"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Warehouse } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dashboardSelectClass } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import type { BranchRecord, ItemSummaryRecord } from "@/lib/api";

export type BulkStockAdjustParams = {
  /** Stocked rows to adjust (pre-filtered by the caller). */
  rows: ItemSummaryRecord[];
  branchId: string;
  mode: "add" | "remove" | "set";
  /** Absolute quantity for add/remove. */
  quantity: number;
  /** On-hand target for set mode. */
  target: number;
  /** Unit cost recorded for additions (0 = leave as is). */
  unitCost: number;
  onProgress: (done: number, total: number, failed: number) => void;
};

export type BulkStockAdjustSummary = {
  ok: number;
  skipped: number;
  failed: { name: string; reason: string }[];
};

const MODES = [
  { id: "add", label: "Add" },
  { id: "remove", label: "Remove" },
  { id: "set", label: "Set on-hand to" },
] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: ItemSummaryRecord[];
  /** Original selection size — rows vs selection shows skipped (non-stocked) items. */
  totalSelected: number;
  branches: BranchRecord[];
  currencyCode: string;
  apply: (params: BulkStockAdjustParams) => Promise<BulkStockAdjustSummary>;
};

export function BulkStockAdjustModal({
  open,
  onOpenChange,
  rows,
  totalSelected,
  branches,
  currencyCode,
  apply,
}: Props) {
  const activeBranches = useMemo(
    () => branches.filter((b) => b.active),
    [branches],
  );
  const [branchId, setBranchId] = useState("");
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [qtyStr, setQtyStr] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [unitCostStr, setUnitCostStr] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    failed: number;
  } | null>(null);
  const [summary, setSummary] = useState<BulkStockAdjustSummary | null>(null);

  useEffect(() => {
    if (open) {
      setBranchId(activeBranches[0]?.id?.trim() ?? "");
      setMode("add");
      setQtyStr("");
      setTargetStr("");
      setUnitCostStr("");
      setRunning(false);
      setProgress(null);
      setSummary(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = rows.length;
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : null;

  const qty = Number(qtyStr);
  const target = Number(targetStr);
  const unitCost = unitCostStr.trim() === "" ? 0 : Number(unitCostStr);
  const branchChosen = Boolean(branchId.trim());
  const valid =
    branchChosen &&
    total > 0 &&
    (mode === "add" || mode === "remove"
      ? Number.isFinite(qty) && qty > 0
      : Number.isFinite(target) && target >= 0) &&
    Number.isFinite(unitCost) &&
    unitCost >= 0;

  const handleApply = async () => {
    if (!valid || running) return;
    setRunning(true);
    setProgress({ done: 0, total, failed: 0 });
    setSummary(null);
    const res = await apply({
      rows,
      branchId: branchId.trim(),
      mode,
      quantity: Math.round(qty * 10000) / 10000,
      target: Math.round(target * 10000) / 10000,
      unitCost: Math.round(unitCost * 10000) / 10000,
      onProgress: (done, t, failedCount) =>
        setProgress({ done, total: t, failed: failedCount }),
    });
    setProgress(null);
    setRunning(false);
    setSummary(res);
  };

  const close = () => {
    if (running) return;
    onOpenChange(false);
  };

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-snug shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-foreground/15 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <Dialog open={open} onOpenChange={(o) => !running && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="size-4 text-primary" aria-hidden />
            Adjust stock in bulk
          </DialogTitle>
          <DialogDescription>
            {totalSelected} item(s) selected · {total} will be adjusted
            {totalSelected > total
              ? ` · ${totalSelected - total} skipped (packaged)`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div
            role="status"
            className={cn(
              "flex flex-col gap-1 rounded-xl border px-4 py-3.5 text-sm leading-relaxed shadow-sm",
              summary.failed.length > 0
                ? "border-destructive/25 bg-destructive/5"
                : "border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50",
            )}
          >
            <div className="flex items-start gap-3">
              {summary.failed.length > 0 ? (
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden
                />
              ) : (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {summary.ok} item(s) adjusted
                  {summary.skipped > 0
                    ? ` · ${summary.skipped} unchanged`
                    : ""}
                </p>
                {summary.failed.length > 0 ? (
                  <ul className="mt-3 max-h-48 list-inside list-disc space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {summary.failed.map((f, i) => (
                      <li key={`${f.name}-${i}`}>
                        <span className="font-medium text-foreground">{f.name}</span>{" "}
                        — {f.reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Stock now reflects the change at the selected branch. The
                    catalog list has been refreshed.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-foreground">Branch</span>
              <select
                className={dashboardSelectClass(running)}
                disabled={running}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                {activeBranches.length === 0 ? (
                  <option value="">No active branches</option>
                ) : (
                  activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 bg-muted/25 p-1.5">
              {MODES.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={mode === m.id ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "flex-1",
                    mode !== m.id && "text-muted-foreground hover:text-foreground",
                  )}
                  disabled={running}
                  onClick={() => {
                    setMode(m.id);
                    setSummary(null);
                  }}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            <div className="space-y-4 border-t border-border/50 pt-4">
              {mode === "set" ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    New on-hand quantity
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="e.g. 250"
                    disabled={running}
                    value={targetStr}
                    onChange={(e) => setTargetStr(e.target.value)}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Each item is set to this quantity at the branch (it may be
                    more or less than the current on-hand).
                  </span>
                </label>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    {mode === "add" ? "Quantity to add" : "Quantity to remove"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="e.g. 100"
                    disabled={running}
                    value={qtyStr}
                    onChange={(e) => setQtyStr(e.target.value)}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {mode === "add"
                      ? `Applied to every selected item on top of current on-hand.`
                      : "Removed from every selected item, batch by batch."}
                  </span>
                </label>
              )}

              {mode === "add" ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-foreground">
                    Unit cost{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      className={cn(inputClass, "pr-12")}
                      placeholder="0"
                      disabled={running}
                      value={unitCostStr}
                      onChange={(e) => setUnitCostStr(e.target.value)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {currencyCode || "KES"}
                    </span>
                  </div>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Cost recorded on the incoming batches. Leave 0 to skip.
                  </span>
                </label>
              ) : null}
            </div>

            {running && progress ? (
              <div
                role="progressbar"
                aria-label="Bulk stock adjustment progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct ?? undefined}
                aria-valuetext={pct != null ? `${pct}% complete` : "working"}
                className="rounded-xl border border-primary/15 bg-primary/4 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Adjusting {progress.done} of {progress.total} items
                    {progress.failed > 0
                      ? ` · ${progress.failed} failed`
                      : ""}
                  </span>
                  <span className="text-lg font-bold tabular-nums tracking-tight text-primary">
                    {pct != null ? `${pct}%` : "—"}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="import-fill relative h-full overflow-hidden rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${pct ?? 0}%` }}
                  >
                    <span className="import-fill-shimmer" aria-hidden />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {summary ? (
            <Button type="button" variant="default" onClick={close}>
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={running}
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!valid || running}
                onClick={() => void handleApply()}
              >
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Adjusting…
                  </>
                ) : (
                  "Adjust stock"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
