import { SHOP_PRODUCT_GRID_CLASS } from "@/components/storefront/shop-product-grid-layout";
import { cn } from "@/lib/utils";

function ShopProductCardSkeleton() {
  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-[3px] border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper-elevated,#fff)] shadow-[0_1px_2px_rgba(20,24,22,0.04)]">
        <div
          className="aspect-square w-full animate-pulse bg-[linear-gradient(180deg,#fafbfa_0%,#f3f5f3_100%)]"
          aria-hidden
        />
        <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5">
          <div className="min-h-[2.25rem] space-y-1.5">
            <div className="h-3.5 w-[90%] animate-pulse rounded-sm bg-[var(--storefront-rule,#e4e6e4)]" aria-hidden />
            <div className="h-3.5 w-[70%] animate-pulse rounded-sm bg-[var(--storefront-rule,#e4e6e4)] opacity-80" aria-hidden />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="h-3.5 w-[4.5rem] animate-pulse rounded-sm bg-[var(--storefront-rule,#e4e6e4)]" aria-hidden />
            <div className="h-7 w-14 animate-pulse border border-[var(--storefront-card-border,#e2e5e2)] bg-[var(--storefront-paper,#f4f5f4)]" aria-hidden />
          </div>
        </div>
      </article>
    </li>
  );
}

export function ShopProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn(SHOP_PRODUCT_GRID_CLASS, className)}
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <ShopProductCardSkeleton key={i} />
      ))}
    </ul>
  );
}
