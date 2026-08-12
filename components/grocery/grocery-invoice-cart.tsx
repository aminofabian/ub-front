"use client";

import {
  ShoppingBasket,
  Trash2,
  Receipt,
  X,
  WifiOff,
} from "lucide-react";
import {
  CashierQtyControl,
  formatCartQtyLabel,
  formatCartQtyValue,
} from "@/components/cashier/cashier-qty-control";
import { CashierWeighedToggle } from "@/components/cashier/cashier-weighed-toggle";
import { cn } from "@/lib/utils";
import { formatShelfPriceLabel } from "@/lib/cashier-shelf-price";

export type GroceryCartLine = {
  key: string;
  /** Server grocery_draft_lines.id after sync. */
  serverLineId?: string;
  itemId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  unitName: string;
  /** When true, fractional qty (½ watermelon, etc.) is allowed — matches sale API. */
  isWeighed?: boolean;
  /** Reference cost for spoils write-off (from catalog buyingPrice). */
  unitCost?: number;
};

type GroceryInvoiceCartProps = {
  lines: GroceryCartLine[];
  onUpdateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) => void;
  onRemoveLine: (key: string) => void;
  /** Optional: mark / clear sell-by-weight (same as cashier). */
  onToggleWeighed?: (key: string) => void;
  allowWeighedToggle?: boolean;
  weighedToggleBusyItemId?: string | null;
  onGenerate: () => void;
  onClearCart?: () => void;
  loading: boolean;
  subtotal: number;
  grandTotal: number;
  currency: string;
  branchName?: string;
  cashierName?: string;
  /** Counter # from persisted draft (shown when ui flag on). */
  counterNumber?: number | null;
  syncStatus?: "idle" | "syncing" | "error" | "conflict";
  online?: boolean;
  /** Bump this number to trigger the cart "added" pulse animation. */
  pulseSignal?: number;
  /** Most recently added line key — used for entry animation. */
  recentlyAddedKey?: string | null;
  /** Renders without the side panel chrome (used inside bottom sheet). */
  compact?: boolean;
  /** Optional close handler shown in compact (bottom sheet) variant. */
  onClose?: () => void;
  /** Counter mode — changes title / CTA copy. Default sell. */
  mode?: "sell" | "spoils";
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function SyncChip({
  online,
  syncStatus,
}: {
  online?: boolean;
  syncStatus?: GroceryInvoiceCartProps["syncStatus"];
}) {
  if (online === false) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <WifiOff className="size-2.5" aria-hidden />
        Offline
      </span>
    );
  }
  if (syncStatus === "syncing") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--pos-primary,#0f766e)]">
        <span
          className="size-1.5 animate-spin rounded-full border border-[var(--pos-primary,#0f766e)]/30 border-t-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
        Syncing
      </span>
    );
  }
  if (syncStatus === "error") {
    return (
      <span className="text-[10px] font-medium text-destructive">Sync error</span>
    );
  }
  if (syncStatus === "conflict") {
    return (
      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
        Conflict
      </span>
    );
  }
  return null;
}

// ── Cart Line Item ─────────────────────────────────────────────────

