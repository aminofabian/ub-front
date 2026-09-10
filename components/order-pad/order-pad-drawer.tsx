"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  deleteOrderPadItem,
  fetchOrderPadItems,
  postOrderPadItemsBatch,
  type OrderPadItemRecord,
} from "@/lib/api";
import {
  clearOrderPadDraft,
  readOrderPadDraft,
  writeOrderPadDraft,
} from "@/lib/order-pad-draft-storage";
import { cn } from "@/lib/utils";

type DraftLine = {
  key: string;
  itemName: string;
  quantity: string;
};

function emptyLine(): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemName: "",
    quantity: "",
  };
}

function loadDraftLines(branchId: string): DraftLine[] {
  const draft = readOrderPadDraft(branchId);
  if (!draft?.lines.length) return [emptyLine()];
  const lines = draft.lines
    .filter((l) => typeof l.itemName === "string")
    .map((l) => ({
      key: l.key || emptyLine().key,
      itemName: l.itemName ?? "",
      quantity: l.quantity ?? "",
    }));
  return lines.length > 0 ? lines : [emptyLine()];
}

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  canWrite?: boolean;
  onSaved?: () => void;
};

export function OrderPadDrawer({
  open,
  onOpenChange,
  branchId,
  canWrite = true,
  onSaved,
}: Props) {
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<OrderPadItemRecord[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const draftReady = useRef(false);

  const draftCount = useMemo(
    () => lines.filter((l) => l.itemName.trim()).length,
    [lines],
  );

  const loadExisting = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setExisting([]);
      return;
    }
    setExistingLoading(true);
    try {
      const rows = await fetchOrderPadItems({ branchId: bid, ordered: false });
      setExisting(rows);
    } catch {
      setExisting([]);
    } finally {
      setExistingLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    draftReady.current = false;
    setLines(loadDraftLines(branchId));
    draftReady.current = true;
    void loadExisting();
    const t = window.setTimeout(() => {
      const root = sheetRef.current;
      if (!root) return;
      const first = root.querySelector<HTMLInputElement>(
        '[data-order-pad-name="1"]',
      );
      first?.focus({ preventScroll: true });
    }, 40);
    return () => window.clearTimeout(t);
  }, [open, branchId, loadExisting]);

  useEffect(() => {
    if (!open || !canWrite || !draftReady.current) return;
    writeOrderPadDraft(branchId, lines);
  }, [lines, open, branchId, canWrite]);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const focusNameAt = (index: number) => {
    requestAnimationFrame(() => {
      const root = sheetRef.current;
      if (!root) return;
      const inputs = root.querySelectorAll<HTMLInputElement>(
        '[data-order-pad-name="1"]',
      );
      inputs[index]?.focus();
    });
  };

  const focusQtyAt = (index: number) => {
    requestAnimationFrame(() => {
      const root = sheetRef.current;
      if (!root) return;
      const inputs = root.querySelectorAll<HTMLInputElement>(
        '[data-order-pad-qty="1"]',
      );
      inputs[index]?.focus();
      inputs[index]?.select();
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
    window.setTimeout(() => {
      const root = sheetRef.current;
      if (!root) return;
      const inputs = root.querySelectorAll<HTMLInputElement>(
        '[data-order-pad-name="1"]',
      );
      inputs[inputs.length - 1]?.focus();
    }, 0);
  };

  const removeLine = (key: string) => {
    setLines((prev) =>
      prev.length <= 1 ? [emptyLine()] : prev.filter((l) => l.key !== key),
    );
  };

  const handleSubmit = async () => {
    const bid = branchId.trim();
    if (!bid) {
      setError("Select a branch before adding items.");
      return;
    }
    const payload = lines
      .map((l) => ({
        itemName: l.itemName.trim(),
        quantity: l.quantity.trim() ? Number(l.quantity) : null,
      }))
      .filter((l) => l.itemName);

    if (payload.length === 0) {
      setError("Type at least one item name.");
      return;
    }

    for (const line of payload) {
      if (
        line.quantity != null &&
        (!Number.isFinite(line.quantity) || line.quantity <= 0)
      ) {
        setError("Quantity must be greater than zero when set.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await postOrderPadItemsBatch({ branchId: bid, lines: payload });
      clearOrderPadDraft(bid);
      setLines([emptyLine()]);
      await loadExisting();
      onSaved?.();
      window.setTimeout(() => focusNameAt(0), 0);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the order list.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExisting = async (id: string) => {
    if (!canWrite) return;
    setRemovingId(id);
    setError(null);
    try {
      await deleteOrderPadItem(id);
      setExisting((prev) => prev.filter((r) => r.id !== id));
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that line.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Order pad"
      description="Jot what to buy — everyone at this branch sees the same list."
      contextLabel="Shopping list"
      icon={<ClipboardList className="size-4" aria-hidden />}
      width="half"
      appearance="sharp"
      headerDensity="compact"
      banner={error ? <FormDrawerMessageBanner text={error} /> : null}
      footer={
        canWrite ? (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">
              {draftCount === 0
                ? "Nothing drafted yet"
                : `${draftCount} ready to add`}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-none px-3 active:scale-[0.98]"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Done
              </Button>
              <Button
                type="button"
                className="h-9 rounded-none px-4 active:scale-[0.98]"
                onClick={() => void handleSubmit()}
                disabled={saving || !branchId.trim() || draftCount === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Adding…
                  </>
                ) : (
                  "Add to list"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-none px-3 active:scale-[0.98]"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {canWrite ? (
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[11px] font-semibold tracking-wide text-foreground">
                Add items
              </h3>
              <span className="text-[10px] text-muted-foreground">
                Enter moves to the next field
              </span>
            </div>

            <div
              ref={sheetRef}
              className="overflow-hidden border border-border bg-background"
            >
              <div
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_4.5rem_2.25rem]",
                  "border-b border-border bg-muted/35",
                  "text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground",
                )}
              >
                <span className="px-3 py-2">What</span>
                <span className="border-l border-border px-2 py-2 text-right">
                  Qty
                </span>
                <span className="border-l border-border" aria-hidden />
              </div>

              <ul className="divide-y divide-border">
                {lines.map((line, index) => (
                  <li
                    key={line.key}
                    className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.25rem] transition-colors focus-within:bg-primary/[0.03]"
                  >
                    <input
                      data-order-pad-name="1"
                      value={line.itemName}
                      onChange={(e) =>
                        updateLine(line.key, { itemName: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        if (line.itemName.trim()) focusQtyAt(index);
                        else if (index === lines.length - 1) addLine();
                      }}
                      placeholder={
                        index === 0 ? "e.g. Cooking oil 5L" : "Next item…"
                      }
                      className={cn(
                        "h-10 w-full border-0 bg-transparent px-3 text-[13px] outline-none",
                        "placeholder:text-muted-foreground/50",
                      )}
                      autoComplete="off"
                      aria-label={`Item ${index + 1}`}
                    />
                    <input
                      data-order-pad-qty="1"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.key, { quantity: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        if (index === lines.length - 1) {
                          if (line.itemName.trim() || line.quantity.trim()) {
                            addLine();
                          }
                        } else {
                          focusNameAt(index + 1);
                        }
                      }}
                      placeholder="—"
                      className={cn(
                        "h-10 w-full border-0 border-l border-border bg-transparent px-2",
                        "text-right text-[13px] tabular-nums outline-none",
                        "placeholder:text-muted-foreground/40",
                      )}
                      aria-label={`Quantity ${index + 1}`}
                    />
                    <div className="flex items-center justify-center border-l border-border">
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className={cn(
                            "flex size-8 items-center justify-center text-muted-foreground/60",
                            "transition-colors hover:text-destructive active:scale-95",
                          )}
                          aria-label={`Remove row ${index + 1}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={addLine}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border",
                  "px-3 py-2.5 text-[12px] font-medium text-muted-foreground",
                  "transition-colors hover:bg-muted/40 hover:text-foreground",
                  "active:scale-[0.99]",
                )}
              >
                <Plus className="size-3.5" aria-hidden />
                Another row
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[11px] font-semibold tracking-wide text-foreground">
              On the shared list
            </h3>
            {!existingLoading ? (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {existing.length === 0 ? "Empty" : `${existing.length} pending`}
              </span>
            ) : null}
          </div>

          {existingLoading ? (
            <div className="flex items-center gap-2 border border-border px-3 py-4 text-[12px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading list…
            </div>
          ) : existing.length === 0 ? (
            <div className="border border-dashed border-border/80 px-3 py-5 text-center">
              <ClipboardList
                className="mx-auto size-5 text-muted-foreground/35"
                aria-hidden
              />
              <p className="mt-2 text-[12px] font-medium text-foreground/80">
                Nothing pending
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {canWrite
                  ? "Fill rows above, then tap Add to list."
                  : "Staff add items from the till."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border">
              {existing.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/25"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 break-words text-[13px] font-medium leading-snug text-foreground">
                        {row.itemName}
                      </p>
                      <span className="shrink-0 pt-px text-[12px] font-semibold tabular-nums text-foreground/80">
                        {formatQty(row.quantity)
                          ? `×${formatQty(row.quantity)}`
                          : "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-[10px] leading-snug text-muted-foreground">
                      {row.createdByName}
                    </p>
                  </div>
                  {canWrite ? (
                    <button
                      type="button"
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center",
                        "text-muted-foreground/70 transition-colors",
                        "hover:text-destructive disabled:opacity-50 active:scale-95",
                      )}
                      aria-label={`Remove ${row.itemName}`}
                      disabled={removingId === row.id}
                      onClick={() => void handleRemoveExisting(row.id)}
                    >
                      {removingId === row.id ? (
                        <Loader2
                          className="size-3.5 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden />
                      )}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </FormDrawer>
  );
}
