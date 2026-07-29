import { cn } from "@/lib/utils";

function ShopProductCardSkeleton() {
  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-[2px] border border-[#e5e5e5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="aspect-square w-full animate-pulse bg-[#fafafa]" aria-hidden />
        <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2.5 pt-1.5 sm:px-3 sm:pb-3 sm:pt-2">
          <div className="min-h-[3.75rem] space-y-1.5">
            <div className="h-3.5 w-[90%] animate-pulse rounded-sm bg-[#e5e5e5]" aria-hidden />
            <div className="h-3.5 w-[70%] animate-pulse rounded-sm bg-[#eeeeee]" aria-hidden />
            <div className="h-3.5 w-[45%] animate-pulse rounded-sm bg-[#f0f0f0]" aria-hidden />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="h-3.5 w-[4.5rem] animate-pulse rounded-sm bg-[#e5e5e5]" aria-hidden />
            <div className="h-7 w-14 animate-pulse border border-[#e5e5e5] bg-[#f5f5f5]" aria-hidden />
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
        "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5",
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