function CartLineItem({
  line,
  currency,
  onUpdateLine,
  onRemoveLine,
  onToggleWeighed,
  allowWeighedToggle,
  weighedToggleBusy,
  isRecentlyAdded,
}: {
  line: GroceryCartLine;
  currency: string;
  onUpdateLine: (
    key: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) => void;
  onRemoveLine: (key: string) => void;
  onToggleWeighed?: (key: string) => void;
  allowWeighedToggle?: boolean;
  weighedToggleBusy?: boolean;
  isRecentlyAdded?: boolean;
}) {
  const weighed = line.isWeighed === true;
  const lineTotal = round2(line.quantity * line.unitPrice);
  const priceLabel = formatShelfPriceLabel(line.unitPrice, currency);
  const totalLabel = formatShelfPriceLabel(lineTotal, currency);
  const qtyLabel = formatCartQtyLabel(line.quantity);

  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-2.5 py-1.5 touch-manipulation select-none dark:border-border/40",
        isRecentlyAdded &&
          "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,transparent)]",
      )}
    >
      {/* Name + meta */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <p
            className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-tight text-foreground"
            title={line.label}
          >
            {line.label}
          </p>
          {allowWeighedToggle && onToggleWeighed ? (
            <CashierWeighedToggle
              weighed={weighed}
              busy={weighedToggleBusy}
              itemLabel={line.label}
              onToggle={() => onToggleWeighed(line.key)}
              className="size-5"
            />
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[10px] tabular-nums leading-none text-muted-foreground">
          {priceLabel ?? `${currency} ${line.unitPrice.toFixed(2)}`}
          <span className="mx-0.5 opacity-50">×</span>
          {qtyLabel}
          {weighed ? " kg" : null}
          {line.unitName && !weighed ? (
            <span className="opacity-70"> · {line.unitName}</span>
          ) : null}
        </p>
      </div>

      {/* Line total */}
      <span className="justify-self-end text-[12px] font-bold tabular-nums leading-none text-foreground">
        {totalLabel ?? `${currency} ${lineTotal.toFixed(2)}`}
      </span>

      {/* Qty + remove — second row, full width under name/total */}
      <div className="col-span-2 flex items-center justify-between gap-2">
        <CashierQtyControl
          quantity={
            weighed
              ? formatCartQtyValue(line.quantity)
              : String(Math.max(1, Math.round(line.quantity)))
          }
          itemLabel={line.label}
          size="sm"
          allowFractions={weighed}
          unitPrice={line.unitPrice}
          currency={currency}
          onChange={(next) => {
            const n = Number(next);
            if (!Number.isFinite(n) || n <= 0) return;
            onUpdateLine(
              line.key,
              "quantity",
              weighed
                ? Number(formatCartQtyValue(n))
                : Math.max(1, Math.round(n)),
            );
          }}
          onRemove={() => onRemoveLine(line.key)}
        />
        <button
          type="button"
          onClick={() => onRemoveLine(line.key)}
          className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
          aria-label={`Remove ${line.label}`}
        >
          <Trash2 className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </li>
  );
}

// ── Main Cart Component ────────────────────────────────────────────

export function GroceryInvoiceCart({
  lines,
  onUpdateLine,
  onRemoveLine,
  onToggleWeighed,
  allowWeighedToggle = false,
  weighedToggleBusyItemId = null,
  onGenerate,
  onClearCart,
  loading,
  subtotal,
  grandTotal,
  currency,
  branchName,
  cashierName,
  counterNumber,
  online,
  syncStatus,
  recentlyAddedKey,
  compact,
  onClose,
  mode = "sell",
}: GroceryInvoiceCartProps) {
  const isEmpty = lines.length === 0;
  const cartItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const lineCount = lines.length;
  const hasDiscount = Math.abs(subtotal - grandTotal) > 0.009;
  const isSpoils = mode === "spoils";
  const title = isSpoils
    ? "Spoils"
    : counterNumber != null && counterNumber > 0
      ? `Counter #${counterNumber}`
      : "Current Sale";
  const ctaLabel = isSpoils ? "Record spoils" : "Generate Invoice";
  const footerHint = isSpoils
    ? "Writes off stock as spoilage"
    : "Pays at cashier";

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* ── Header ── */}
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2.5 dark:border-border/40",
          compact ? "py-1.5" : "py-2",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <h2 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {!isEmpty ? (
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {lineCount} line{lineCount === 1 ? "" : "s"}
                {Math.abs(cartItemCount - lineCount) > 0.001
                  ? ` · ${formatCartQtyLabel(cartItemCount)} qty`
                  : null}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <p className="min-w-0 truncate text-[10px] leading-none text-muted-foreground">
              {branchName || "No branch"}
              {cashierName ? ` · ${cashierName}` : null}
            </p>
            <SyncChip online={online} syncStatus={syncStatus} />
          </div>
        </div>

        {!isEmpty && onClearCart ? (
          <button
            type="button"
            onClick={onClearCart}
            className="shrink-0 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Clear cart"
          >
            Clear
          </button>
        ) : null}

        {compact && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="size-3.5" strokeWidth={2.25} />
          </button>
        ) : null}
      </header>

      {/* ── Lines ── */}
      <div className="grocery-scroll-thick min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-1.5 px-5 py-10 text-center">
            <ShoppingBasket
              className="size-7 text-muted-foreground/35"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-[12px] font-medium text-foreground">Empty</p>
            <p className="max-w-[14rem] text-[10px] leading-snug text-muted-foreground">
              Tap a product or scan a barcode.
            </p>
          </div>
        ) : (
          <ul className="list-none p-0">
            {lines.map((line) => (
              <CartLineItem
                key={line.key}
                line={line}
                currency={currency}
                onUpdateLine={onUpdateLine}
                onRemoveLine={onRemoveLine}
                onToggleWeighed={onToggleWeighed}
                allowWeighedToggle={allowWeighedToggle}
                weighedToggleBusy={weighedToggleBusyItemId === line.itemId}
                isRecentlyAdded={recentlyAddedKey === line.key}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Footer ── */}
      {!isEmpty ? (
        <footer className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] px-2.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] dark:border-border/40 dark:bg-background">
          {hasDiscount ? (
            <div className="mb-1.5 space-y-0.5 text-[10px] tabular-nums">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>
                  {formatShelfPriceLabel(subtotal, currency) ??
                    `${currency} ${subtotal.toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-destructive">
                <span>Discount</span>
                <span>
                  −
                  {formatShelfPriceLabel(subtotal - grandTotal, currency) ??
                    `${currency} ${(subtotal - grandTotal).toFixed(2)}`}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {isSpoils ? "Write-off qty" : "Total"}
            </span>
            <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
              {isSpoils
                ? formatCartQtyLabel(cartItemCount)
                : (formatShelfPriceLabel(grandTotal, currency) ??
                  `${currency} ${grandTotal.toFixed(2)}`)}
            </span>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading || isEmpty}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-none px-3 py-2.5 text-[12px] font-semibold",
              isSpoils
                ? "bg-amber-800 text-amber-50 shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] hover:bg-amber-900"
                : "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)]",
              "transition-colors active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/40 focus-visible:ring-offset-1",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {loading ? (
              <>
                <span
                  className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                Processing…
              </>
            ) : (
              <>
                {isSpoils ? (
                  <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
                ) : (
                  <Receipt className="size-3.5" strokeWidth={2.25} aria-hidden />
                )}
                {ctaLabel}
                <span className="rounded-none bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none">
                  {formatCartQtyLabel(cartItemCount)}
                </span>
              </>
            )}
          </button>

          <p className="mt-1.5 text-center text-[9px] leading-none text-muted-foreground">
            {footerHint}
          </p>
        </footer>
      ) : null}
    </div>
  );
}
