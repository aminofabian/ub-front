"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, ChevronRight, Loader2, Truck } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { SupEmptyState, SupLoadingBlock } from "./supplier-layout-primitives";
import {
  statusBadgeClass,
  supDirectoryShell,
  supDirectoryToolbar,
  supRowActive,
  supRowHover,
  supTableHead,
} from "./supplier-ui-tokens";

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
    <div className={cn(supDirectoryShell, "flex-1")}>
      <div className={supDirectoryToolbar}>
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/85">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
            <Truck className="size-3.5" aria-hidden />
          </span>
          Directory
        </span>
        {totalElements > 0 ? (
          <span className="rounded-md bg-background/80 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground ring-1 ring-border/50">
            <span className="font-semibold text-foreground">{totalLoaded}</span>
            {totalElements > totalLoaded ? (
              <>
                {" "}
                /{" "}
                <span className="font-semibold text-foreground">
                  {totalElements}
                </span>
              </>
            ) : null}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "relative grid min-w-[26rem] shrink-0 grid-cols-[minmax(0,1fr)_4.5rem_5rem_5rem] gap-2",
          supTableHead,
          "px-4 py-2.5",
        )}
        role="row"
      >
        <span>Name</span>
        <span className="hidden sm:block">Code</span>
        <span className="hidden sm:block">Type</span>
        <span>Status</span>
      </div>

      <div
        ref={parentRef}
        className="min-h-[min(52vh,22rem)] flex-1 overflow-y-auto overscroll-contain scroll-smooth md:min-h-[24rem] xl:min-h-0"
        tabIndex={-1}
      >
        {loadingInitial && rows.length === 0 ? (
          <SupLoadingBlock label="Loading suppliers…" />
        ) : rows.length === 0 ? (
          <SupEmptyState
            icon={BookUser}
            title="No suppliers match"
            description='Try widening your search or set status to "All statuses".'
            className="m-4 border-0 bg-transparent"
          />
        ) : (
          <div
            className="relative min-w-[26rem] w-full"
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
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "group absolute left-0 top-0 grid min-w-[26rem] w-full grid-cols-[minmax(0,1fr)_4.5rem_5rem_5rem] gap-2 border-b border-border/25 px-4 py-3 text-left text-sm",
                    "transition-[background-color,box-shadow] duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/35",
                    active ? supRowActive : supRowHover,
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
                      "min-w-0 truncate font-medium tracking-tight",
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
                        "inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize",
                        statusBadgeClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      "pointer-events-none absolute right-3 top-1/2 hidden size-3.5 -translate-y-1/2 text-muted-foreground transition-all duration-150 sm:block",
                      active
                        ? "translate-x-0 opacity-50"
                        : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-40",
                    )}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 flex items-center justify-center gap-2 border-t border-border/40 bg-background/95 py-2.5 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <Loader2 className="size-3.5 animate-spin text-primary/70" aria-hidden />
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
