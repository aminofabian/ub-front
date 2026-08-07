"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ClipboardList, Loader2, Plus, Search, Trash2, X } from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
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
  note: string;
};

function emptyLine(): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId: null,
    itemName: "",
    quantity: "",
    note: "",
  };
}

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  /** When true, drawer can remove saved pending lines. */
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
  const listRef = useRef<HTMLDivElement | null>(null);

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
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
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
        note: l.note.trim() || null,
      }))
      .filter((l) => l.itemId || l.itemName);

    if (payload.length === 0) {
      setError("Add at least one item — pick from catalog or type a name.");
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
      description="Pick from catalog or type a name. Quantity is optional. Add a line for each item."
      contextLabel="Order pad"
      icon={<ClipboardList className="size-4" aria-hidden />}
      width="wide"
      appearance="sharp"
      banner={error ? <FormDrawerMessageBanner text={error} /> : null}
      footer={
        canWrite ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={addLine}
              disabled={saving}
            >
              <Plus className="size-4" aria-hidden />
              Add line
            </Button>
            <div className="flex gap-2">
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
                  "Save to list"
                )}
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        {canWrite ? (
          <div ref={listRef} className="space-y-3">
            {lines.map((line, index) => (
              <OrderPadDraftRow
                key={line.key}
                index={index}
                line={line}
                branchId={branchId}
                canRemove={lines.length > 1}
                onChange={(patch) => updateLine(line.key, patch)}
                onRemove={() => removeLine(line.key)}
              />
            ))}
            <button
              type="button"
              onClick={addLine}
              className={cn(
                "flex w-full items-center justify-center gap-2 border border-dashed border-border/80",
                "px-3 py-2.5 text-sm font-medium text-muted-foreground",
                "transition-colors hover:border-foreground/25 hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Plus className="size-4" aria-hidden />
              Add another item
            </button>
          </div>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Waiting to order</h3>
            {!existingLoading ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {existing.length}
              </span>
            ) : null}
          </div>
          {existingLoading ? (
            <div className="flex items-center gap-2 px-1 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading list…
            </div>
          ) : existing.length === 0 ? (
            <p className="border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
              Nothing on the pad yet. Add lines above and save.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 border border-border/70">
              {existing.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{row.itemName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Qty {formatQty(row.quantity)}
                      {row.itemId ? " · Catalog" : " · Free text"}
                      {" · "}
                      {row.createdByName}
                    </p>
                    {row.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>
                    ) : null}
                  </div>
                  {canWrite ? (
                    <button
                      type="button"
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Remove ${row.itemName}`}
                      disabled={removingId === row.id}
                      onClick={() => void handleRemoveExisting(row.id)}
                    >
                      {removingId === row.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-4" aria-hidden />
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

function OrderPadDraftRow({
  index,
  line,
  branchId,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  line: DraftLine;
  branchId: string;
  canRemove: boolean;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [openHits, setOpenHits] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q || line.itemId) {
      setHits([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
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
            setHits(rows.slice(0, 8));
            setOpenHits(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setHits([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, branchId, line.itemId]);

  const pickItem = (item: ItemSummaryRecord) => {
    onChange({ itemId: item.id, itemName: item.name });
    setQuery("");
    setHits([]);
    setOpenHits(false);
  };

  const clearCatalog = () => {
    onChange({ itemId: null });
  };

  return (
    <div className="border border-border/80 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Line {index + 1}
        </span>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-destructive"
            aria-label={`Remove line ${index + 1}`}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            Item name or catalog search
          </label>
          {line.itemId ? (
            <div className="flex items-center gap-2 border border-border bg-background px-2.5 py-2">
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {line.itemName}
              </span>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Catalog
              </span>
              <button
                type="button"
                onClick={clearCatalog}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear catalog pick"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id={searchId}
                  value={line.itemName || query}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuery(v);
                    onChange({ itemName: v, itemId: null });
                    setOpenHits(true);
                  }}
                  onFocus={() => {
                    if (hits.length) setOpenHits(true);
                  }}
                  placeholder="Search catalog or type a name…"
                  className={cn(dashboardInputClass, "rounded-none pl-8")}
                  autoComplete="off"
                />
                {searching ? (
                  <Loader2
                    className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
                    aria-hidden
                  />
                ) : null}
              </div>
              {openHits && hits.length > 0 ? (
                <ul
                  className="absolute z-20 mt-1 max-h-48 w-full overflow-auto border border-border bg-background shadow-md"
                  role="listbox"
                >
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/60"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickItem(hit)}
                      >
                        <span className="font-medium">{hit.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {[hit.sku, hit.barcode].filter(Boolean).join(" · ") || "Catalog item"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>

        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Qty <span className="font-normal">(optional)</span>
            </span>
            <input
              inputMode="decimal"
              value={line.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              placeholder="—"
              className={cn(dashboardInputClass, "rounded-none tabular-nums")}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Note <span className="font-normal">(optional)</span>
            </span>
            <input
              value={line.note}
              onChange={(e) => onChange({ note: e.target.value })}
              placeholder="Size, brand…"
              className={cn(dashboardInputClass, "rounded-none")}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
