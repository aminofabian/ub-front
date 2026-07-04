"use client";

import { useEffect, useMemo, useState } from "react";
import { PackagePlus } from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import {
  postDailyAuditRestock,
  type StockTakeRestockItemRecord,
  type StockTakeRestockSupplierOptionRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function formatPrice(v: number | string | null | undefined): string {
  if (v == null || v === "") return "Price missing — admin will enter";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  lineId: string;
  itemName: string;
  options: StockTakeRestockSupplierOptionRecord[];
  pendingSuggestion: StockTakeRestockItemRecord | null;
  onSaved: (item: StockTakeRestockItemRecord) => void;
};

export function RestockDrawer({
  open,
  onOpenChange,
  sessionId,
  lineId,
  itemName,
  options,
  pendingSuggestion,
  onSaved,
}: Props) {
  const [supplierId, setSupplierId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.supplierId === supplierId) ?? null,
    [options, supplierId],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (pendingSuggestion) {
      setSupplierId(pendingSuggestion.supplierId);
      setQty(String(pendingSuggestion.suggestedQty));
      setNote(pendingSuggestion.notes ?? "");
      return;
    }
    const primary = options.find((o) => o.primary) ?? options[0] ?? null;
    setSupplierId(primary?.supplierId ?? "");
    setQty("");
    setNote("");
  }, [open, options, pendingSuggestion]);

  const submit = async () => {
    const parsedQty = Number(qty);
    if (!supplierId) {
      setError("Choose a supplier.");
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await postDailyAuditRestock(sessionId, {
        lineId,
        supplierId,
        suggestedQty: parsedQty,
        note: note.trim() || null,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save restock suggestion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={pendingSuggestion ? "Update restock suggestion" : "Add to restock list"}
      description={`Recommend restocking for ${itemName}. Price is set from the supplier link.`}
      contextLabel="Daily audit"
      icon={<PackagePlus className="h-5 w-5" />}
      width="default"
      banner={error ? <FormDrawerMessageBanner text={error} /> : null}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || options.length === 0}>
            {saving ? "Saving…" : pendingSuggestion ? "Update" : "Add to list"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Supplier</legend>
          {options.map((opt) => {
            const lastPurchase = formatDate(opt.lastPurchaseAt);
            const packLabel =
              opt.packSize && opt.packUnit
                ? ` · ${opt.packSize} ${opt.packUnit}`
                : opt.packUnit
                  ? ` · ${opt.packUnit}`
                  : "";
            return (
              <label
                key={opt.supplierId}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition-colors",
                  supplierId === opt.supplierId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="restock-supplier"
                  className="mt-1"
                  checked={supplierId === opt.supplierId}
                  onChange={() => setSupplierId(opt.supplierId)}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">
                    {opt.supplierName}
                    {opt.primary ? " · Primary" : ""}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    KES {formatPrice(opt.buyingPrice ?? opt.defaultCostPrice ?? opt.lastCostPrice)}
                    {packLabel}
                    {lastPurchase ? ` · Last purchase: ${lastPurchase}` : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {selected ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Buying price snapshot: KES{" "}
            {formatPrice(selected.buyingPrice ?? selected.defaultCostPrice ?? selected.lastCostPrice)}
          </p>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Suggested quantity</span>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            className={dashboardInputClass()}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Note (optional)</span>
          <textarea
            className={cn(dashboardInputClass(), "min-h-[72px] resize-y")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shelf gap, promo demand, etc."
          />
        </label>
      </div>
    </FormDrawer>
  );
}
