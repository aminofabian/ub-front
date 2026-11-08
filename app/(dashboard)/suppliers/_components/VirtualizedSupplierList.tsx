"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BookUser, Loader2, Pencil, Trash2 } from "lucide-react";

import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import type { SupplierRecord } from "@/lib/api";
import {
  displaySupplierName,
  isSystemUnassignedSupplier,
} from "@/lib/supplier-display";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { SupEmptyState, SupLoadingBlock } from "./supplier-layout-primitives";
import {
  HAIRLINE,
  statusDotClass,
  supDirectoryShell,
  supDirectoryToolbar,
} from "./supplier-ui-tokens";

const ROW_PX_DEFAULT = 44;
const ROW_PX_COMPACT = 36;

/** Wallet credit worth surfacing on the row, or 0. */
function creditOf(row: SupplierRecord): number {
  const v = row.prepaymentBalance;
  const x = typeof v === "number" ? v : v != null ? Number(v) : 0;
  return Number.isFinite(x) && x > 0.009 ? x : 0;
}

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
  currency?: string;
};

/**
 * The directory: one calm row per supplier. Status is a dot (and a word only
 * when it is not "active"), wallet credit shows when there is some, and the
 * edit/delete shortcuts appear on hover on pointer devices — on touch, the
 * same actions live on the supplier's profile.
 */
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
  currency = "KES",
}: VirtualizedSupplierListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowPx = compact ? ROW_PX_COMPACT : ROW_PX_DEFAULT;
  const showActions = canWrite && Boolean(onEdit || onDelete);

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
        <span className="text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground">
          Directory
        </span>
        {totalElements > 0 ? (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">
              {totalLoaded}
            </span>
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
        ref={parentRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          compact
            ? "xl:min-h-[8rem]"
            : "max-lg:max-h-[calc(100dvh-13.5rem)] xl:min-h-[12rem]",
        )}
        tabIndex={-1}
        role="listbox"
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
            className="relative w-full min-w-0"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const active = selectedId === row.id;
              const code = row.code?.trim();
              const isSystem = isSystemUnassignedSupplier({
                code: row.code,
                name: row.name,
              });
              const displayName = displaySupplierName({
                name: row.name,
                code: row.code,
              });
              const credit = creditOf(row);
              return (
                <div
                  key={row.id}
                  role="option"
                  tabIndex={0}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  aria-label={`Supplier ${displayName}`}
                  aria-selected={active}
                  className={cn(
                    "group absolute left-0 top-0 flex w-full min-w-0 cursor-pointer items-center gap-2 border-b pl-2.5 pr-2 text-left",
                    HAIRLINE,
                    compact
                      ? "h-9 text-[13px]"
                      : "h-11 text-[13px] max-sm:h-12 max-sm:text-[14px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)]",
                    active
                      ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)] shadow-[inset_2px_0_0_0_var(--pos-primary,#0f766e)]"
                      : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
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
                    aria-hidden
                    title={row.status}
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      statusDotClass(row.status),
                    )}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate font-medium",
                      active
                        ? "text-[var(--pos-primary,#0f766e)]"
                        : "text-foreground",
                    )}
                  >
                    <SupplierDisplayName
                      name={row.name}
                      code={row.code}
                      className="truncate"
                    />
                  </span>
                  {row.status !== "active" ? (
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-semibold capitalize",
                        row.status === "blocked"
                          ? "text-[#9a2e16]"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.status}
                    </span>
                  ) : null}
                  {credit > 0 ? (
                    <span
                      title="Wallet credit"
                      className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_35%,transparent)] px-1.5 py-px text-[10px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]"
                    >
                      {currency}{" "}
                      {credit.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  ) : null}
                  {!isSystem && code ? (
                    <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground max-sm:hidden">
                      {code}
                    </span>
                  ) : null}
                  {showActions ? (
                    <span
                      className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 pointer-fine:flex"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {onEdit ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-6 rounded-xl text-muted-foreground hover:text-foreground"
                          aria-label={`Edit ${displayName}`}
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
                          className="size-6 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${displayName}`}
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
