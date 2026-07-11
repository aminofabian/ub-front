import { cn } from "@/lib/utils";

function ShopProductCardSkeleton() {
  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div
          className="aspect-square w-full animate-pulse border-b border-border/35 bg-white dark:bg-[oklch(0.99_0_0)]"
          aria-hidden
        />
        <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2">
          <div className="min-h-[3.1rem] space-y-1 sm:min-h-[3.25rem]">
            <div className="h-3 w-full animate-pulse rounded-sm bg-muted/70" aria-hidden />
            <div className="h-2.5 w-[55%] animate-pulse rounded-sm bg-muted/50" aria-hidden />
          </div>
          <div className="mt-auto border-t border-border/30 pt-1.5">
            <div className="h-4 w-16 animate-pulse rounded-sm bg-muted/70" aria-hidden />
          </div>
          <div className="mt-2 h-8 w-full animate-pulse rounded-md bg-muted/50" aria-hidden />
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
        "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-3.5 xl:grid-cols-5",
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
