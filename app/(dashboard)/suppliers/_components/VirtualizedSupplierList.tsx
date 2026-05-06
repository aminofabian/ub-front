"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, ChevronRight, Factory } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROW_PX = 52;

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
    if (!el) {
      return;
    }
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 240 && hasMore && !loadingMore) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, onLoadMore, rows.length]);

  const showingHint =
    totalElements > 0 ? (
      <span className="tabular-nums text-[11px]">
        <span className="font-semibold text-foreground">{totalLoaded}</span> loaded
        {totalElements > totalLoaded ? (
          <>
            {" "}
            · <span className="font-semibold text-foreground">{totalElements}</span> total matches
          </>
        ) : null}
      </span>
    ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/55 bg-card/80 shadow-sm ring-1 ring-black/[0.02] dark:bg-card/70 dark:ring-white/[0.04]">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/50 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.1em] text-foreground/85">
          <Factory className="size-3.5 text-primary" aria-hidden />
          Directory
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
        <span className="hidden text-muted-foreground/90 sm:inline">
          Virtual list — scroll for more.{" "}
          <kbd className="rounded border border-border bg-background px-1 py-px font-mono text-[9px]">/</kbd> search.
        </span>
        {showingHint ? (
          <>
            <span className="hidden h-3 w-px bg-border lg:block" aria-hidden />
            <span className="hidden lg:inline">{showingHint}</span>
          </>
        ) : null}
      </div>
      <div
        className="relative grid min-w-[32rem] shrink-0 grid-cols-[minmax(0,1fr)_5rem_5.5rem_5rem] gap-2 border-b border-border/50 bg-muted/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
        role="row"
      >
        <span>Name</span>
        <span className="hidden sm:block">Code</span>
        <span className="hidden sm:block">Type</span>
        <span>Status</span>
      </div>
      <div
        ref={parentRef}
        className="min-h-[min(52vh,22rem)] flex-1 overflow-auto overscroll-contain scroll-smooth md:min-h-[24rem] lg:min-h-0"
        tabIndex={-1}
      >
        {loadingInitial && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-pulse rounded-full bg-primary/35" aria-hidden />
            Loading suppliers…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <BookUser className="size-12 text-muted-foreground/30" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">No suppliers match</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Try widening search or setting status to “All”.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative min-w-[32rem] w-full" style={{ height: virtualizer.getTotalSize() }}>
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
                    "group absolute left-0 top-0 grid min-w-[32rem] w-full grid-cols-[minmax(0,1fr)_5rem_5.5rem_5rem] gap-2 border-b border-border/30 px-3 py-3 text-left text-sm transition-colors",
                    "hover:bg-muted/50",
                    active ?
                      "bg-primary/[0.08] ring-1 ring-inset ring-primary/20"
                    : "bg-transparent",
                  )}
                  style={{
                    transform: `translateY(${vi.start}px)`,
                  }}
                  onClick={() => onRowClick(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row.id);
                    }
                  }}
                >
                  <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
                  <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:block" title={code}>
                    {code}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block" title={row.supplierType}>
                    {row.supplierType}
                  </span>
                  <span className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-transparent",
                        row.status === "active"
                          ? "bg-emerald-500/12 text-emerald-800 ring-emerald-500/25 dark:text-emerald-200"
                          : row.status === "blocked"
                            ? "bg-destructive/12 text-destructive ring-destructive/20"
                            : "bg-muted/80 text-muted-foreground ring-border/50",
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "pointer-events-none absolute right-2 top-1/2 hidden size-4 -translate-y-1/2 text-muted-foreground transition-opacity sm:block",
                      active ? "opacity-50" : "opacity-0 group-hover:opacity-40",
                    )}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 border-t border-border/45 bg-background/92 py-2.5 text-center text-xs font-medium text-muted-foreground backdrop-blur-md">
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
