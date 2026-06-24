"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  ScanLine,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Receipt,
  Banknote,
  Smartphone,
  Split,
  X,
  AlertTriangle,
  Clock,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import {
  lookupGroceryInvoiceByBarcode,
  payGroceryInvoice,
  GroceryApiError,
  type GroceryInvoiceResponse,
  type PayGroceryInvoiceResponse,
} from "@/lib/grocery-api";

type CashierInvoicePaymentProps = {
  variant: "embedded" | "standalone";
  currency?: string;
};

type PaymentMethod = "cash" | "mpesa_manual" | "split";

type AppState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "loading"; barcode: string }
  | { phase: "loaded"; invoice: GroceryInvoiceResponse }
  | { phase: "processing"; invoice: GroceryInvoiceResponse }
  | { phase: "success"; result: PayGroceryInvoiceResponse }
  | { phase: "error"; message: string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function CashierInvoicePayment({
  variant,
  currency = "KES",
}: CashierInvoicePaymentProps) {
  const online = useOnlineStatus();
  const [state, setState] = useState<AppState>({ phase: "idle" });
  const [manualCode, setManualCode] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [mpesaRef, setMpesaRef] = useState("");
  const [cashSplit, setCashSplit] = useState("");
  const [mpesaSplit, setMpesaSplit] = useState("");
  const [splitMpesaRef, setSplitMpesaRef] = useState("");

  const reset = useCallback(() => {
    setState({ phase: "idle" });
    setManualCode("");
    setPayMethod("cash");
    setCashTendered("");
    setMpesaRef("");
    setCashSplit("");
    setMpesaSplit("");
    setSplitMpesaRef("");
  }, []);

  const onScan = useCallback(
    async (barcode: string) => {
      setState({ phase: "loading", barcode });
      try {
        const invoice = await lookupGroceryInvoiceByBarcode(barcode);
        if (invoice.status !== "pending_payment") {
          const labels: Record<string, string> = {
            paid: "already been paid",
            cancelled: "been cancelled",
            expired: "expired",
          };
          throw new Error(
            `This invoice has ${labels[invoice.status] ?? invoice.status}.`,
          );
        }
        setState({ phase: "loaded", invoice });
      } catch (e) {
        const msg =
          e instanceof GroceryApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to retrieve invoice";
        setState({ phase: "error", message: msg });
      }
    },
    [],
  );

  const onManualLookup = useCallback(async () => {
    const code = manualCode.trim();
    if (!code) return;
    await onScan(code);
  }, [manualCode, onScan]);

  const onPay = useCallback(async () => {
    if (state.phase !== "loaded") return;
    const invoice = state.invoice;
    const total = invoice.grandTotal;

    let payments: Array<{ method: string; amount: number; reference?: string }>;

    if (payMethod === "split") {
      const c = parseFloat(cashSplit);
      const m = parseFloat(mpesaSplit);
      if (isNaN(c) || isNaN(m) || c <= 0 || m <= 0) {
        toast.error("Enter valid cash and M-Pesa amounts for split payment.");
        return;
      }
      if (Math.abs(round2(c + m) - total) > 0.01) {
        toast.error("Split amounts must equal the invoice total.");
        return;
      }
      payments = [
        { method: "cash", amount: round2(c) },
        {
          method: "mpesa_manual",
          amount: round2(m),
          reference: splitMpesaRef.trim() || undefined,
        },
      ];
    } else if (payMethod === "cash") {
      const tender = parseFloat(cashTendered);
      if (isNaN(tender) || tender < total) {
        toast.error(
          `Amount received must be at least ${currency} ${total.toFixed(2)}.`,
        );
        return;
      }
      payments = [{ method: "cash", amount: total }];
    } else {
      payments = [
        {
          method: "mpesa_manual",
          amount: total,
          reference: mpesaRef.trim() || undefined,
        },
      ];
    }

    setState({ phase: "processing", invoice });

    try {
      const idem = nextIdempotencyKey();
      const result = await payGroceryInvoice(invoice.id, { payments }, idem);
      setState({ phase: "success", result });
      toast.success("Payment successful!", {
        description: `Invoice ${invoice.barcodeCode} paid — ${currency} ${total.toFixed(2)}`,
        duration: 8_000,
      });
    } catch (e) {
      const msg =
        e instanceof GroceryApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Payment failed";
      setState({ phase: "error", message: msg });
      toast.error(msg);
    }
  }, [
    state,
    payMethod,
    cashTendered,
    mpesaRef,
    cashSplit,
    mpesaSplit,
    splitMpesaRef,
    currency,
  ]);

  const isStandalone = variant === "standalone";

  return (
    <div className={cn(isStandalone && "mx-auto max-w-2xl px-4 py-6")}>
      {/* ── IDLE ── */}
      {(state.phase === "idle" || state.phase === "scanning") && (
        <div
          className={cn(
            "flex flex-col items-center gap-6 rounded-2xl border border-border/50 bg-card p-8 shadow-sm",
            isStandalone && "py-16",
          )}
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <ScanLine className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Pay Grocery Invoice
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan the invoice barcode or enter the code manually
            </p>
          </div>

          {!online && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="size-4" />
              Offline — payment requires network
            </div>
          )}

          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 pl-3 pr-1 shadow-sm">
              <Search className="size-4 shrink-0 text-muted-foreground/70" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onManualLookup()}
                placeholder="Enter barcode code…"
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                autoComplete="off"
              />
              {manualCode && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setManualCode("")}
                  aria-label="Clear"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <Button
              onClick={onManualLookup}
              disabled={!manualCode.trim() || !online}
              className="h-11 text-sm font-semibold"
            >
              Look Up Invoice
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-border/30" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border/30" />
            </div>
            <Button
              variant="outline"
              onClick={() => setState({ phase: "scanning" })}
              disabled={!online}
              className="h-11 text-sm font-semibold gap-2"
            >
              <ScanLine className="size-4" />
              Scan Barcode with Camera
            </Button>
          </div>
        </div>
      )}

      {/* ── SCANNING ── */}
      {state.phase === "scanning" && (
        <BarcodeScanner
          onScan={(barcode) => {
            setManualCode(barcode);
            onScan(barcode);
          }}
          onClose={() => setState({ phase: "idle" })}
        />
      )}

      {/* ── LOADING ── */}
      {state.phase === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Retrieving invoice…
          </p>
        </div>
      )}

      {/* ── LOADED / PROCESSING ── */}
      {(state.phase === "loaded" || state.phase === "processing") && (
        <div className="space-y-4">
          {/* Invoice details */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Invoice Payment
                </h2>
                <p className="mt-0.5 font-mono text-sm tracking-wider text-muted-foreground">
                  {state.invoice.barcodeCode}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <Clock className="size-3" />
                Pending
              </span>
            </div>

            {/* Lines */}
            <ul className="divide-y divide-border/30">
              {state.invoice.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {line.itemName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} × {currency} {line.unitPrice.toFixed(2)}
                      {line.unitName ? ` / ${line.unitName}` : ""}
                    </p>
                  </div>
                  <span className="ml-4 font-semibold tabular-nums text-foreground">
                    {currency} {line.lineTotal.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Total */}
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
              <span className="text-base font-semibold text-foreground">
                Total
              </span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {currency} {state.invoice.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment options */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
              Payment Method
            </h3>
            <div className="flex gap-2">
              {(
                [
                  ["cash", "Cash", Banknote],
                  ["mpesa_manual", "M-Pesa", Smartphone],
                  ["split", "Split", Split],
                ] as const
              ).map(([method, label, Icon]) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayMethod(method)}
                  disabled={state.phase === "processing"}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                    payMethod === method
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                      : "border-border/50 bg-background text-muted-foreground hover:border-border hover:bg-muted/50",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Payment inputs */}
            <div className="mt-4 space-y-3">
              {payMethod === "cash" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Amount Received
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="0.00"
                      className="h-11 flex-1 bg-transparent text-right text-base font-bold outline-none tabular-nums"
                      disabled={state.phase === "processing"}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {cashTendered &&
                    parseFloat(cashTendered) >= state.invoice.grandTotal && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        Change: {currency}{" "}
                        {(
                          parseFloat(cashTendered) - state.invoice.grandTotal
                        ).toFixed(2)}
                      </p>
                    )}
                </div>
              )}

              {payMethod === "mpesa_manual" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    M-Pesa Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={mpesaRef}
                    onChange={(e) => setMpesaRef(e.target.value)}
                    placeholder="e.g. QWERTY1234"
                    className="h-11 w-full rounded-lg border border-border/60 bg-background px-3 text-sm outline-none focus:border-primary"
                    disabled={state.phase === "processing"}
                  />
                </div>
              )}

              {payMethod === "split" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Cash Portion
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={cashSplit}
                        onChange={(e) => setCashSplit(e.target.value)}
                        placeholder="0.00"
                        className="h-11 flex-1 bg-transparent text-right text-base font-bold outline-none tabular-nums"
                        disabled={state.phase === "processing"}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      M-Pesa Portion
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {currency}
                      </span>
                      <input
                        type="number"
                        value={mpesaSplit}
                        onChange={(e) => setMpesaSplit(e.target.value)}
                        placeholder="0.00"
                        className="h-11 flex-1 bg-transparent text-right text-base font-bold outline-none tabular-nums"
                        disabled={state.phase === "processing"}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <input
                      type="text"
                      value={splitMpesaRef}
                      onChange={(e) => setSplitMpesaRef(e.target.value)}
                      placeholder="M-Pesa reference (optional)"
                      className="mt-2 h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-sm outline-none focus:border-primary"
                      disabled={state.phase === "processing"}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Process button */}
            <Button
              onClick={onPay}
              disabled={state.phase === "processing" || !online}
              className="mt-5 h-12 w-full text-sm font-bold gap-2"
              size="lg"
            >
              {state.phase === "processing" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing Payment…
                </>
              ) : (
                <>
                  <ShoppingCart className="size-4" />
                  Process Payment — {currency}{" "}
                  {state.invoice.grandTotal.toFixed(2)}
                </>
              )}
            </Button>
          </div>

          {/* Cancel */}
          <Button
            variant="ghost"
            onClick={reset}
            disabled={state.phase === "processing"}
            className="w-full text-xs text-muted-foreground"
          >
            Cancel and scan another invoice
          </Button>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {state.phase === "success" && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="size-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Payment Successful!
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sale #{state.result.saleId} recorded
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {currency}{" "}
              {(() => {
                const receipt = state.result.receipt as
                  | { grandTotal?: number }
                  | undefined;
                return receipt?.grandTotal?.toFixed(2) ?? "—";
              })()}
            </p>
          </div>
          <div className="flex w-full max-w-xs gap-3">
            <Button
              variant="outline"
              onClick={reset}
              className="flex-1 h-11 text-sm font-semibold"
            >
              Scan Another
            </Button>
            <Button
              onClick={reset}
              className="flex-1 h-11 text-sm font-semibold gap-2"
            >
              <Receipt className="size-4" />
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {state.phase === "error" && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
            <XCircle className="size-9 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Payment Failed
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.message}
            </p>
          </div>
          <div className="flex w-full max-w-xs gap-3">
            <Button
              variant="outline"
              onClick={reset}
              className="flex-1 h-11 text-sm font-semibold"
            >
              Try Another Invoice
            </Button>
            <Button
              onClick={() => {
                // Retry with the last known barcode (stored in manualCode)
                if (manualCode.trim()) {
                  onScan(manualCode.trim());
                } else {
                  reset();
                }
              }}
              className="flex-1 h-11 text-sm font-semibold"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
