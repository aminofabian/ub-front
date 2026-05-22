import { catalogListGridClass, catalogRowHeightPx } from "./catalog-list-styles";
import { cn } from "@/lib/utils";

type CatalogDensity = "comfortable" | "dense";

function CatalogListSkeletonRow({
  density,
  withBlockGap,
}: {
  density: CatalogDensity;
  withBlockGap: boolean;
}) {
  const minH = catalogRowHeightPx("standalone", density, withBlockGap);

  return (
    <div
      className={cn(
        catalogListGridClass,
        "border-b border-border/30 px-2.5",
        withBlockGap && "mt-4 first:mt-0",
      )}
      style={{ minHeight: minH }}
      role="row"
      aria-hidden
    >
      <span className="flex items-center justify-center">
        <span className="size-4 animate-pulse rounded bg-muted" />
      </span>
      <span className="flex items-center justify-center">
        <span className="size-9 animate-pulse rounded-lg bg-muted" />
      </span>
      <span className="flex min-w-0 flex-col justify-center gap-1.5 py-2">
        <span className="h-3.5 w-[72%] max-w-xs animate-pulse rounded bg-muted" />
        <span className="h-3 w-[42%] max-w-[10rem] animate-pulse rounded bg-muted/80" />
      </span>
      <span className="flex items-center justify-end">
        <span className="h-5 w-12 animate-pulse rounded-full bg-muted" />
      </span>
      <span className="hidden md:flex md:items-center md:justify-end">
        <span className="h-3 w-20 animate-pulse rounded bg-muted" />
      </span>
      <span className="sr-only" />
    </div>
  );
}

export function CatalogListSkeleton({
  density,
  count = 12,
}: {
  density: CatalogDensity;
  count?: number;
}) {
  return (
    <div className="py-1" aria-busy="true" aria-label="Loading catalog">
      {Array.from({ length: count }, (_, i) => (
        <CatalogListSkeletonRow
          key={i}
          density={density}
          withBlockGap={i > 0 && i % 4 === 0}
        />
      ))}
    </div>
  );
}
