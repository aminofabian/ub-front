"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, Loader2, Truck } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { SupEmptyState, SupLoadingBlock } from "./supplier-layout-primitives";
import {
  statusBadgeClass,
  statusDotClass,
  supDirectoryShell,
  supDirectoryToolbar,
  supKicker,
  supRowActive,
  supRowActiveCompact,
  supRowHover,
  supRowHoverCompact,
  supTableHead,
} from "./supplier-ui-tokens";

const ROW_PX_DEFAULT = 52;
const ROW_PX_COMPACT = 36;

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
  compact?: boolean;
};

function SupplierRowContent({
  row,
  active,
  compact,
}: {
  row: SupplierRecord;
  active: boolean;
  compact: boolean;
}) {
  const code = row.code?.trim();

  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(row.status))}
          aria-hidden
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-medium tracking-tight",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {row.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn("size-2 shrink-0 rounded-full", statusDotClass(row.status))}
        title={row.status}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-medium tracking-tight",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {row.name}
        </span>
        {code ? (
          <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
            {code}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "hidden shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize sm:inline-flex",
          statusBadgeClass(row.status),
        )}
      >
        {row.status}
      </span>
    </div>
  );
}

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
  compact = false,
}: VirtualizedSupplierListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowPx = compact ? ROW_PX_COMPACT : ROW_PX_DEFAULT;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual list
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowPx,
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
    <div
      className={cn(
        supDirectoryShell,
        "min-h-0 flex-1",
        compact && "rounded-xl",
      )}
    >
      <div
        className={cn(
          supDirectoryToolbar,
          compact ? "gap-2 px-2.5 py-1.5" : "px-3 py-2.5 sm:px-4",
        )}
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-2",
            compact ? "text-[10px]" : "text-xs sm:text-sm",
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20 shadow-sm">
            <Truck className={compact ? "size-3" : "size-3.5"} aria-hidden />
          </span>
          <span className={cn(supKicker, "text-foreground/80")}>Directory</span>
        </span>
        {totalElements > 0 ? (
          <span
            className={cn(
              "shrink-0 rounded-lg bg-background/90 tabular-nums text-muted-foreground ring-1 ring-border/45 shadow-sm",
              compact
                ? "px-2 py-0.5 text-[10px]"
                : "px-2.5 py-1 text-xs sm:text-sm",
            )}
          >
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

      {!compact ? (
        <div
          className={cn(
            supTableHead,
            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5",
          )}
        >
          <span>Supplier</span>
          <span className="hidden sm:inline">Status</span>
        </div>
      ) : null}

      <div
        ref={parentRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth",
          compact
            ? "xl:min-h-[8rem]"
            : "max-lg:max-h-[calc(100dvh-13.5rem)] xl:min-h-[12rem]",
        )}
        tabIndex={-1}
      >
        {loadingInitial && rows.length === 0 ? (
          <SupLoadingBlock label="Loading suppliers…" />
        ) : rows.length === 0 ? (
          <SupEmptyState
            icon={BookUser}
            title="No suppliers match"
            description='Try widening your search or set status to "All statuses".'
            className="m-3 border-0 bg-transparent sm:m-4"
          />
        ) : (
          <div
            className="relative w-full min-w-0"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const active = selectedId === row.id;
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
                    "absolute left-0 top-0 w-full min-w-0 border-b border-border/20 text-left",
                    compact ? "px-1 py-0.5 text-xs" : "px-0 py-0 text-base",
                    "transition-[background-color,border-color,box-shadow] duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                    active
                      ? compact
                        ? supRowActiveCompact
                        : supRowActive
                      : compact
                        ? supRowHoverCompact
                        : supRowHover,
                    !compact && "py-1",
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
                  <div className={cn(!compact && "px-3 sm:px-4", compact && "py-0.5")}>
                    <SupplierRowContent row={row} active={active} compact={compact} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div
            className={cn(
              "sticky bottom-0 flex items-center justify-center gap-1.5 border-t border-border/40 bg-background/95 font-medium text-muted-foreground backdrop-blur-md",
              compact ? "py-1.5 text-xs" : "gap-2 py-2.5 text-sm",
            )}
          >
            <Loader2
              className={cn(
                "animate-spin text-primary/70",
                compact ? "size-3.5" : "size-4",
              )}
              aria-hidden
            />
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
