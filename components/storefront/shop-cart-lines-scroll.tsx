"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { PublicWebCart } from "@/lib/web-cart";
import { ShopCartLines } from "@/components/storefront/shop-cart-lines";
import { cn } from "@/lib/utils";

type Props = {
  cart: PublicWebCart;
  busyItemId: string | null;
  onChangeQty: (itemId: string, nextQty: number) => void | Promise<void>;
  onRemove: (itemId: string) => void | Promise<void>;
  /** Tighter max height on mobile float. */
  compact?: boolean;
};

export function ShopCartLinesScroll({
  cart,
  busyItemId,
  onChangeQty,
  onRemove,
  compact,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollHeight > el.clientHeight + 4;
    setCanScroll(overflow);
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 8);
  }, []);

  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [cart.lines, measure]);

  return (
    <div className="relative min-h-0 flex-1">
      {canScroll && !atBottom ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-background via-background/80 to-transparent"
          aria-hidden
        />
      ) : null}

      <div
        ref={scrollRef}
        onScroll={measure}
        className={cn(
          "h-full overflow-y-auto overscroll-contain scroll-smooth",
          compact ? "max-h-[min(36dvh,14rem)]" : "max-h-[min(50dvh,20rem)]",

        )}
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        <ShopCartLines
          cart={cart}
          compact
          busyItemId={busyItemId}
          onChangeQty={onChangeQty}
          onRemove={onRemove}
        />
      </div>

      {canScroll && !atBottom ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-1 pt-8 bg-linear-to-t from-background via-background/95 to-transparent"
          aria-hidden
        >
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-background/95 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm">
            <ChevronDown className="size-3 animate-bounce" />
            Scroll for more
          </span>
        </div>
      ) : null}
    </div>
  );
}
