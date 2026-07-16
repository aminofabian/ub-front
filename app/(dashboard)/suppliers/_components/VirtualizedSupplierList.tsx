"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, Loader2 } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { SupEmptyState, SupLoadingBlock } from "./supplier-layout-primitives";
import {
  statusBadgeClass,
  supDirectoryShell,
  supDirectoryToolbar,
  supTableHead,
} from "./supplier-ui-tokens";

const ROW_PX_DEFAULT = 40;
const ROW_PX_COMPACT = 34;

const COLS_DEFAULT =
  "grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(4.5rem,auto)]";
const COLS_COMPACT = "grid-cols-[minmax(0,1fr)_auto]";

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
  const cols = compact ? COLS_COMPACT : COLS_DEFAULT;

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
    <div className={cn(supDirectoryShell, "min-h-0 flex-1")}>
      <div
        className={cn(
          supDirectoryToolbar,
          compact ? "gap-2 px-2.5 py-1.5" : "px-3 py-2 sm:px-3.5",
        )}
      >
        <span
          className={cn(
            "min-w-0 font-medium text-muted-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          Directory
        </span>
        {totalElements > 0 ? (
          <span
            className={cn(
              "shrink-0 tabular-nums text-muted-foreground",
              compact ? "text-[11px]" : "text-xs",
            )}
          >
            <span className="font-semibold text-foreground">{totalLoaded}</span>
            {totalElements > totalLoaded ? (
              <>
                {" "}
                of{" "}
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
          supTableHead,
          "grid items-center gap-x-3",
          cols,
          compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 sm:px-3.5",
        )}
      >
        <span>Name</span>
        {!compact ? <span>Code</span> : null}
        <span className={cn(!compact && "text-right")}>Status</span>
      </div>

      <div
        ref={parentRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth",
          compact
            ? "xl:min-h-[8rem]"
            : "max-lg:max-h-[calc(100dvh-13.5rem)] xl:min-h-[12rem]",
        )}
        tabIndex={-1}
        role="table"
        aria-label="Suppliers directory"
      >
        {loadingInitial && rows.length === 0 ? (
          <SupLoadingBlock label="Loading suppliers…" />
        ) : rows.length === 0 ? (
          <SupEmptyState
            icon={BookUser}
            title="No suppliers match"
            description='Try a different search, or set status to "All".'
            className="m-3 border-0 bg-transparent sm:m-4"
          />
        ) : (
          <div
            className="relative w-full min-w-0"
            style={{ height: virtualizer.getTotalSize() }}
            role="rowgroup"
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const active = selectedId === row.id;
              const code = row.code?.trim();
              return (
                <div
                  key={row.id}
                  role="row"
                  tabIndex={0}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  aria-label={`Supplier ${row.name}`}
                  aria-selected={active}
                  className={cn(
                    "absolute left-0 top-0 grid w-full min-w-0 items-center gap-x-3 border-b border-border/30 text-left",
                    cols,
                    compact
                      ? "h-[34px] px-2.5 text-xs"
                      : "h-10 px-3 text-sm sm:px-3.5",
                    "cursor-pointer transition-colors duration-75",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                    active
                      ? "bg-primary/[0.08] text-foreground"
                      : "hover:bg-muted/35",
                    vi.index % 2 === 1 && !active && "bg-muted/10",
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
                    role="cell"
                    className={cn(
                      "min-w-0 truncate font-medium tracking-tight",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {row.name}
                  </span>
                  {!compact ? (
                    <span
                      role="cell"
                      className="min-w-0 truncate font-mono text-[11px] text-muted-foreground"
                    >
                      {code || "—"}
                    </span>
                  ) : null}
                  <span
                    role="cell"
                    className={cn(
                      "shrink-0",
                      !compact && "justify-self-end",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize leading-none",
                        statusBadgeClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
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
