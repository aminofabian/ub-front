"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  patchItem,
  uploadItemImageToCloudinary,
} from "@/lib/api";
import { applyItemOnHandQty } from "@/lib/apply-item-on-hand";
import { toNumber } from "../_utils";
import {
  normalizeFamilyPrefix,
  stripFamilyPrefixFromInput,
} from "./CreateGroupOptionsPad";
import padStyles from "./product-create-modal.module.css";

export type ExistingFamilyOption = {
  id: string;
  label: string;
  thumbnailUrl?: string | null;
  sell?: number | null;
  cost?: number | null;
  stockQty?: number | null;
  barcode?: string | null;
  isPackage?: boolean;
};

type DraftRow = {
  id: string;
  label: string;
  sell: string;
  cost: string;
  stock: string;
  barcode: string;
  thumbnailUrl: string | null;
  isPackage: boolean;
  baselineStock: number;
};

type Props = {
  options: ExistingFamilyOption[];
  familyName?: string;
  currencyCode?: string;
  branchId?: string;
  canCatalogWrite?: boolean;
  canInventoryWrite?: boolean;
  onRefresh?: () => void | Promise<void>;
  onMessage?: (message: string) => void;
};

const cellClass = cn(
  "h-9 w-full rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-2 text-[13px] text-[var(--catalog-ink,#15231f)] shadow-none",
  "focus:outline-none focus-visible:border-[var(--catalog-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_22%,transparent)]",
);

function moneyString(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : "";
}

function stockString(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : "";
}

function toDraft(opt: ExistingFamilyOption): DraftRow {
  const stock = opt.stockQty ?? null;
  return {
    id: opt.id,
    label: opt.label,
    sell: moneyString(opt.sell),
    cost: moneyString(opt.cost),
    stock: stockString(stock),
    barcode: opt.barcode?.trim() || "",
    thumbnailUrl: opt.thumbnailUrl?.trim() || null,
    isPackage: !!opt.isPackage,
    baselineStock: stock != null && Number.isFinite(stock) ? stock : 0,
  };
}

function marginFor(sellRaw: string, costRaw: string) {
  const sell = toNumber(sellRaw);
  const cost = toNumber(costRaw);
  if (sell == null || sell <= 0 || cost == null) return null;
  const profit = sell - cost;
  return { profit, margin: (profit / sell) * 100 };
}

