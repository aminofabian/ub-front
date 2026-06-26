import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      aria-hidden
    />
  );
}

function ProductRowSkeleton({ delayMs = 0 }: { delayMs?: number }) {
  return (
    <tr
      className="border-b"
      style={{ animationDelay: `${delayMs}ms` }}
      aria-hidden
    >
      <td className="py-2.5">
        <SkeletonBar className="mx-auto size-4 rounded" />
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded border bg-muted/40">
            <Package className="size-4 text-muted-foreground/30" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonBar className="h-3.5 w-[min(100%,14rem)]" />
            <SkeletonBar className="h-2.5 w-[min(100%,8rem)]" />
          </div>
        </div>
      </td>
      <td className="py-2.5">
        <SkeletonBar className="h-3 w-16" />
      </td>
      <td className="py-2.5">
        <SkeletonBar className="h-3 w-24" />
      </td>
      <td className="py-2.5">
        <SkeletonBar className="ml-auto h-3 w-12" />
      </td>
      <td className="py-2.5">
        <SkeletonBar className="ml-auto h-3 w-12" />
      </td>
    </tr>
  );
}

export function GlobalCatalogProductTableSkeleton({
  rows = 10,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <tbody className={className} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: rows }, (_, index) => (
        <ProductRowSkeleton key={index} delayMs={index * 35} />
      ))}
    </tbody>
  );
}

export function GlobalCatalogLoadMoreSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="pointer-events-none border-t border-border/40 bg-gradient-to-b from-transparent to-muted/20 pt-1"
      aria-busy="true"
      aria-label="Loading more products"
    >
      <table className="w-full text-left text-sm">
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <ProductRowSkeleton key={index} delayMs={index * 50} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
