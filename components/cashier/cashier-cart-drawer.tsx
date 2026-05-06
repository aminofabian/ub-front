"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
import {
  itemListThumbnailUrl,
  type CustomerRecord,
  type ItemSummaryRecord,
  type SalePaymentMethod,
  type SaleRecord,
} from "@/lib/api";
import { cashierItemPrimaryLabel, posSearchItemDetailLine } from "@/lib/cashier-item-display";
import { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type CartLineLike = {
  key: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  item: ItemSummaryRecord;
};

function payMethodNeedsCustomer(method: SalePaymentMethod): boolean {
  return (
    method === "customer_credit" ||
    method === "customer_wallet" ||
    method === "loyalty_redeem"
  );
}

function isSaleVoided(sale: SaleRecord): boolean {
  const v = sale.voidedAt;
  return v != null && String(v).length > 0;
}

function lineSubtotal(line: CartLineLike): number {
  const q = Number(line.quantity);
  const p = Number(line.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) return 0;
  return Math.round(q * p * 100) / 100;
}

export type CashierCartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  online: boolean;
  currency: string;
  branchSelected: boolean;
  /** Business brand CSS variables (dialog is portaled). */
  brandTheme: CSSProperties;

  lines: CartLineLike[];
  grandTotal: number;
  removeLine: (key: string) => void;
  updateLine: (key: string, field: "quantity" | "unitPrice", value: string) => void;

  payMethod: SalePaymentMethod;
  setPayMethod: (m: SalePaymentMethod) => void;
  mpesaRef: string;
  setMpesaRef: (s: string) => void;
  splitPay: boolean;
  setSplitPay: (b: boolean) => void;
  cashSplitStr: string;
  setCashSplitStr: (s: string) => void;
  mpesaSplitStr: string;
  setMpesaSplitStr: (s: string) => void;
  splitMpesaRef: string;
  setSplitMpesaRef: (s: string) => void;

  canLookupCustomers: boolean;
  customerPhoneQuery: string;
  setCustomerPhoneQuery: (s: string) => void;
  customerHits: CustomerRecord[];
  customerSearchBusy: boolean;
  onSearchCustomers: () => void;
  selectedCustomer: CustomerRecord | null;
  setSelectedCustomer: (c: CustomerRecord | null) => void;

  onComplete: () => void;
  loading: boolean;

  outboxCount: number;
  outboxBusy: boolean;
  onRetryOutbox: () => void;

  error: string;
  notice: string;

  canVoid: boolean;
  lastSale: SaleRecord | null;
  lastSaleCustomerName: string | null;
  voidNotes: string;
  setVoidNotes: (s: string) => void;
  onVoidLastSale: () => void;
  voidLoading: boolean;
  onDownloadReceiptPdf: () => void;
  receiptLoading: boolean;
};

function PayChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-transparent shadow-sm text-[var(--pos-primary-ink)]"
          : "border-border bg-background hover:bg-muted",
      )}
      style={
        active
          ? { backgroundColor: "var(--pos-primary)", borderColor: "transparent" }
          : undefined
      }
    >
      {children}
    </button>
  );
}

