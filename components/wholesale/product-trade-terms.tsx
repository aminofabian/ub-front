"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchItemTradeTerms, saveItemTradeTerms, type ItemTradeTerms } from "@/lib/api";

type BreakDraft = { minQty: string; unitPrice: string };

const MAX_BREAKS = 6;

function plain(value: number): string {
  return String(Number(value.toFixed(4)));
}

function describe(terms: ItemTradeTerms): string {
  const parts: string[] = [];
  if (terms.minOrderQty != null) {
    parts.push(`Minimum order ${plain(terms.minOrderQty)}`);
  }
  for (const b of terms.priceBreaks) {
    parts.push(`${plain(b.minQty)} or more at ${plain(b.unitPrice)} each`);
  }
  return parts.join(" · ");
}

/**
 * Wholesale terms for one product: the least a shopper may order online and lower prices from set
 * quantities. Shown on a supplier's shop only. The till is not affected.
 */
export function ProductTradeTermsSection({
  itemId,
  canEdit,
  className,
  labelClassName,
}: {
  itemId: string;
  canEdit: boolean;
  className?: string;
  labelClassName?: string;
}) {
  const [terms, setTerms] = useState<ItemTradeTerms | null>(null);
  const [editing, setEditing] = useState(false);
  const [minimum, setMinimum] = useState("");
  const [breaks, setBreaks] = useState<BreakDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    fetchItemTradeTerms(itemId)
      .then((t) => {
        if (alive) setTerms(t);
      })
      .catch(() => {
        // Unknown is not "none": show nothing rather than an empty form that would overwrite.
        if (alive) setTerms(null);
      });
    return () => {
      alive = false;
    };
  }, [itemId]);

  useEffect(() => {
    setTerms(null);
    setEditing(false);
    return load();
  }, [load]);

  if (!terms) return null;
  const hasTerms = terms.minOrderQty != null || terms.priceBreaks.length > 0;
  if (!hasTerms && !canEdit) return null;

  const startEditing = () => {
    setMinimum(terms.minOrderQty != null ? plain(terms.minOrderQty) : "");
    setBreaks(terms.priceBreaks.map((b) => ({ minQty: plain(b.minQty), unitPrice: plain(b.unitPrice) })));
    setEditing(true);
  };

  const save = async () => {
    const minOrderQty = minimum.trim() === "" ? null : Number(minimum);
    if (minOrderQty != null && !(minOrderQty > 0)) {
      toast.error("The minimum order must be more than zero");
      return;
    }
    const filled = breaks.filter((b) => b.minQty.trim() !== "" || b.unitPrice.trim() !== "");
    const priceBreaks = filled.map((b) => ({ minQty: Number(b.minQty), unitPrice: Number(b.unitPrice) }));
    if (priceBreaks.some((b) => !(b.minQty > 1) || !(b.unitPrice > 0))) {
      toast.error("Each quantity price needs a quantity above 1 and a price");
      return;
    }
    setSaving(true);
    try {
      setTerms(await saveItemTradeTerms(itemId, { minOrderQty, priceBreaks }));
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the wholesale terms");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-11 w-full border border-foreground/15 bg-background px-2 text-[14px] tabular-nums text-foreground sm:h-9";
  const buttonClass =
    "inline-flex h-11 shrink-0 items-center border border-foreground/15 px-3 text-[13px] font-medium text-foreground hover:bg-foreground/[0.04] disabled:opacity-50 sm:h-9";

  return (
    <section className={className}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className={labelClassName}>Wholesale terms</p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            {hasTerms ? describe(terms) : "No minimum order and no quantity prices."} These apply to online orders, not
            the till.
          </p>
        </div>
        {canEdit && !editing ? (
          <button type="button" className={buttonClass} onClick={startEditing}>
            {hasTerms ? "Edit" : "Set terms"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <label className="block max-w-[14rem] text-[13px] text-foreground">
            Minimum order
            <input
              className={`${inputClass} mt-1`}
              inputMode="decimal"
              placeholder="None"
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            />
          </label>

          <div className="space-y-2">
            <p className="text-[13px] text-foreground">Quantity prices</p>
            {breaks.map((b, index) => (
              <div key={index} className="flex items-end gap-2">
                <label className="block w-28 text-[12px] text-muted-foreground">
                  From quantity
                  <input
                    className={`${inputClass} mt-1`}
                    inputMode="decimal"
                    value={b.minQty}
                    onChange={(e) =>
                      setBreaks((rows) => rows.map((r, i) => (i === index ? { ...r, minQty: e.target.value } : r)))
                    }
                  />
                </label>
                <label className="block w-32 text-[12px] text-muted-foreground">
                  Price each
                  <input
                    className={`${inputClass} mt-1`}
                    inputMode="decimal"
                    value={b.unitPrice}
                    onChange={(e) =>
                      setBreaks((rows) => rows.map((r, i) => (i === index ? { ...r, unitPrice: e.target.value } : r)))
                    }
                  />
                </label>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setBreaks((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            {breaks.length < MAX_BREAKS ? (
              <button
                type="button"
                className={buttonClass}
                onClick={() => setBreaks((rows) => [...rows, { minQty: "", unitPrice: "" }])}
              >
                Add a quantity price
              </button>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button type="button" className={buttonClass} disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className={buttonClass} disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
