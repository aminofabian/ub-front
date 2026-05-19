import { cn } from "@/lib/utils";

function ShopProductCardSkeleton() {
  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/30 bg-card">
        <div className="aspect-square w-full animate-pulse bg-muted/50" aria-hidden />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="h-3.5 w-full animate-pulse rounded bg-muted" aria-hidden />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" aria-hidden />
          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" aria-hidden />
              <div className="h-2.5 w-10 animate-pulse rounded bg-muted/70" aria-hidden />
            </div>
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
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5",
        className,
      )}
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <ShopProductCardSkeleton key={i} />
      ))}
    </ul>
  );
}
