"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ArrowLeft, Loader2, Package, Search, Warehouse } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  ApiRequestError,
  fetchPathAPurchaseOrders,
  fetchStoreRoomInheritPreview,
  postStoreRoomInheritOrder,
  type PathAPurchaseOrderListRowRecord,
  type StoreRoomInheritOrderLineRecord,
  type StoreRoomInheritOrderPreviewRecord,
} from "@/lib/api";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import type { SupplyPackMode } from "@/lib/supply-pack-math";
import { cn } from "@/lib/utils";

import { parseStoreCount, storeItemCountInput } from "../_lib/store-item-count";
import {
  packsToCatalogDisplay,
  splitPacksAndSingles,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { StorePackCountField } from "./store-pack-count-field";

const INK = "var(--order-ink,#15231f)";
const TEAL = "var(--pos-primary,#0f766e)";
const ink = (pct: number) =>
  `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

function num(raw: number | string | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 10000) / 10000);
}

function catalogForLine(line: StoreRoomInheritOrderLineRecord): StorePackCatalog {
  const factor = Math.max(1, num(line.displayToHolderFactor));
  return {
    itemId: line.itemId,
    displayToHolderFactor: factor,
    catalogPackUnit: line.catalogPackUnit || "each",
    options: [],
    holderEach: num(line.remaining) * factor,
  };
}

function remainingPhrase(line: StoreRoomInheritOrderLineRecord): string {
  const factor = Math.max(1, num(line.displayToHolderFactor));
  const remaining = num(line.remaining);
  const each = remaining * factor;
  if (each <= 0) return "Nothing left";
  if (factor <= 1) {
    return `${formatQty(each)} piece${each === 1 ? "" : "s"}`;
  }
  const unit = (line.catalogPackUnit || "pack").toLowerCase();
  const { packs, singles } = splitPacksAndSingles(each, factor);
  if (packs > 0 && singles > 0) {
    return `${formatQty(packs)} ${unit}${packs === 1 ? "" : "s"} + ${formatQty(singles)} piece${singles === 1 ? "" : "s"}`;
  }
  if (packs > 0) {
    return `${formatQty(packs)} ${unit}${packs === 1 ? "" : "s"}`;
  }
  return `${formatQty(singles)} piece${singles === 1 ? "" : "s"}`;
}

function deliveryStamp(row: PathAPurchaseOrderListRowRecord): {
  label: string;
  tone: "teal" | "ink" | "amber";
} {
  if (row.status === "received" || num(row.totalReceived) > 0) {
    return { label: "Confirmed", tone: "teal" };
  }
  const d = row.deliveryStatus;
  if (d === "delivered" || d === "partially_delivered") {
    return { label: "At the door", tone: "teal" };
  }
  if (d === "in_transit") return { label: "On the way", tone: "amber" };
  return { label: "Sent", tone: "ink" };
}

function dueLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const day = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  return day.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

type DraftLine = {
  included: boolean;
  each: string;
  packMode: SupplyPackMode | null;
};

function seedDraft(preview: StoreRoomInheritOrderPreviewRecord): Record<string, DraftLine> {
  const next: Record<string, DraftLine> = {};
  for (const line of preview.lines) {
    const factor = Math.max(1, num(line.displayToHolderFactor));
    const remaining = num(line.remaining);
    next[line.purchaseOrderLineId] = {
      included: remaining > 0,
      each: storeItemCountInput(remaining * factor),
      packMode: null,
    };
  }
  return next;
}

/**
 * Receive a delivery into the store room as a packing slip: pick what arrived,
 * count it onto the shelf. Does not unpack stock — Confirm order still owns that.
 */
export function StoreRoomInheritOrderDrawer({
  open,
  onOpenChange,
  connected,
  branchId,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connected: boolean;
  branchId: string;
  onApplied: () => void;
}) {
  const [orders, setOrders] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<StoreRoomInheritOrderPreviewRecord | null>(
    null,
  );
  const [previewBusy, setPreviewBusy] = useState(false);
  const [draft, setDraft] = useState<Record<string, DraftLine>>({});
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setListBusy(true);
    setListError(null);
    setPreview(null);
    setQuery("");
    setError(null);
    void Promise.all([
      fetchPathAPurchaseOrders({ status: "sent", toast: false }),
      fetchPathAPurchaseOrders({ status: "received", toast: false }).catch(
        () => [] as PathAPurchaseOrderListRowRecord[],
      ),
    ])
      .then(([sent, received]) => {
        if (cancelled) return;
        const rows = [...sent, ...received].filter((row) => {
          if (branchId && row.branchId && row.branchId !== branchId) return false;
          return row.status !== "cancelled" && row.status !== "draft";
        });
        rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        setOrders(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setListError(
          err instanceof ApiRequestError
            ? err.message
            : "Could not load deliveries.",
        );
      })
      .finally(() => {
        if (!cancelled) setListBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, branchId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (row) =>
        row.poNumber.toLowerCase().includes(q) ||
        (row.status ?? "").toLowerCase().includes(q) ||
        (row.deliveryStatus ?? "").toLowerCase().includes(q),
    );
  }, [orders, query]);

  const tally = useMemo(() => {
    if (!preview) return { lines: 0, pieces: 0, newRows: 0 };
    let lines = 0;
    let pieces = 0;
    let newRows = 0;
    for (const line of preview.lines) {
      const row = draft[line.purchaseOrderLineId];
      if (!row?.included) continue;
      const each = parseStoreCount(row.each, false);
      if (each == null || each <= 0) continue;
      lines += 1;
      pieces += each;
      if (!line.onList) newRows += 1;
    }
    return { lines, pieces, newRows };
  }, [draft, preview]);

  const pickOrder = async (poId: string) => {
    setPreviewBusy(true);
    setError(null);
    try {
      const next = await fetchStoreRoomInheritPreview(poId);
      setPreview(next);
      setDraft(seedDraft(next));
      setConfirmDuplicate(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : DEFAULT_PROBLEM_TITLE,
      );
    } finally {
      setPreviewBusy(false);
    }
  };

  const setAllIncluded = (included: boolean) => {
    if (!preview) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const line of preview.lines) {
        const row = next[line.purchaseOrderLineId];
        if (!row) continue;
        next[line.purchaseOrderLineId] = {
          ...row,
          included: included && num(line.remaining) > 0,
        };
      }
      return next;
    });
  };

  const apply = async () => {
    if (!preview) return;
    const lines = preview.lines.flatMap((line) => {
      const row = draft[line.purchaseOrderLineId];
      if (!row?.included) return [];
      const factor = Math.max(1, num(line.displayToHolderFactor));
      const each = parseStoreCount(row.each, false);
      if (each == null || each <= 0) return [];
      return [
        {
          purchaseOrderLineId: line.purchaseOrderLineId,
          quantity: packsToCatalogDisplay(each, null, factor),
        },
      ];
    });
    if (lines.length === 0) {
      setError("Tick what actually arrived, with a quantity.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postStoreRoomInheritOrder({
        purchaseOrderId: preview.purchaseOrderId,
        confirmDuplicate: preview.alreadyInherited ? confirmDuplicate : undefined,
        lines,
        branchId: branchId || undefined,
      });
      onApplied();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : DEFAULT_PROBLEM_TITLE,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Store room"
      title={preview ? preview.poNumber : "A delivery at the door"}
      description={
        preview
          ? connected
            ? "Count what went onto the shelf. The till does not move."
            : "Add these quantities to the back-room count."
          : "Pick the order that arrived. Remaining lines become a put-in."
      }
      icon={<Warehouse className="size-4" aria-hidden />}
      appearance="sharp"
      footer={
        preview ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              className="rounded-none"
              onClick={() => {
                setPreview(null);
                setError(null);
              }}
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Deliveries
            </Button>
            <Button
              type="button"
              disabled={
                busy ||
                tally.lines === 0 ||
                (preview.alreadyInherited && !confirmDuplicate)
              }
              className="rounded-none"
              onClick={() => void apply()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Package className="size-3.5" aria-hidden />
              )}
              {tally.lines === 0
                ? "Tick what arrived"
                : `Put ${tally.lines} on the shelf`}
            </Button>
          </div>
        ) : undefined
      }
    >
      {listError ? (
        <p
          className="border px-2.5 py-2 text-[12px] leading-snug text-destructive"
          style={{
            borderColor: "color-mix(in srgb, var(--destructive) 40%, transparent)",
            background:
              "color-mix(in srgb, var(--destructive) 6%, transparent)",
          }}
        >
          {listError}
        </p>
      ) : null}
      {error ? (
        <p
          className="mb-3 border px-2.5 py-2 text-[12px] leading-snug text-destructive"
          style={{
            borderColor: "color-mix(in srgb, var(--destructive) 40%, transparent)",
            background:
              "color-mix(in srgb, var(--destructive) 6%, transparent)",
          }}
        >
          {error}
        </p>
      ) : null}

      {!preview ? (
        <PickDelivery
          query={query}
          onQuery={setQuery}
          busy={listBusy || previewBusy}
          rows={filtered}
          onPick={(id) => void pickOrder(id)}
        />
      ) : (
        <CountOntoShelf
          preview={preview}
          draft={draft}
          setDraft={setDraft}
          confirmDuplicate={confirmDuplicate}
          setConfirmDuplicate={setConfirmDuplicate}
          connected={connected}
          busy={busy}
          tally={tally}
          onSetAll={setAllIncluded}
        />
      )}
    </FormDrawer>
  );
}

function PickDelivery({
  query,
  onQuery,
  busy,
  rows,
  onPick,
}: {
  query: string;
  onQuery: (value: string) => void;
  busy: boolean;
  rows: PathAPurchaseOrderListRowRecord[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className="border px-3 py-2.5"
        style={{
          borderColor: ink(12),
          background: `color-mix(in srgb, ${TEAL} 6%, white)`,
        }}
      >
        <p className="text-[13px] font-semibold tracking-tight">
          What arrived for the back room?
        </p>
        <p className={cn(dashboardHintClass(), "mt-0.5 leading-snug")}>
          Open a packing slip, then tick the crates that went onto the shelf.
        </p>
      </div>

      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <span className="sr-only">Find a delivery</span>
        <input
          className={cn(dashboardInputClass(), "pl-8")}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Find a PO number…"
        />
      </label>

      {busy ? (
        <ul className="space-y-px border" style={{ borderColor: ink(12) }}>
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[4.25rem] animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]" />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <div
          className="border border-dashed px-4 py-10 text-center"
          style={{ borderColor: ink(16) }}
        >
          <Warehouse
            className="mx-auto size-7 text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]"
            aria-hidden
          />
          <p className="mt-3 text-[14px] font-semibold tracking-tight">
            Nothing waiting at the door
          </p>
          <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem] leading-snug")}>
            Sent and received purchase orders for this shop show up here.
          </p>
        </div>
      ) : (
        <ul className="border" style={{ borderColor: ink(12) }}>
          {rows.map((row, index) => {
            const stamp = deliveryStamp(row);
            const due = dueLabel(row.expectedDate);
            const leftover = Math.max(
              0,
              num(row.totalOrdered) - num(row.totalReceived),
            );
            const hero = leftover > 0 ? leftover : num(row.totalOrdered);
            return (
              <li
                key={row.id}
                className={index === 0 ? undefined : "border-t"}
                style={{ borderColor: ink(10) }}
              >
                <button
                  type="button"
                  className="flex w-full items-stretch gap-0 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)]"
                  onClick={() => onPick(row.id)}
                >
                  <span
                    className="grid w-[4.75rem] shrink-0 place-items-center border-r tabular-nums"
                    style={{
                      borderColor: ink(10),
                      background: `color-mix(in srgb, ${INK} 3%, white)`,
                    }}
                  >
                    <span
                      className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {formatQty(hero)}
                    </span>
                    <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {leftover > 0 ? "still due" : "ordered"}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 px-3 py-2.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold tracking-tight">
                          {row.poNumber}
                        </span>
                        <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
                          {formatQty(num(row.totalOrdered))} ordered
                          {num(row.totalReceived) > 0
                            ? ` · ${formatQty(num(row.totalReceived))} confirmed`
                            : ""}
                          {due ? ` · due ${due}` : ""}
                        </span>
                      </span>
                      <Stamp tone={stamp.tone}>{stamp.label}</Stamp>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CountOntoShelf({
  preview,
  draft,
  setDraft,
  confirmDuplicate,
  setConfirmDuplicate,
  connected,
  busy,
  tally,
  onSetAll,
}: {
  preview: StoreRoomInheritOrderPreviewRecord;
  draft: Record<string, DraftLine>;
  setDraft: Dispatch<SetStateAction<Record<string, DraftLine>>>;
  confirmDuplicate: boolean;
  setConfirmDuplicate: (next: boolean) => void;
  connected: boolean;
  busy: boolean;
  tally: { lines: number; pieces: number; newRows: number };
  onSetAll: (included: boolean) => void;
}) {
  const due = dueLabel(preview.expectedDate);
  return (
    <div className="space-y-3">
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border px-2.5 py-2"
        style={{ borderColor: ink(12) }}
      >
        <p className="text-[11px] font-semibold text-[var(--pos-primary,#0f766e)]">
          Delivery
        </p>
        <span
          className="h-px w-8"
          style={{ background: ink(18) }}
          aria-hidden
        />
        <p className="text-right text-[11px] font-semibold">On the shelf</p>
      </div>

      {preview.alreadyInherited ? (
        <label
          className="flex items-start gap-2.5 border px-2.5 py-2 text-[12px] leading-snug"
          style={{
            borderColor: "color-mix(in srgb, #b45309 40%, transparent)",
            background: "color-mix(in srgb, #b45309 6%, white)",
            color: "#7c3d09",
          }}
        >
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 accent-[var(--pos-primary,#0f766e)]"
            checked={confirmDuplicate}
            onChange={(e) => setConfirmDuplicate(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Already on the shelf once.</span>{" "}
            Tick only if this delivery came in again.
          </span>
        </label>
      ) : null}

      <div
        className="border px-3 py-2.5"
        style={{
          borderColor: ink(12),
          background: connected
            ? `color-mix(in srgb, ${TEAL} 6%, white)`
            : `color-mix(in srgb, ${INK} 3%, white)`,
        }}
      >
        <p className="text-[13px] font-semibold tracking-tight">
          {connected
            ? preview.unpacked
              ? "Confirmed — till stock already moved."
              : "Shelf note only. Till stock stays put."
            : "These pieces add to the back-room count."}
        </p>
        <p className={cn(dashboardHintClass(), "mt-0.5 leading-snug")}>
          {connected
            ? preview.unpacked
              ? "Putting them in the store room will not raise inventory again."
              : "Confirm the order if these goods are not on hand yet."
            : due
              ? `Due ${due}. Type what you actually put away.`
              : "Type what you actually put away."}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {formatQty(tally.pieces)}
          </span>{" "}
          pieces ticked
          {tally.newRows > 0 ? ` · ${tally.newRows} new on the list` : ""}
        </p>
        <button
          type="button"
          className="text-[11px] font-medium text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
          onClick={() => onSetAll(tally.lines === 0)}
        >
          {tally.lines === 0 ? "Tick remaining" : "Clear ticks"}
        </button>
      </div>

      <ul className="space-y-2">
        {preview.lines.map((line) => {
          const row = draft[line.purchaseOrderLineId];
          if (!row) return null;
          const leftover = num(line.remaining) <= 0;
          return (
            <li
              key={line.purchaseOrderLineId}
              className={cn(
                "border p-2.5 transition-colors duration-150",
                leftover && "opacity-60",
                row.included &&
                  "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]",
              )}
              style={{
                borderColor: row.included
                  ? `color-mix(in srgb, ${TEAL} 35%, transparent)`
                  : ink(12),
              }}
            >
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-1 size-3.5 accent-[var(--pos-primary,#0f766e)]"
                  checked={row.included}
                  disabled={leftover}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [line.purchaseOrderLineId]: {
                        ...row,
                        included: e.target.checked,
                      },
                    }))
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold tracking-tight">
                        {line.itemName}
                      </span>
                      <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
                        {formatQty(num(line.qtyOrdered))} ordered
                        {num(line.qtyReceived) > 0
                          ? ` · ${formatQty(num(line.qtyReceived))} confirmed`
                          : ""}
                      </span>
                    </span>
                    <Stamp tone={line.onList ? "ink" : "teal"}>
                      {line.onList ? "On the list" : "New line"}
                    </Stamp>
                  </span>
                  <p
                    className="mt-1.5 text-[15px] font-semibold tabular-nums tracking-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {remainingPhrase(line)}
                  </p>
                </span>
              </label>
              {row.included ? (
                <div className="mt-2.5 pl-[1.375rem]">
                  <StorePackCountField
                    value={row.each}
                    onChange={(each) =>
                      setDraft((prev) => ({
                        ...prev,
                        [line.purchaseOrderLineId]: { ...row, each },
                      }))
                    }
                    packMode={row.packMode}
                    onPackModeChange={(packMode) =>
                      setDraft((prev) => ({
                        ...prev,
                        [line.purchaseOrderLineId]: { ...row, packMode },
                      }))
                    }
                    catalog={catalogForLine(line)}
                    followsInventory
                    intent="move"
                    disabled={busy}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stamp({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "teal" | "ink" | "amber";
}) {
  const color =
    tone === "teal"
      ? TEAL
      : tone === "amber"
        ? "#b45309"
        : INK;
  return (
    <span
      className="shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        color,
      }}
    >
      {children}
    </span>
  );
}
