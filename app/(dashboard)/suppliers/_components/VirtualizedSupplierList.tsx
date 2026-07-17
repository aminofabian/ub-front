"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, Loader2, Pencil, Trash2 } from "lucide-react";

import type { SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { SupEmptyState, SupLoadingBlock } from "./supplier-layout-primitives";
import {
  statusBadgeClass,
  supDirectoryShell,
  supDirectoryToolbar,
  supTableCell,
  supTableHead,
  supTableRowActive,
} from "./supplier-ui-tokens";

const ROW_PX_DEFAULT = 32;
const ROW_PX_COMPACT = 30;

const COLS_DEFAULT =
  "grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(4.25rem,auto)]";
const COLS_DEFAULT_ACTIONS =
  "grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(4.25rem,auto)_minmax(4.5rem,auto)]";
const COLS_COMPACT = "grid-cols-[minmax(0,1fr)_minmax(3.75rem,auto)]";
const COLS_COMPACT_ACTIONS =
  "grid-cols-[minmax(0,1fr)_minmax(3.75rem,auto)_minmax(4.5rem,auto)]";

export type VirtualizedSupplierListProps = {
  rows: SupplierRecord[];
  selectedId: string | null;
  totalLoaded: number;
  totalElements: number;
  onRowClick: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (row: SupplierRecord) => void;
  canWrite?: boolean;
  deletingId?: string | null;
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
  onEdit,
  onDelete,
  canWrite = false,
  deletingId = null,
  loadingInitial,
  loadingMore,
  hasMore,
  onLoadMore,
  compact = false,
}: VirtualizedSupplierListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowPx = compact ? ROW_PX_COMPACT : ROW_PX_DEFAULT;
  const showActions = canWrite && Boolean(onEdit || onDelete);
  const cols = compact
    ? showActions
      ? COLS_COMPACT_ACTIONS
      : COLS_COMPACT
    : showActions
      ? COLS_DEFAULT_ACTIONS
      : COLS_DEFAULT;

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual list
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowPx,
    overscan: 16,
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
          compact ? "px-2 py-1" : "px-2.5 py-1",
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Directory
        </span>
        {totalElements > 0 ? (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
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
          supTableHead,
          "sticky top-0 z-10 grid items-stretch",
          cols,
        )}
        role="row"
      >
        <span className={cn(supTableCell, "flex items-center py-1")}>Name</span>
        {!compact ? (
          <span className={cn(supTableCell, "flex items-center py-1")}>Code</span>
        ) : null}
        <span className={cn(supTableCell, "flex items-center py-1")}>Status</span>
        {showActions ? (
          <span className={cn(supTableCell, "flex items-center justify-end py-1")}>
            Actions
          </span>
        ) : null}
      </div>

      <div
        ref={parentRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          compact
            ? "xl:min-h-[8rem]"
            : "max-lg:max-h-[calc(100dvh-13.5rem)] xl:min-h-[12rem]",
        )}
        tabIndex={-1}
        role="table"
        aria-label="Suppliers directory"
      >
        {loadingInitial && rows.length === 0 ? (
          <SupLoadingBlock label="Loading suppliers…" className="py-8" />
        ) : rows.length === 0 ? (
          <SupEmptyState
            icon={BookUser}
            title="No suppliers match"
            description='Try a different search, or set status to "All".'
            className="m-0 border-0 bg-transparent"
          />
        ) : (
          <div
            className="relative w-full min-w-0 border-l border-border/40"
            style={{ height: virtualizer.getTotalSize() }}
            role="rowgroup"
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const active = selectedId === row.id;
              const code = row.code?.trim();
              const isSystem = code === "SYS-UNASSIGNED";
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
                    "absolute left-0 top-0 grid w-full min-w-0 items-stretch border-b border-border/70 text-left",
                    cols,
                    compact ? "h-[30px] text-[12px]" : "h-8 text-[13px]",
                    "cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40",
                    active
                      ? supTableRowActive
                      : cn(
                          "hover:bg-[#e8f0fe] dark:hover:bg-muted/30",
                          vi.index % 2 === 1 && "bg-[#fafbfd] dark:bg-muted/[0.08]",
                        ),
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
                      supTableCell,
                      "flex min-w-0 items-center truncate font-medium",
                      active ? "text-foreground" : "text-foreground",
                    )}
                  >
                    {row.name}
                  </span>
                  {!compact ? (
                    <span
                      role="cell"
                      className={cn(
                        supTableCell,
                        "flex min-w-0 items-center truncate font-mono text-[11px] text-muted-foreground",
                      )}
                    >
                      {code || "—"}
                    </span>
                  ) : null}
                  <span
                    role="cell"
                    className={cn(supTableCell, "flex items-center")}
                  >
                    <span
                      className={cn(
                        "inline-flex px-1 py-px text-[10px] font-semibold capitalize leading-none",
                        statusBadgeClass(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </span>
                  {showActions ? (
                    <span
                      role="cell"
                      className={cn(
                        supTableCell,
                        "flex items-center justify-end gap-0.5",
                      )}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {onEdit ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-6 rounded-md text-muted-foreground hover:text-foreground"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => onEdit(row.id)}
                        >
                          <Pencil className="size-3" aria-hidden />
                        </Button>
                      ) : null}
                      {onDelete && !isSystem ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-6 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${row.name}`}
                          disabled={deletingId === row.id}
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="size-3" aria-hidden />
                        </Button>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {loadingMore ? (
          <div className="sticky bottom-0 flex items-center justify-center gap-1.5 border-t border-border bg-background/95 py-1.5 text-[11px] font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading more…
          </div>
        ) : null}
      </div>
    </div>
  );
}
