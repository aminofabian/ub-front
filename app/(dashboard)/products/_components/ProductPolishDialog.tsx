"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  patchItem,
  type CategoryRecord,
  type ItemDetailRecord,
  type ItemTypeRecord,
  type PatchItemPayload,
} from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { polishProduct, type ProductPolishSuggestion } from "@/lib/sokomind";

import { formatMutationError } from "../_utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  detail: ItemDetailRecord | null;
  categories: CategoryRecord[];
  itemTypes: ItemTypeRecord[];
  currencyCode?: string;
  /** When false the review is read-only (viewer without catalog write). */
  canEdit?: boolean;
  onApplied?: () => void;
};

type SuggestionKey =
  | "name"
  | "brand"
  | "size"
  | "description"
  | "category"
  | "department"
  | "pricing"
  | "stock";

const num = (v: number | string | null | undefined): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function ProductPolishDialog({
  open,
  onOpenChange,
  itemId,
  detail,
  categories,
  itemTypes,
  currencyCode = "",
  canEdit = true,
  onApplied,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProductPolishSuggestion | null>(null);
  const [applying, setApplying] = useState<SuggestionKey | "all" | null>(null);
  const [applied, setApplied] = useState<Set<SuggestionKey>>(new Set());

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError("");
    setResult(null);
    setApplied(new Set());
    if (!itemId) return;
    setBusy(true);
    polishProduct(itemId)
      .then((res) => setResult(res))
      .catch((e) => setError(formatMutationError(e, "Could not review the product. Try again.")))
      .finally(() => setBusy(false));
  }, [open, itemId]);

  const currentCategoryName = useMemo(() => {
    if (!detail?.categoryId) return null;
    return categories.find((c) => c.id === detail.categoryId)?.name ?? null;
  }, [categories, detail]);

  const currentDepartmentName = useMemo(() => {
    if (!detail?.itemTypeId) return null;
    return itemTypes.find((t) => t.id === detail.itemTypeId)?.label ?? null;
  }, [itemTypes, detail]);

  const rows = useMemo(() => {
    if (!result) return [];
    const out: {
      key: SuggestionKey;
      label: string;
      current: string | null;
      suggested: string;
      reason?: string | null;
      payload: PatchItemPayload;
    }[] = [];

    if (result.suggestedName && result.suggestedName.trim() !== detail?.name?.trim()) {
      out.push({
        key: "name",
        label: "Name",
        current: detail?.name?.trim() || null,
        suggested: result.suggestedName.trim(),
        payload: { name: result.suggestedName.trim() },
      });
    }
    if (result.suggestedBrand && result.suggestedBrand.trim() !== detail?.brand?.trim()) {
      out.push({
        key: "brand",
        label: "Brand",
        current: detail?.brand?.trim() || null,
        suggested: result.suggestedBrand.trim(),
        payload: { brand: result.suggestedBrand.trim() },
      });
    }
    if (result.suggestedSize && result.suggestedSize.trim() !== detail?.size?.trim()) {
      out.push({
        key: "size",
        label: "Size",
        current: detail?.size?.trim() || null,
        suggested: result.suggestedSize.trim(),
        payload: { size: result.suggestedSize.trim() },
      });
    }
    if (result.suggestedDescription && result.suggestedDescription.trim() !== detail?.description?.trim()) {
      out.push({
        key: "description",
        label: "Description",
        current: detail?.description?.trim() || null,
        suggested: result.suggestedDescription.trim(),
        payload: { description: result.suggestedDescription.trim() },
      });
    }
    if (result.categoryId && result.categoryId !== detail?.categoryId) {
      out.push({
        key: "category",
        label: "Category",
        current: currentCategoryName,
        suggested: result.categoryName || result.categoryId,
        reason: result.categoryReason,
        payload: { categoryId: result.categoryId },
      });
    }
    if (result.itemTypeId && result.itemTypeId !== detail?.itemTypeId) {
      out.push({
        key: "department",
        label: "Department",
        current: currentDepartmentName,
        suggested: result.itemTypeName || result.itemTypeId,
        reason: result.itemTypeReason,
        payload: { itemTypeId: result.itemTypeId },
      });
    }
    const sell = num(result.suggestedSellPrice);
    const cost = num(result.suggestedCostPrice);
    if (sell != null || cost != null) {
      const payload: PatchItemPayload = {};
      if (sell != null && sell !== num(detail?.bundlePrice)) payload.bundlePrice = sell;
      if (cost != null && cost !== num(detail?.buyingPrice)) payload.buyingPrice = cost;
      if (Object.keys(payload).length > 0) {
        out.push({
          key: "pricing",
          label: "Pricing",
          current: [
            detail?.bundlePrice != null ? `Sell ${formatMoney(detail.bundlePrice, currencyCode)}` : null,
            detail?.buyingPrice != null ? `Cost ${formatMoney(detail.buyingPrice, currencyCode)}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
          suggested: [sell != null ? `Sell ${formatMoney(sell, currencyCode)}` : null, cost != null ? `Cost ${formatMoney(cost, currencyCode)}` : null]
            .filter(Boolean)
            .join(" · "),
          reason: result.pricingReason,
          payload,
        });
      }
    }
    const min = num(result.suggestedMinStock);
    const reorder = num(result.suggestedReorderLevel);
    const reorderQty = num(result.suggestedReorderQty);
    if (min != null || reorder != null || reorderQty != null) {
      const payload: PatchItemPayload = {};
      if (min != null && min !== num(detail?.minStockLevel)) payload.minStockLevel = min;
      if (reorder != null && reorder !== num(detail?.reorderLevel)) payload.reorderLevel = reorder;
      if (reorderQty != null && reorderQty !== num(detail?.reorderQty)) payload.reorderQty = reorderQty;
      if (Object.keys(payload).length > 0) {
        out.push({
          key: "stock",
          label: "Stock levels",
          current: [
            detail?.minStockLevel != null ? `Min ${detail.minStockLevel}` : null,
            detail?.reorderLevel != null ? `Reorder ${detail.reorderLevel}` : null,
            detail?.reorderQty != null ? `Qty ${detail.reorderQty}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
          suggested: [
            min != null ? `Min ${min}` : null,
            reorder != null ? `Reorder ${reorder}` : null,
            reorderQty != null ? `Qty ${reorderQty}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          reason: result.stockReason,
          payload,
        });
      }
    }
    return out;
  }, [result, detail, currentCategoryName, currentDepartmentName, currencyCode]);

  const apply = async (key: SuggestionKey | "all") => {
    if (!itemId) return;
    const payload: PatchItemPayload =
      key === "all" ? rows.reduce<PatchItemPayload>((acc, r) => ({ ...acc, ...r.payload }), {}) : (rows.find((r) => r.key === key)?.payload ?? {});
    if (Object.keys(payload).length === 0) return;
    setApplying(key);
    try {
      await patchItem(itemId, payload);
      if (key === "all") {
        setApplied(new Set(rows.map((r) => r.key)));
      } else {
        setApplied((prev) => new Set(prev).add(key));
      }
      toast.success(key === "all" ? "All suggestions applied." : "Suggestion applied.");
      onApplied?.();
    } catch (e) {
      toast.error(formatMutationError(e, "Could not apply the suggestion."));
    } finally {
      setApplying(null);
    }
  };

  const pendingRows = rows.filter((r) => !applied.has(r.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/50 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Polish with AI
          </DialogTitle>
          <DialogDescription>
            {detail ? (
              <>
                Reviewing <span className="font-medium text-foreground">{detail.name}</span> — name,
                description, category, pricing and stock. Apply only what makes sense.
              </>
            ) : (
              "Reviewing the product…"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {busy ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Going through everything — name, description, category, pricing, stock…
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
              <p className="max-w-sm text-sm text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (!itemId) return;
                  setError("");
                  setBusy(true);
                  polishProduct(itemId)
                    .then((res) => setResult(res))
                    .catch((e) => setError(formatMutationError(e, "Could not review the product. Try again.")))
                    .finally(() => setBusy(false));
                }}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Try again
              </Button>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {result.summary ? (
                <p className="text-sm leading-relaxed text-foreground/80">{result.summary}</p>
              ) : null}
              {result.issues.length > 0 ? (
                <ul className="space-y-1">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/70">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      {issue}
                    </li>
                  ))}
                </ul>
              ) : null}

              {rows.length === 0 ? (
                <p className="rounded-md border border-border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                  No changes suggested — this product already looks good.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((row) => {
                    const done = applied.has(row.key);
                    return (
                      <div
                        key={row.key}
                        className={done ? "border border-border bg-muted/20 px-3 py-2.5" : "border border-border px-3 py-2.5"}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {row.label}
                            </p>
                            {row.current ? (
                              <p className="mt-0.5 text-[13px] text-muted-foreground/70">
                                <span className="text-muted-foreground/50 line-through decoration-muted-foreground/40">
                                  {row.current}
                                </span>
                              </p>
                            ) : null}
                            <p className="text-[13px] font-medium text-foreground">{row.suggested}</p>
                            {row.reason ? (
                              <p className="mt-0.5 text-[12px] text-muted-foreground">{row.reason}</p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={done ? "ghost" : "secondary"}
                            className="h-7 shrink-0 gap-1 px-2 text-[11px] shadow-none"
                            disabled={!canEdit || done || applying !== null}
                            onClick={() => void apply(row.key)}
                          >
                            {done ? (
                              <>
                                <Check className="size-3 text-emerald-600" aria-hidden />
                                Applied
                              </>
                            ) : applying === row.key ? (
                              <Loader2 className="size-3 animate-spin" aria-hidden />
                            ) : (
                              "Apply"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-4">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canEdit && pendingRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={applying !== null}
              onClick={() => void apply("all")}
            >
              {applying === "all" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              Apply all ({pendingRows.length})
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
