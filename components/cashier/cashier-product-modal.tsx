"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { itemListThumbnailUrl, type ItemSummaryRecord } from "@/lib/api";
import { tileHue } from "@/lib/top-products";
import { cn } from "@/lib/utils";

const QUICK_QTYS = [1, 2, 5, 10] as const;

export type CashierProductModalSubmit = {
  item: ItemSummaryRecord;
  quantity: number;
  unitPrice: string;
};

type CashierProductModalProps = {
  item: ItemSummaryRecord | null;
  open: boolean;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CashierProductModalSubmit) => void;
};

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toString();
}

export function CashierProductModal({
  item,
  open,
  currency,
  onOpenChange,
  onSubmit,
}: CashierProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset modal inputs each time it reopens.
      setQuantity(1);
      setUnitPrice("");
    }
  }, [open, item?.id]);

  const thumb = useMemo(() => (item ? itemListThumbnailUrl(item) : null), [item]);
  const hue = useMemo(() => (item ? tileHue(item.id) : 200), [item]);
  const accent = `hsl(${hue} 70% 35%)`;
  const subtotalNum = useMemo(() => {
    const u = Number(unitPrice);
    if (!Number.isFinite(u) || u < 0) return null;
    const total = quantity * u;
    return Math.round(total * 100) / 100;
  }, [quantity, unitPrice]);

  const canSubmit = item != null && quantity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className="overflow-hidden p-0">
        <div
          className="px-5 pb-3 pt-5"
          style={{
            backgroundImage: `linear-gradient(135deg, hsl(${hue} 80% 95%), hsl(${(hue + 40) % 360} 75% 86%))`,
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              {thumb ? (
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm">
                  <Image
                    src={thumb}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </span>
              ) : (
                <span
                  className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white text-2xl font-bold shadow-sm"
                  style={{ color: accent }}
                  aria-hidden
                >
                  {item?.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <div className="min-w-0">
                <DialogTitle
                  className="line-clamp-2 text-base font-semibold leading-tight"
                  style={{ color: accent }}
                >
                  {item?.name ?? "Item"}
                </DialogTitle>
                <DialogDescription className="text-xs uppercase tracking-wide text-foreground/70">
                  {item?.sku ? item.sku : "no sku"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 pb-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quantity
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Quantity"
                className="h-12 w-24 rounded-xl border bg-background text-center text-2xl font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 0) {
                    setQuantity(v);
                  } else if (e.target.value === "") {
                    setQuantity(0);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_QTYS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    quantity === q
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 hover:bg-muted",
                  )}
                  onClick={() => setQuantity(q)}
                >
                  ×{formatNum(q)}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Unit price ({currency})
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              placeholder="0.00"
              className="h-11 w-full rounded-xl border bg-background px-3 text-right text-lg font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  if (item) {
                    onSubmit({ item, quantity, unitPrice });
                  }
                }
              }}
            />
          </label>

          {subtotalNum != null && subtotalNum > 0 ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-center text-sm font-medium tabular-nums">
              Subtotal: {subtotalNum.toFixed(2)} {currency}
            </p>
          ) : null}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!canSubmit}
              onClick={() => {
                if (item) {
                  onSubmit({ item, quantity, unitPrice });
                }
              }}
              className="gap-2 sm:flex-1"
            >
              <ShoppingCart className="size-4" />
              Add to cart
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