export function CashierCartDrawer(props: CashierCartDrawerProps) {
  const {
    open,
    onOpenChange,
    online,
    currency,
    branchSelected,
    brandTheme,
    lines,
    grandTotal,
    removeLine,
    updateLine,
    payMethod,
    setPayMethod,
    mpesaRef,
    setMpesaRef,
    splitPay,
    setSplitPay,
    cashSplitStr,
    setCashSplitStr,
    mpesaSplitStr,
    setMpesaSplitStr,
    splitMpesaRef,
    setSplitMpesaRef,
    canLookupCustomers,
    customerPhoneQuery,
    setCustomerPhoneQuery,
    customerHits,
    customerSearchBusy,
    onSearchCustomers,
    selectedCustomer,
    setSelectedCustomer,
    onComplete,
    loading,
    outboxCount,
    outboxBusy,
    onRetryOutbox,
    error,
    notice,
    canVoid,
    lastSale,
    lastSaleCustomerName,
    voidNotes,
    setVoidNotes,
    onVoidLastSale,
    voidLoading,
    onDownloadReceiptPdf,
    receiptLoading,
  } = props;

  const totalItems = lines.reduce((acc, l) => {
    const q = Number(l.quantity);
    return acc + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  const customerNeeded = !splitPay && payMethodNeedsCustomer(payMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        className="flex h-full w-full max-w-md flex-col gap-0 p-0"
        style={brandTheme}
        showCloseButton
      >
        <div
          className="flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--pos-primary)_14%,var(--border))] px-5 py-4"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--pos-glow) 28%, var(--card)), var(--card))",
          }}
        >
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-base text-[var(--pos-primary)]">Cart</DialogTitle>
            <DialogDescription className="text-xs">
              {lines.length === 0
                ? "No items yet — tap a tile or search to add."
                : `${lines.length} line${lines.length === 1 ? "" : "s"} · ${totalItems.toFixed(0)} item${totalItems === 1 ? "" : "s"}`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted/50 text-2xl">
                ·
              </span>
              <p>Your cart is empty.</p>
              <p className="text-xs">Search or tap a top seller to add items.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => {
                const thumb = itemListThumbnailUrl(line.item);
                const subtotal = lineSubtotal(line);
                const qNum = Number(line.quantity) || 0;
                const lineTitle = cashierItemPrimaryLabel(line.item);
                const lineDetail = posSearchItemDetailLine(line.item);
                return (
                  <li
                    key={line.key}
                    className="rounded-2xl border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {thumb ? (
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          <Image
                            src={thumb}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </span>
                      ) : (
                        <span
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-base font-semibold text-muted-foreground"
                          aria-hidden
                        >
                          {lineTitle.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-tight">
                          {lineTitle}
                        </p>
                        <p className="break-all text-[11px] uppercase tracking-wide text-muted-foreground">
                          {lineDetail}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove line"
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-2 text-sm">
                      <span className="text-xs text-muted-foreground">Qty</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Decrease"
                          onClick={() =>
                            updateLine(
                              line.key,
                              "quantity",
                              String(Math.max(1, qNum - 1)),
                            )
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Quantity"
                          className="h-8 w-16 rounded-md border bg-background text-center tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, "quantity", e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Increase"
                          onClick={() =>
                            updateLine(line.key, "quantity", String(qNum + 1))
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground">Unit ({currency})</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Unit price"
                        placeholder="0.00"
                        className="h-8 w-full max-w-[8rem] rounded-md border bg-background px-2 text-right tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(line.key, "unitPrice", e.target.value)
                        }
                      />
                    </div>
                    {subtotal > 0 ? (
                      <p className="mt-2 text-right text-xs font-medium tabular-nums text-muted-foreground">
                        Subtotal {subtotal.toFixed(2)} {currency}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment
              </h4>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={splitPay}
                  disabled={payMethodNeedsCustomer(payMethod)}
                  onChange={(e) => {
                    const next = e.target.checked;
                    if (next && payMethodNeedsCustomer(payMethod)) {
                      setPayMethod("cash");
                    }
                    setSplitPay(next);
                  }}
                />
                Split cash + M-Pesa
              </label>
            </div>

            {!splitPay ? (
              <div className="flex flex-wrap gap-1.5">
                <PayChip
                  active={payMethod === "cash"}
                  onClick={() => setPayMethod("cash")}
                >
                  Cash
                </PayChip>
                <PayChip
                  active={payMethod === "mpesa_manual"}
                  onClick={() => setPayMethod("mpesa_manual")}
                >
                  M-Pesa
                </PayChip>
                {canLookupCustomers ? (
                  <PayChip
                    active={payMethod === "customer_credit"}
                    onClick={() => {
                      setSplitPay(false);
                      setPayMethod("customer_credit");
                    }}
                  >
                    Customer tab
                  </PayChip>
                ) : null}
                {canLookupCustomers ? (
                  <PayChip
                    active={payMethod === "customer_wallet"}
                    disabled={!online}
                    onClick={() => {
                      setSplitPay(false);
                      setPayMethod("customer_wallet");
                    }}
                  >
                    Wallet
                  </PayChip>
                ) : null}
                {canLookupCustomers ? (
                  <PayChip
                    active={payMethod === "loyalty_redeem"}
                    disabled={!online}
                    onClick={() => {
                      setSplitPay(false);
                      setPayMethod("loyalty_redeem");
                    }}
                  >
                    Loyalty
                  </PayChip>
                ) : null}
              </div>
            ) : null}

            {!splitPay && payMethod === "mpesa_manual" ? (
              <input
                className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                value={mpesaRef}
                onChange={(e) => setMpesaRef(e.target.value)}
                placeholder="M-Pesa reference (e.g. QPH12ABC)"
              />
            ) : null}

            {splitPay ? (
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Cash ({currency})
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="h-9 w-full rounded-md border bg-background px-2 text-right tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={cashSplitStr}
                      onChange={(e) => setCashSplitStr(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      M-Pesa ({currency})
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="h-9 w-full rounded-md border bg-background px-2 text-right tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={mpesaSplitStr}
                      onChange={(e) => setMpesaSplitStr(e.target.value)}
                    />
                  </label>
                </div>
                <input
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={splitMpesaRef}
                  onChange={(e) => setSplitMpesaRef(e.target.value)}
                  placeholder="M-Pesa reference"
                />
              </div>
            ) : null}

            {customerNeeded && canLookupCustomers ? (
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {payMethod === "customer_credit"
                    ? "Search by phone, then select the customer. The full cart total posts to their tab."
                    : payMethod === "customer_wallet"
                      ? `Cart total is paid from the customer's store wallet (${currency}).`
                      : "Apply loyalty redemption (server enforces caps & point cost)."}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={customerPhoneQuery}
                    onChange={(e) => setCustomerPhoneQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSearchCustomers();
                      }
                    }}
                    placeholder="Phone (2547…)"
                    disabled={!online}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!online || customerSearchBusy}
                    onClick={onSearchCustomers}
                  >
                    {customerSearchBusy ? "…" : "Find"}
                  </Button>
                </div>
                {customerHits.length > 0 ? (
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {customerHits.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-md border px-2 py-1.5 text-left text-xs",
                            selectedCustomer?.id === c.id
                              ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]"
                              : "border-transparent bg-background hover:bg-muted/40",
                          )}
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="block text-muted-foreground">
                            {c.phones.find((p) => p.primary)?.phone ??
                              c.phones[0]?.phone ??
                              "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedCustomer ? (
                  <div className="rounded-md bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)] p-2 text-xs">
                    <p>
                      Selected: <span className="font-medium">{selectedCustomer.name}</span>
                    </p>
                    <p className="tabular-nums text-muted-foreground">
                      Wallet {Number(selectedCustomer.credit.walletBalance).toFixed(2)}{" "}
                      {currency} · {selectedCustomer.credit.loyaltyPoints} pts
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {outboxCount > 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {outboxCount} sale(s) waiting to sync.{" "}
              <button
                type="button"
                className="font-medium underline-offset-2 hover:underline disabled:opacity-50"
                disabled={outboxBusy || !online}
                onClick={onRetryOutbox}
              >
                {outboxBusy ? "Syncing…" : "Retry now"}
              </button>
            </p>
          ) : null}

          {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
          {error ? <DashboardFeedback kind="error" text={error} /> : null}

          {lastSale ? (
            <section className="space-y-2 rounded-xl border border-dashed bg-muted/10 p-3 text-xs">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Last sale
              </h4>
              <dl className="grid gap-1">
                <div>
                  <dt className="inline text-muted-foreground">Sale</dt>{" "}
                  <dd className="inline font-mono">{lastSale.id}</dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">Total</dt>{" "}
                  <dd className="inline tabular-nums">
                    {Number(lastSale.grandTotal).toFixed(2)} {currency}
                  </dd>
                </div>
                {lastSale.customerId ? (
                  <div>
                    <dt className="inline text-muted-foreground">Customer</dt>{" "}
                    <dd className="inline">
                      {lastSaleCustomerName ? (
                        <>
                          <span className="font-medium">{lastSaleCustomerName}</span>{" "}
                          <span className="font-mono text-muted-foreground">
                            ({lastSale.customerId})
                          </span>
                        </>
                      ) : (
                        <span className="font-mono">{lastSale.customerId}</span>
                      )}
                    </dd>
                  </div>
                ) : null}
                {isSaleVoided(lastSale) ? (
                  <div>
                    <dt className="inline text-muted-foreground">Voided</dt>{" "}
                    <dd className="inline">{String(lastSale.voidedAt)}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={receiptLoading}
                  onClick={onDownloadReceiptPdf}
                >
                  {receiptLoading ? "…" : "Receipt PDF"}
                </Button>
                {canVoid && !isSaleVoided(lastSale) ? (
                  <>
                    <input
                      className="h-8 flex-1 min-w-[7rem] rounded-md border bg-background px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      value={voidNotes}
                      onChange={(e) => setVoidNotes(e.target.value)}
                      placeholder="Void notes (optional)"
                      disabled={voidLoading}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={voidLoading}
                      onClick={onVoidLastSale}
                    >
                      {voidLoading ? "…" : "Void sale"}
                    </Button>
                  </>
                ) : null}
              </div>
              {!canVoid && !isSaleVoided(lastSale) ? (
                <p className="text-[10px] text-muted-foreground">
                  Need <code>{Permission.SalesVoidOwn}</code> or{" "}
                  <code>{Permission.SalesVoidAny}</code> to void.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="border-t border-[color-mix(in_srgb,var(--pos-primary)_12%,var(--border))] bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-[var(--pos-primary)]">
              Total
            </span>
            <span className="text-2xl font-bold tabular-nums text-[var(--pos-primary)]">
              {grandTotal.toFixed(2)}{" "}
              <span className="text-sm font-medium text-muted-foreground">{currency}</span>
            </span>
          </div>
          {!branchSelected ? (
            <p className="mb-2 text-xs text-amber-800">
              Pick a branch in the top nav to enable checkout.
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] shadow-md hover:bg-[var(--pos-primary)] hover:opacity-90"
            disabled={loading || lines.length === 0 || !branchSelected}
            onClick={onComplete}
          >
            {loading ? "Recording…" : "Complete sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
