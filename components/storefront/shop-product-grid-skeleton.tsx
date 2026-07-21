import { cn } from "@/lib/utils";

function ShopProductCardSkeleton() {
  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div
          className="aspect-[4/3] w-full animate-pulse bg-[linear-gradient(165deg,oklch(0.975_0.003_95)_0%,oklch(0.955_0.005_95)_100%)] dark:bg-[linear-gradient(165deg,oklch(0.22_0.01_95)_0%,oklch(0.18_0.01_95)_100%)]"
          aria-hidden
        />
        <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
          <div className="min-h-[3.25rem] space-y-1 sm:min-h-[3.4rem]">
            <div className="h-3.5 w-[88%] animate-pulse rounded-sm bg-muted/70" aria-hidden />
            <div className="h-3.5 w-[62%] animate-pulse rounded-sm bg-muted/55" aria-hidden />
            <div className="h-2.5 w-[42%] animate-pulse rounded-sm bg-muted/45" aria-hidden />
          </div>
          <div className="mt-auto flex flex-col gap-2 border-t border-border/40 pt-2">
            <div className="h-3.5 w-[4.25rem] animate-pulse rounded-sm bg-muted/70" aria-hidden />
            <div className="h-8 w-full animate-pulse rounded-lg bg-muted/50" aria-hidden />
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
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5",
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