export function FamilyRosterPad({
  options,
  familyName = "",
  currencyCode = "",
  branchId = "",
  canCatalogWrite = false,
  canInventoryWrite = false,
  onRefresh,
  onMessage,
}: Props) {
  const familyPrefix = normalizeFamilyPrefix(familyName);
  const editable = canCatalogWrite;
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingPhotoId = useRef<string | null>(null);
  const dirtyIds = useRef(new Set<string>());
  const rowsRef = useRef<DraftRow[]>([]);
  const [rows, setRows] = useState<DraftRow[]>(() => options.map(toDraft));
  const [busyId, setBusyId] = useState<string | null>(null);

  rowsRef.current = rows;

  useEffect(() => {
    setRows((prev) => {
      const prevById = new Map(prev.map((r) => [r.id, r]));
      return options.map((opt) => {
        const existing = prevById.get(opt.id);
        if (existing && dirtyIds.current.has(opt.id)) return existing;
        return toDraft(opt);
      });
    });
  }, [options]);

  const patchLocal = (id: string, partial: Partial<DraftRow>) => {
    dirtyIds.current.add(id);
    setRows((list) =>
      list.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    );
  };

  const saveCatalogFields = async (id: string) => {
    if (!editable) return;
    const row = rowsRef.current.find((r) => r.id === id);
    const source = options.find((o) => o.id === id);
    if (!row || !source) return;

    const label = row.label.trim();
    if (!label) {
      onMessage?.("Option name is required.");
      return;
    }

    const sell = row.sell.trim() === "" ? null : toNumber(row.sell);
    const cost = row.cost.trim() === "" ? null : toNumber(row.cost);
    if (row.sell.trim() && sell == null) {
      onMessage?.("Enter a valid sell price.");
      return;
    }
    if (row.cost.trim() && cost == null) {
      onMessage?.("Enter a valid cost.");
      return;
    }

    const nextBarcode = row.barcode.trim();
    const prevSell = source.sell ?? null;
    const prevCost = source.cost ?? null;
    const prevBarcode = source.barcode?.trim() || "";
    const prevLabel = source.label.trim();

    const body: {
      variantName?: string;
      bundlePrice?: number;
      buyingPrice?: number;
      barcode?: string;
    } = {};
    if (label !== prevLabel) body.variantName = label;
    if (sell != null && sell !== prevSell) body.bundlePrice = sell;
    if (cost != null && cost !== prevCost) body.buyingPrice = cost;
    if (nextBarcode !== prevBarcode) body.barcode = nextBarcode;

    if (Object.keys(body).length === 0) {
      dirtyIds.current.delete(id);
      return;
    }

    setBusyId(id);
    try {
      await patchItem(id, body);
      dirtyIds.current.delete(id);
      await onRefresh?.();
    } catch (err) {
      onMessage?.(
        err instanceof Error ? err.message : "Could not update this size.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const saveStock = async (id: string) => {
    const row = rowsRef.current.find((r) => r.id === id);
    if (!row || !canInventoryWrite || row.isPackage) return;
    const bid = branchId.trim();
    if (!bid) {
      onMessage?.("Pick a branch in the header to edit stock.");
      return;
    }
    const target = toNumber(row.stock);
    if (target == null || target < 0) {
      onMessage?.("Enter a stock quantity of zero or more.");
      return;
    }
    if (Math.abs(target - row.baselineStock) < 0.0001) {
      dirtyIds.current.delete(id);
      return;
    }
    const unitCost = toNumber(row.cost) ?? 0;
    setBusyId(id);
    try {
      await applyItemOnHandQty({
        branchId: bid,
        itemId: id,
        current: row.baselineStock,
        target,
        unitCost,
        notes: "Stock set from add-variant roster",
      });
      patchLocal(id, { baselineStock: target, stock: String(target) });
      dirtyIds.current.delete(id);
      await onRefresh?.();
    } catch (err) {
      onMessage?.(
        err instanceof Error ? err.message : "Could not update stock.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const savePhoto = async (id: string, file: File) => {
    if (!editable) return;
    setBusyId(id);
    try {
      const uploaded = await uploadItemImageToCloudinary(id, file, {
        primary: true,
      });
      if (uploaded.secureUrl) {
        patchLocal(id, { thumbnailUrl: uploaded.secureUrl });
      }
      dirtyIds.current.delete(id);
      await onRefresh?.();
    } catch (err) {
      onMessage?.(
        err instanceof Error ? err.message : "Could not upload photo.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const status = useMemo(() => {
    if (rows.length === 0) return "";
    return rows.length === 1
      ? "1 size — edit anytime"
      : `${rows.length} sizes — edit anytime`;
  }, [rows.length]);

  if (rows.length === 0) return null;

  const gridCols =
    "1.75rem 2.5rem minmax(10rem,1.6fr) 5.5rem 3.75rem 5.25rem 4.25rem minmax(6rem,0.9fr)";

  return (
    <section className="space-y-2 pt-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--catalog-ink,#15231f)]">
          In this family{currencyCode ? ` · ${currencyCode}` : ""}
        </p>
        <span className={padStyles.tick}>{status}</span>
      </div>

      <div className={cn(padStyles.pad, "overflow-x-auto")}>
        <div
          className="grid min-w-[44rem] items-stretch border-b border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_88%,white)] text-[11px] font-semibold text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)]"
          style={{ gridTemplateColumns: gridCols }}
        >
          {["#", "Photo", "Option", "Sell", "Margin", "Cost", "Stock", "Barcode"].map(
            (h) => (
              <span
                key={h}
                className={cn(
                  "flex items-center px-1.5 py-2",
                  (h === "Sell" ||
                    h === "Margin" ||
                    h === "Cost" ||
                    h === "Stock") &&
                    "justify-end",
                )}
              >
                {h}
              </span>
            ),
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const id = pendingPhotoId.current;
            const file = e.target.files?.[0] ?? null;
            pendingPhotoId.current = null;
            e.target.value = "";
            if (id && file) void savePhoto(id, file);
          }}
        />

        <div className="max-h-[min(18rem,42vh)] overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          {rows.map((row, index) => {
            const margin = marginFor(row.sell, row.cost);
            const busy = busyId === row.id;
            const marginTone =
              margin && margin.margin >= 20
                ? "text-emerald-700"
                : margin && margin.margin >= 10
                  ? "text-amber-700"
                  : margin
                    ? "text-red-700"
                    : "text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_35%,transparent)]";

            return (
              <div
                key={row.id}
                className="grid min-w-[44rem] items-center border-b border-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_92%,transparent)] bg-white py-1.5"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="flex items-center justify-center text-[11px] tabular-nums text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_38%,transparent)]">
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="flex items-center justify-center px-1">
                  <button
                    type="button"
                    className={padStyles.optPhoto}
                    data-filled={row.thumbnailUrl ? "" : undefined}
                    disabled={!editable || busy}
                    aria-label={
                      row.thumbnailUrl
                        ? `Change photo for ${row.label || `option ${index + 1}`}`
                        : `Add photo for ${row.label || `option ${index + 1}`}`
                    }
                    onClick={() => {
                      pendingPhotoId.current = row.id;
                      fileRef.current?.click();
                    }}
                  >
                    {row.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- catalog / local preview
                      <img
                        src={row.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="size-3.5" aria-hidden />
                    )}
                  </button>
                </div>

                <div className="min-w-0 px-1">
                  {familyPrefix ? (
                    <div className="flex min-h-9 w-full items-stretch overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white focus-within:border-[var(--catalog-primary,#0f766e)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_22%,transparent)]">
                      <span
                        className="flex max-w-[40%] shrink-0 items-center whitespace-normal break-words border-r border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-shelf,#f3f6f5)_70%,white)] px-2 py-1.5 text-[11px] font-medium leading-snug text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_55%,transparent)]"
                        title={familyPrefix}
                      >
                        {familyPrefix}
                      </span>
                      <textarea
                        className="min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-[13px] font-medium leading-snug text-[var(--catalog-ink,#15231f)] outline-none"
                        rows={2}
                        value={row.label}
                        disabled={!editable || busy}
                        onChange={(e) =>
                          patchLocal(row.id, {
                            label: stripFamilyPrefixFromInput(
                              e.target.value,
                              familyPrefix,
                            ),
                          })
                        }
                        onBlur={() => void saveCatalogFields(row.id)}
                        aria-label={`Option ${index + 1} size or flavour`}
                      />
                    </div>
                  ) : (
                    <textarea
                      className={cn(
                        cellClass,
                        "min-h-9 h-auto resize-none py-1.5 font-medium leading-snug",
                      )}
                      rows={2}
                      value={row.label}
                      disabled={!editable || busy}
                      onChange={(e) =>
                        patchLocal(row.id, { label: e.target.value })
                      }
                      onBlur={() => void saveCatalogFields(row.id)}
                      aria-label={`Option ${index + 1} name`}
                    />
                  )}
                </div>

                <div className="px-1">
                  <input
                    className={cn(
                      cellClass,
                      "text-right font-semibold tabular-nums",
                    )}
                    inputMode="decimal"
                    value={row.sell}
                    disabled={!editable || busy}
                    onChange={(e) =>
                      patchLocal(row.id, { sell: e.target.value })
                    }
                    onBlur={() => void saveCatalogFields(row.id)}
                    placeholder="0.00"
                    aria-label={`Option ${index + 1} sell price`}
                  />
                </div>

                <div
                  className={cn(
                    "flex flex-col items-end justify-center px-1.5 tabular-nums",
                    marginTone,
                  )}
                  aria-live="polite"
                >
                  <span className="text-[12px] font-semibold leading-none">
                    {margin ? `${margin.margin.toFixed(0)}%` : "—"}
                  </span>
                  {margin ? (
                    <span className="mt-0.5 text-[10px] opacity-80">
                      {margin.profit >= 0 ? "+" : ""}
                      {margin.profit.toFixed(0)}
                    </span>
                  ) : null}
                </div>

                <div className="px-1">
                  <input
                    className={cn(cellClass, "text-right tabular-nums")}
                    inputMode="decimal"
                    value={row.cost}
                    disabled={!editable || busy}
                    onChange={(e) =>
                      patchLocal(row.id, { cost: e.target.value })
                    }
                    onBlur={() => void saveCatalogFields(row.id)}
                    placeholder="0.00"
                    aria-label={`Option ${index + 1} cost`}
                  />
                </div>

                <div className="px-1">
                  <input
                    className={cn(
                      cellClass,
                      "text-right font-semibold tabular-nums",
                    )}
                    inputMode="decimal"
                    value={row.stock}
                    disabled={
                      !canInventoryWrite || busy || row.isPackage || !branchId
                    }
                    onChange={(e) =>
                      patchLocal(row.id, { stock: e.target.value })
                    }
                    onBlur={() => void saveStock(row.id)}
                    placeholder="0"
                    aria-label={`Option ${index + 1} stock`}
                    title={
                      row.isPackage
                        ? "Package stock lives on the base product"
                        : undefined
                    }
                  />
                </div>

                <div className="px-1">
                  <input
                    className={cn(cellClass, "font-mono text-[12px]")}
                    value={row.barcode}
                    disabled={!editable || busy}
                    onChange={(e) =>
                      patchLocal(row.id, { barcode: e.target.value })
                    }
                    onBlur={() => void saveCatalogFields(row.id)}
                    placeholder="Scan"
                    aria-label={`Option ${index + 1} barcode`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
