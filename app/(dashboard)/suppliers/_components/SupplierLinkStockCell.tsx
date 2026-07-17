"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type SupplierItemLinkRecord } from "@/lib/api";
import {
  canAdminEditOnHandStock,
  resolveStockHolderForEdit,
  setCatalogOnHandStock,
} from "@/lib/set-on-hand-stock";
import { cn } from "@/lib/utils";

import { nsdInput } from "../../supplies/_components/new-supply-drawer-ui";

/** @deprecated use {@link canAdminEditOnHandStock} */
export const canAdminEditSupplierLinkStock = canAdminEditOnHandStock;

function parseStock(raw: number | string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatStock(n: number | null): string {
  if (n == null) {
    return "—";
  }
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function seedUnitCost(link: SupplierItemLinkRecord): number {
  for (const raw of [
    link.lastCostPrice,
    link.defaultCostPrice,
    link.catalogBuyingPrice,
  ]) {
    if (raw == null || String(raw).trim() === "") {
      continue;
    }
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return 0;
}

type SupplierLinkStockCellProps = {
  link: SupplierItemLinkRecord;
  branchId: string | undefined;
  canEdit: boolean;
  disabled?: boolean;
  onUpdated: () => void;
};

export function SupplierLinkStockCell({
  link,
  branchId,
  canEdit,
  disabled,
  onUpdated,
}: SupplierLinkStockCellProps) {
  const displayStock = parseStock(link.currentStock);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [baseline, setBaseline] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = async () => {
    if (!canEdit || disabled || busy) {
      return;
    }
    setError(null);
    const bid = branchId?.trim();
    if (!bid) {
      setError("Select a branch in the header first.");
      return;
    }
    setBusy(true);
    try {
      // Same resolution path as save — avoids denormalized currentStock vs branch drift.
      const resolved = await resolveStockHolderForEdit({
        itemId: link.itemId,
        branchId: bid,
      });
      const current = resolved.displayCurrent;
      setBaseline(current);
      setDraft(Number.isInteger(current) ? String(current) : current.toFixed(2));
      setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stock.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
    setBaseline(null);
    setError(null);
  };

  const save = async () => {
    if (!canEdit || busy) {
      return;
    }
    const bid = branchId?.trim();
    if (!bid) {
      setError("Select a branch in the header first.");
      return;
    }
    const target = Number(draft.trim());
    if (!Number.isFinite(target) || target < 0) {
      setError("Enter zero or a positive quantity.");
      return;
    }
    const current = baseline ?? displayStock ?? 0;
    const delta = Math.round((target - current) * 10000) / 10000;
    if (Math.abs(delta) < 0.0001) {
      cancel();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await setCatalogOnHandStock({
        itemId: link.itemId,
        branchId: bid,
        targetDisplay: target,
        unitCost: seedUnitCost(link),
        notes: "Stock set from supplier catalog",
      });
      setEditing(false);
      setDraft("");
      setBaseline(null);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stock update failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) {
    return (
      <span
        className={cn(
          "font-mono text-xs tabular-nums",
          displayStock != null && displayStock <= 0
            ? "font-semibold text-red-700 dark:text-red-300"
            : "text-muted-foreground",
        )}
      >
        {formatStock(displayStock)}
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex min-w-[7.5rem] flex-col items-end gap-1">
        <div className="flex items-center gap-0.5">
          <input
            ref={inputRef}
            className={cn(nsdInput, "h-7 w-[4.5rem] px-1.5 text-right font-mono text-xs tabular-nums")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
            inputMode="decimal"
            aria-label={`Set on-hand stock for ${link.itemName || link.sku}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-primary"
            disabled={busy}
            title="Save stock"
            onClick={() => void save()}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="size-3.5" aria-hidden />
            )}
            <span className="sr-only">Save</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-muted-foreground"
            disabled={busy}
            title="Cancel"
            onClick={cancel}
          >
            <X className="size-3.5" aria-hidden />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
        {error ? (
          <p className="max-w-[10rem] text-right text-[10px] leading-snug text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-[9px] text-muted-foreground">
            Set total on hand · Enter
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void startEdit()}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs tabular-nums",
          "border border-transparent hover:border-border hover:bg-muted/40",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          displayStock != null && displayStock <= 0
            ? "font-semibold text-red-700 dark:text-red-300"
            : "text-foreground",
        )}
        title="Set on-hand stock (absolute total, not add)"
      >
        {busy ? (
          <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <Pencil className="size-2.5 text-muted-foreground" aria-hidden />
        )}
        {formatStock(displayStock)}
      </button>
      {error ? (
        <p className="max-w-[8rem] text-right text-[10px] leading-snug text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
