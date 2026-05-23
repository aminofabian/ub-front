"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, ChevronRight, Truck } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { statusBadgeClass } from "./supplier-ui-tokens";

const ROW_PX = 56;

export type VirtualizedSupplierListProps = {
  rows: SupplierRecord[];
  selectedId: string | null;
  totalLoaded: number;
  totalElements: number;
  onRowClick: (id: string) => void;
  loadingInitial: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
};

export function VirtualizedSupplierList({
  rows,
  selectedId,
  totalLoaded,
  totalElements,
  onRowClick,
  loadingInitial,
  loadingMore,
  hasMore,
  onLoadMore,
}: VirtualizedSupplierListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual list
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_PX,
    overscan: 12,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (
        scrollHeight - scrollTop - clientHeight < 240 &&
        hasMore &&
        !loadingMore
      ) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, onLoadMore, rows.length]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
      {/* List header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-muted/30 px-4 py-2.5 backdrop-blur-sm">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/80">
          <Truck className="size-3.5 text-primary" aria-hidden />
          Directory
        </span>
        {totalElements > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{totalLoaded}</span>
            {totalElements > totalLoaded ? (
              <>
                {" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {totalElements}
                </span>
              </>
            ) : null}{" "}
            loaded
          </span>
        ) : null}
      </div>

      {/* Column headers */}
      <div
        className="relative grid min-w-[28rem] shrink-0 grid-cols-[minmax(0,1fr)_4.5rem_5rem_5rem] gap-2 border-b border-border/40 bg-muted/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
        role="row"
      >
        <span>Name</span>
        <span className="hidden sm:block">Code</span>
        <span className="hidden sm:block">Type</span>
        <span>Status</span>
      </div>

      {/* Virtual scroll area */}
      <div
        ref={parentRef}
        className="min-h-[min(52vh,22rem)] flex-1 overflow-y-auto overscroll-contain scroll-smooth md:min-h-[24rem] xl:min-h-0"
        tabIndex={-1}
      >
        {loadingInitial && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
            <span
              className="size-5 animate-pulse rounded-full bg-primary/30"
              aria-hidden
            />
            Loading suppliers…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <BookUser
              className="size-10 text-muted-foreground/25"
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                No suppliers match
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Try widening your search or setting status to &quot;All&quot;.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="relative min-w-[28rem] w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const active = selectedId === row.id;
              const code = row.code?.trim() || "—";
              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  aria-label={`Supplier ${row.name}`}
                  className={cn(
                    "group absolute left-0 top-0 grid min-w-[28rem] w-full grid-cols-[minmax(0,1fr)_4.5rem_5rem_5rem] gap-2 border-b border-border/30 px-4 py-3.5 text-left text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                    active
                      ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/20"
                      : "hover:bg-muted/40",
                  )}
                  style={{ transform: `translateY(${vi.start}px)` }}
                  onClick={() => onRowClick(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(row.id);
                    }
                  }}
                >
                  <span
                    className={cn(
                      "min-w-0 truncate font-medium",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {row.name}
                  </span>
                  <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:block">
                    {code}
                  </span>
                  <span className="hidden truncate text-xs capitalize text-muted-foreground sm:block">
                    {row.supplierType}
                  </span>
                  <span>
                    <span
                      className={cn(
                        "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        statusBadgeClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "pointer-events-none absolute right-3 top-1/2 hidden size-3.5 -translate-y-1/2 text-muted-foreground transition-opacity sm:block",
                      active
                        ? "opacity-40"
                        : "opacity-0 group-hover:opacity-30",
                    )}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 border-t border-border/40 bg-background/90 py-2.5 text-center text-xs font-medium text-muted-foreground backdrop-blur-md">
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
