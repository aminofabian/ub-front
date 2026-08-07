"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  deleteOrderPadItem,
  fetchItems,
  fetchOrderPadItems,
  postOrderPadItemsBatch,
  type ItemSummaryRecord,
  type OrderPadItemRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type DraftLine = {
  key: string;
  itemId: string | null;
  itemName: string;
  quantity: string;
};

function emptyLine(): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId: null,
    itemName: "",
    quantity: "",
  };
}

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

const cellClass = cn(
  "h-9 w-full border-0 bg-transparent px-2.5 text-sm outline-none",
  "placeholder:text-muted-foreground/55",
  "focus:bg-primary/[0.04] focus:ring-1 focus:ring-inset focus:ring-primary/30",
);

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
    setLines([emptyLine()]);
    void loadExisting();
  }, [open, loadExisting]);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
    requestAnimationFrame(() => {
      const root = sheetRef.current;
      if (!root) return;
      const inputs = root.querySelectorAll<HTMLInputElement>('[data-order-pad-name="1"]');
      inputs[inputs.length - 1]?.focus();
    });
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((l) => l.key !== key)));
  };

  const handleSubmit = async () => {
    const bid = branchId.trim();
    if (!bid) {
      setError("Select a branch before adding items.");
      return;
    }
    const payload = lines
      .map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName.trim(),
        quantity: l.quantity.trim() ? Number(l.quantity) : null,
      }))
      .filter((l) => l.itemId || l.itemName);

    if (payload.length === 0) {
      setError("Add at least one item name.");
      return;
    }

    for (const line of payload) {
      if (line.quantity != null && (!Number.isFinite(line.quantity) || line.quantity <= 0)) {
        setError("Quantity must be greater than zero when set.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await postOrderPadItemsBatch({ branchId: bid, lines: payload });
      setLines([emptyLine()]);
      await loadExisting();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the order list.");
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
      title="Items to order"
      description="Name and quantity — one row per item."
      contextLabel="Order pad"
      icon={<ClipboardList className="size-4" aria-hidden />}
      width="default"
      appearance="sharp"
      headerDensity="compact"
      banner={error ? <FormDrawerMessageBanner text={error} /> : null}
      footer={
        canWrite ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => void handleSubmit()}
              disabled={saving || !branchId.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {canWrite ? (
          <div ref={sheetRef} className="border border-border">
            <div
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] border-b border-border bg-muted/40",
                "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
              )}
            >
              <span className="px-2.5 py-1.5">Item</span>
              <span className="border-l border-border px-2.5 py-1.5 text-right">Qty</span>
              <span className="border-l border-border" aria-hidden />
            </div>

            {lines.map((line, index) => (
              <OrderPadSheetRow
                key={line.key}
                index={index}
                line={line}
                branchId={branchId}
                isLast={index === lines.length - 1}
                canRemove={lines.length > 1}
                onChange={(patch) => updateLine(line.key, patch)}
                onRemove={() => removeLine(line.key)}
                onAddLine={addLine}
              />
            ))}

            <button
              type="button"
              onClick={addLine}
              className={cn(
                "flex w-full items-center gap-1.5 border-t border-border px-2.5 py-2",
                "text-xs font-medium text-muted-foreground",
                "hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Plus className="size-3.5" aria-hidden />
              Add row
            </button>
          </div>
        ) : null}

        <section>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              On the list
            </h3>
            {!existingLoading ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {existing.length}
              </span>
            ) : null}
          </div>

          {existingLoading ? (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : existing.length === 0 ? (
            <p className="border border-dashed border-border/70 px-2.5 py-3 text-xs text-muted-foreground">
              Empty — fill rows above and save.
            </p>
          ) : (
            <div className="border border-border">
              <div
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] border-b border-border bg-muted/40",
                  "text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                )}
              >
                <span className="px-2.5 py-1.5">Item</span>
                <span className="border-l border-border px-2.5 py-1.5 text-right">Qty</span>
                <span className="border-l border-border" aria-hidden />
              </div>
              {existing.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] border-t border-border first:border-t-0"
                >
                  <div className="min-w-0 px-2.5 py-2">
                    <p className="truncate text-sm leading-tight">{row.itemName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {row.createdByName}
                    </p>
                  </div>
                  <div className="flex items-center justify-end border-l border-border px-2.5 text-sm tabular-nums">
                    {formatQty(row.quantity) || "—"}
                  </div>
                  <div className="flex items-center justify-center border-l border-border">
                    {canWrite ? (
                      <button
                        type="button"
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        aria-label={`Remove ${row.itemName}`}
                        disabled={removingId === row.id}
                        onClick={() => void handleRemoveExisting(row.id)}
                      >
                        {removingId === row.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </FormDrawer>
  );
}

function OrderPadSheetRow({
  index,
  line,
  branchId,
  isLast,
  canRemove,
  onChange,
  onRemove,
  onAddLine,
}: {
  index: number;
  line: DraftLine;
  branchId: string;
  isLast: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
  onAddLine: () => void;
}) {
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [openHits, setOpenHits] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const q = line.itemName.trim();
    if (!q || line.itemId) {
      setHits([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      void fetchItems(q, {
        catalogScope: "SKUS_ONLY",
        softAuth: true,
        signal: controller.signal,
        ...(branchId.trim() ? { branchId: branchId.trim() } : {}),
      })
        .then((rows) => {
          if (!controller.signal.aborted) {
            setHits(rows.slice(0, 6));
            setOpenHits(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setHits([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 240);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [line.itemName, branchId, line.itemId]);

  const pickItem = (item: ItemSummaryRecord) => {
    onChange({ itemId: item.id, itemName: item.name });
    setHits([]);
    setOpenHits(false);
  };

  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] border-t border-border">
      <div className="relative min-w-0">
        <input
          ref={nameRef}
          data-order-pad-name="1"
          value={line.itemName}
          onChange={(e) => {
            onChange({ itemName: e.target.value, itemId: null });
            setOpenHits(true);
          }}
          onFocus={() => {
            if (hits.length && !line.itemId) setOpenHits(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpenHits(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (isLast && line.itemName.trim()) onAddLine();
            }
          }}
          placeholder={index === 0 ? "Item name…" : ""}
          className={cellClass}
          autoComplete="off"
          aria-label={`Item ${index + 1}`}
        />
        {searching ? (
          <Loader2
            className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
        {openHits && hits.length > 0 && !line.itemId ? (
          <ul
            className="absolute left-0 right-0 top-full z-30 max-h-40 overflow-auto border border-border bg-background shadow-md"
            role="listbox"
          >
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-baseline justify-between gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted/60"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickItem(hit)}
                >
                  <span className="min-w-0 truncate font-medium">{hit.name}</span>
                  {hit.sku ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {hit.sku}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <input
        inputMode="decimal"
        value={line.quantity}
        onChange={(e) => onChange({ quantity: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (isLast) onAddLine();
          }
        }}
        placeholder=""
        className={cn(cellClass, "border-l border-border text-right tabular-nums")}
        aria-label={`Quantity ${index + 1}`}
      />

      <div className="flex items-center justify-center border-l border-border">
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground/70 hover:text-destructive"
            aria-label={`Remove row ${index + 1}`}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
