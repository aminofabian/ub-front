"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { joinProductNameParts } from "@/lib/catalog-display";
import { shopItemPathFromCard } from "@/lib/config";
import { formatCartQty, formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";
import type { PublicWebCart } from "@/lib/web-cart";

type Props = {
  cart: PublicWebCart;
  onChangeQty: (itemId: string, nextQty: number) => void | Promise<void>;
  onRemove: (itemId: string) => void | Promise<void>;
  compact?: boolean;
  busyItemId?: string | null;
};

function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function ShopCartLines({
  cart,
  onChangeQty,
  onRemove,
  compact = false,
  busyItemId = null,
}: Props) {
  return (
    <ul className={cn("space-y-3", compact && "space-y-2")}>
      {cart.lines.map((line) => {
        const title = line.variantName
          ? joinProductNameParts(line.name, line.variantName)
          : line.name;
        const unitPrice = formatDisplayPrice(cart.currency, line.unitPrice);
        const lineTotal = formatDisplayPrice(cart.currency, line.lineTotal);
        const busy = busyItemId === line.itemId;
        const weighed = Boolean(line.weighed);
        const step = weighed ? 0.1 : 1;
        const unitLabel = (line.unitType ?? "").trim();
        const qtyLabel = formatCartQty(line.quantity);

        return (
          <li
            key={line.itemId}
            className={cn(
              "group flex gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 transition-shadow hover:shadow-sm",
              compact && "rounded-xl p-2.5",
            )}
          >
            <Link
              href={shopItemPathFromCard({
                id: line.itemId,
                sku: line.sku,
                name: line.name,
              })}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/40",
                compact ? "size-14" : "size-16 sm:size-[4.5rem]",
              )}
            >
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-lg font-semibold text-muted-foreground">
                  {line.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={shopItemPathFromCard({
                id: line.itemId,
                sku: line.sku,
                name: line.name,
              })}
                className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
              >
                {title}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unitPrice}
                {weighed && unitLabel ? ` / ${unitLabel}` : " each"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center rounded-xl border border-border bg-background shadow-xs"
                  aria-label={`Quantity for ${title}`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 rounded-l-xl px-0"
                    disabled={busy}
                    aria-label="Decrease quantity"
                    onClick={() => {
                      const next = roundQty(line.quantity - step);
                      void onChangeQty(line.itemId, next > 0 ? next : 0);
                    }}
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </Button>
                  <span className="min-w-10 px-1 text-center text-sm font-semibold tabular-nums">
                    {qtyLabel}
                    {weighed && unitLabel ? (
                      <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                        {unitLabel}
                      </span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 rounded-r-xl px-0"
                    disabled={busy}
                    aria-label="Increase quantity"
                    onClick={() =>
                      void onChangeQty(line.itemId, roundQty(line.quantity + step))
                    }
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => void onRemove(line.itemId)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </Button>
              </div>
            </div>
            <p className="shrink-0 self-start pt-0.5 text-sm font-bold tabular-nums text-foreground">
              {lineTotal}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
