"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Loader2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierById,
  fetchSupplyDisbursementStatus,
  fetchSupplyPayOptions,
  fetchSupplyPaymentHistory,
  postSupplierPayment,
  postSupplyKopokopoPay,
  type PathBSupplyListRowRecord,
  type SupplierRecord,
  type SupplyKopokopoPayRecord,
  type SupplyPayOptionsRecord,
  type SupplyPaymentHistoryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function defaultLocalDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoInstant(localDateTime: string): string {
  const d = new Date(localDateTime);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid paid-at date/time");
  }
  return d.toISOString();
}

function n(v: number | string | null | undefined): number {
  if (v == null || v === "") {
    return 0;
  }
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatMoney(v: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolvePaymentMethod(preferred: string | null | undefined): string {
  const p = (preferred ?? "").trim().toLowerCase();
  if (p === "cash" || p === "bank" || p === "mpesa") {
    return p;
  }
  if (p.includes("mpesa") || p.includes("m-pesa")) {
    return "mpesa";
  }
  if (p.includes("bank") || p.includes("transfer") || p.includes("rtgs")) {
    return "bank";
  }
  return "cash";
}

function paymentMethodLabel(method: string): string {
  switch (method) {
    case "mpesa":
      return "M-Pesa";
    case "bank":
      return "Bank transfer";
    default:
      return "Cash";
  }
}

type KopokopoPayPhase = "idle" | "sending" | "pending" | "success" | "failed";

type PaySupplyDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PathBSupplyListRowRecord | null;
  onPaid: () => void;
};

export function PaySupplyDrawer({ open, onOpenChange, row, onPaid }: PaySupplyDrawerProps) {
  const { me } = useDashboard();
  const canPay = hasPermission(me?.permissions, Permission.PurchasingPaymentWrite);
  const canHistory = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canReadSupplier = hasPermission(me?.permissions, Permission.SuppliersRead);

  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [history, setHistory] = useState<SupplyPaymentHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allocation, setAllocation] = useState("");
  const [paidAtLocal, setPaidAtLocal] = useState(defaultLocalDateTime);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [creditApplied, setCreditApplied] = useState("0");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOptions, setPayOptions] = useState<SupplyPayOptionsRecord | null>(null);
  const [payOptionsLoading, setPayOptionsLoading] = useState(false);
  const [kopokopoPhase, setKopokopoPhase] = useState<KopokopoPayPhase>("idle");
  const [kopokopoMessage, setKopokopoMessage] = useState<string | null>(null);

  const balanceOpen = row ? n(row.balanceOpen) : 0;
  const kopokopoEligible = Boolean(payOptions?.kopokopoPayEligible);
  const payoutPhone = payOptions?.payoutPhone?.trim() ?? supplier?.payoutPhone?.trim() ?? "";
  const paidFull = row ? row.paymentStatus === "PAID" : false;
  const paymentDetails = supplier?.paymentDetails?.trim() ?? "";
  const preferredMethod = resolvePaymentMethod(supplier?.paymentMethodPreferred);

  useEffect(() => {
    if (!open || !row || !canReadSupplier) {
      setSupplier(null);
      setSupplierError(null);
      return;
    }
    setSupplierLoading(true);
    setSupplierError(null);
    void fetchSupplierById(row.supplierId)
      .then((s) => {
        setSupplier(s);
        setPaymentMethod(resolvePaymentMethod(s.paymentMethodPreferred));
      })
      .catch((e) => {
        setSupplier(null);
        setSupplierError(
          e instanceof Error ? e.message : "Could not load supplier payment details.",
        );
      })
      .finally(() => setSupplierLoading(false));
  }, [open, row, canReadSupplier]);

  useEffect(() => {
    if (!open || !row || !canHistory) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    void fetchSupplyPaymentHistory(row.supplierInvoiceId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, row, canHistory]);

  useEffect(() => {
    if (!open || !row) {
      setPayOptions(null);
      setKopokopoPhase("idle");
      setKopokopoMessage(null);
      return;
    }
    const b = n(row.balanceOpen);
    const init = b > 0 ? b.toFixed(2) : "";
    setAllocation(init);
    setPaymentAmount(init);
    setCreditApplied("0");
    setReference("");
    setNotes("");
    setPaidAtLocal(defaultLocalDateTime());
    setError(null);
    setShowAdvanced(false);
    setKopokopoPhase("idle");
    setKopokopoMessage(null);

    setPayOptionsLoading(true);
    void fetchSupplyPayOptions(row.supplierInvoiceId)
      .then((o) => {
        setPayOptions(o);
        if (o.pendingDisbursement) {
          setKopokopoPhase("pending");
          setKopokopoMessage("M-Pesa payment in progress — waiting for KopoKopo confirmation.");
        }
      })
      .catch(() => setPayOptions(null))
      .finally(() => setPayOptionsLoading(false));
  }, [open, row]);

  const applyDisbursementStatus = (status: SupplyKopokopoPayRecord) => {
    const s = (status.status ?? "").toLowerCase();
    if (s === "success") {
      setKopokopoPhase("success");
      setKopokopoMessage(status.message ?? "Payment confirmed.");
      toast.success("Supplier paid via M-Pesa", {
        description: row
          ? `${formatMoney(balanceOpen)} sent to ${row.supplierName || "supplier"}.`
          : undefined,
        duration: 8000,
      });
      onPaid();
      onOpenChange(false);
      return;
    }
    if (s === "failed") {
      setKopokopoPhase("failed");
      setKopokopoMessage(status.message ?? "KopoKopo payment failed.");
      setError(status.message ?? "KopoKopo payment failed.");
      return;
    }
    setKopokopoPhase("pending");
    setKopokopoMessage(
      status.message ?? "M-Pesa payment in progress — waiting for KopoKopo confirmation.",
    );
  };

  useEffect(() => {
    if (!open || !row || kopokopoPhase !== "pending") {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchSupplyDisbursementStatus(row.supplierInvoiceId);
        if (cancelled) {
          return;
        }
        applyDisbursementStatus(status);
      } catch {
        /* keep polling */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, row, kopokopoPhase, balanceOpen, onPaid, onOpenChange]);

  useEffect(() => {
    if (!showAdvanced || !row) {
      return;
    }
    const allocN = Number(allocation.trim());
    if (Number.isFinite(allocN) && allocN > 0) {
      setPaymentAmount(allocN.toFixed(2));
    }
  }, [allocation, showAdvanced, row]);

  const submitPayment = async () => {
    if (!row || !canPay) {
      return;
    }
    setError(null);
    const allocN = Number(allocation.trim());
    if (!Number.isFinite(allocN) || allocN <= 0) {
      setError("Enter a positive amount to apply to this supply.");
      return;
    }
    if (allocN > balanceOpen + 0.001) {
      setError(`Amount cannot exceed open balance (${formatMoney(balanceOpen)}).`);
      return;
    }
    const cash = Number(paymentAmount);
    const credit = Number(creditApplied);
    if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(credit) || credit < 0) {
      setError("Payment and supplier credit must be valid non-negative numbers.");
      return;
    }
    let paidAt: string;
    try {
      paidAt = toIsoInstant(paidAtLocal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid date");
      return;
    }
    if (cash + credit < allocN - 0.001) {
      setError("Cash payment plus supplier credit must cover the amount applied.");
      return;
    }
    setBusy(true);
    try {
      await postSupplierPayment({
        supplierId: row.supplierId,
        paidAt,
        paymentMethod,
        paymentAmount: cash,
        creditApplied: credit,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: [{ supplierInvoiceId: row.supplierInvoiceId, amount: allocN }],
      });
      toast.success("Supplier paid", {
        description: `${formatMoney(allocN)} recorded for ${row.supplierName || "supplier"}.`,
        duration: 8000,
      });
      onPaid();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const initiateKopokopoPay = async () => {
    if (!row || !canPay || !kopokopoEligible) {
      return;
    }
    setError(null);
    setBusy(true);
    setKopokopoPhase("sending");
    try {
      const result = await postSupplyKopokopoPay(row.supplierInvoiceId);
      setKopokopoPhase("pending");
      setKopokopoMessage(
        result.message ?? "M-Pesa payment sent — waiting for KopoKopo confirmation.",
      );
      toast.info("M-Pesa sent", {
        description: result.message ?? "Waiting for KopoKopo to confirm the transfer.",
        duration: 6000,
      });
    } catch (e) {
      setKopokopoPhase("failed");
      setError(e instanceof Error ? e.message : "Could not start KopoKopo payment.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmPay = () => {
    if (!row) {
      return;
    }
    if (kopokopoEligible && (kopokopoPhase === "idle" || kopokopoPhase === "failed")) {
      void initiateKopokopoPay();
      return;
    }
    const b = n(row.balanceOpen);
    setAllocation(b > 0 ? b.toFixed(2) : "");
    setPaymentAmount(b > 0 ? b.toFixed(2) : "");
    setCreditApplied("0");
    setPaymentMethod(preferredMethod);
    setPaidAtLocal(defaultLocalDateTime());
    void submitPayment();
  };

  const confirmLabel = () => {
    if (kopokopoPhase === "pending" || kopokopoPhase === "sending") {
      return "Sending M-Pesa…";
    }
    if (kopokopoEligible) {
      return `Send M-Pesa · ${formatMoney(balanceOpen)}`;
    }
    return `Confirm payment · ${formatMoney(balanceOpen)}`;
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Pay ${row.supplierName}` : "Pay supply"}
      description={
        row
          ? `Confirm payment for ${row.invoiceNumber}. Use the supplier's remittance details below, then record in one step.`
          : undefined
      }
      width="wide"
      icon={<CreditCard className="size-5 text-primary" aria-hidden />}
      banner={error ? <FormDrawerMessageBanner text={error} /> : undefined}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {!paidFull && balanceOpen > 0 && canPay ? (
            <Button
              type="button"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void onConfirmPay()}
              disabled={
                busy ||
                supplierLoading ||
                payOptionsLoading ||
                kopokopoPhase === "pending" ||
                kopokopoPhase === "sending"
              }
            >
              {busy || kopokopoPhase === "pending" || kopokopoPhase === "sending" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" strokeWidth={3} aria-hidden />
              )}
              {confirmLabel()}
            </Button>
          ) : null}
        </div>
      }
    >
      {!row ? null : (
        <div className="space-y-5 px-1 pb-4">
          <div className="grid gap-3 rounded-xl border border-border bg-muted/15 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Invoice</p>
              <p className="font-mono text-sm font-semibold">{row.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Invoice total</p>
              <p className="font-mono text-sm tabular-nums">{formatMoney(n(row.grandTotal))}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Balance due</p>
              <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                {formatMoney(balanceOpen)}
              </p>
            </div>
          </div>

          {paidFull ? (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
              This supply is fully paid.
            </p>
          ) : !canPay ? (
            <p className="text-sm text-muted-foreground">
              You need <code className="text-xs">{Permission.PurchasingPaymentWrite}</code> to post
              payments.
            </p>
          ) : (
            <>
              <section
                className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10"
                aria-labelledby="supplier-payment-heading"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      {preferredMethod === "mpesa" ? (
                        <Smartphone className="size-5" aria-hidden />
                      ) : (
                        <CreditCard className="size-5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3
                        id="supplier-payment-heading"
                        className="text-sm font-bold text-foreground"
                      >
                        How to pay this supplier
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Preferred:{" "}
                        <span className="font-semibold text-foreground">
                          {paymentMethodLabel(preferredMethod)}
                        </span>
                        {supplier?.paymentMethodPreferred?.trim() &&
                        supplier.paymentMethodPreferred.trim().toLowerCase() !==
                          preferredMethod ? (
                          <span className="text-muted-foreground">
                            {" "}
                            ({supplier.paymentMethodPreferred})
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {row.supplierId ? (
                    <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 gap-1" asChild>
                      <Link href={`${APP_ROUTES.suppliers}?supplier=${encodeURIComponent(row.supplierId)}`}>
                        Edit
                        <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </Button>
                  ) : null}
                </div>

                {supplierLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Loading payment details…
                  </div>
                ) : supplierError ? (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {supplierError}
                  </p>
                ) : paymentDetails || payoutPhone ? (
                  <div className="mt-3 space-y-3">
                    {payoutPhone ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                          KopoKopo M-Pesa payout
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">{payoutPhone}</p>
                        {kopokopoEligible ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Confirm below to send {formatMoney(balanceOpen)} via KopoKopo Send Money.
                          </p>
                        ) : payOptions && !payOptions.kopokopoActive ? (
                          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                            KopoKopo is not active — record payment manually.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {paymentDetails ? (
                      <div className="rounded-xl border border-border/80 bg-background px-3.5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Payment &amp; remittance
                        </p>
                        <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
                          {paymentDetails}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-amber-300/80 bg-amber-50/80 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    No payment details on file for this supplier. Add paybill, till, or bank info under{" "}
                    <Link href={APP_ROUTES.suppliers} className="font-semibold underline">
                      Suppliers
                    </Link>{" "}
                    before sending money.
                  </p>
                )}
              </section>

              {kopokopoPhase === "pending" ? (
                <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-center text-sm text-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin align-[-2px]" aria-hidden />
                  {kopokopoMessage ?? "Waiting for M-Pesa confirmation…"}
                </p>
              ) : kopokopoPhase === "success" ? (
                <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-center text-sm text-emerald-900 dark:text-emerald-100">
                  {kopokopoMessage ?? "Payment confirmed."}
                </p>
              ) : (
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {kopokopoEligible ? (
                    <>
                      Tap{" "}
                      <span className="font-semibold text-foreground">Send M-Pesa</span> to pay{" "}
                      <span className="font-semibold text-foreground">{formatMoney(balanceOpen)}</span>{" "}
                      via KopoKopo. The ledger updates when KopoKopo confirms.
                    </>
                  ) : (
                    <>
                      Send{" "}
                      <span className="font-semibold text-foreground">{formatMoney(balanceOpen)}</span>{" "}
                      using the details above, then tap{" "}
                      <span className="font-semibold text-foreground">Confirm payment</span> to record it
                      in PalMart.
                    </>
                  )}
                </p>
              )}

              <div className="rounded-xl border border-border/60">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/30"
                  onClick={() => setShowAdvanced((v) => !v)}
                  aria-expanded={showAdvanced}
                >
                  {kopokopoEligible
                    ? "Record payment manually (partial, credit, reference)"
                    : "Adjust payment (partial, credit, reference)"}
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      showAdvanced && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {showAdvanced ? (
                  <div className="grid gap-4 border-t border-border/60 p-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className={dashboardLabelClass()}>Apply to this supply</span>
                      <input
                        className={dashboardInputClass(busy)}
                        value={allocation}
                        onChange={(e) => setAllocation(e.target.value)}
                        disabled={busy}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={dashboardLabelClass()}>Paid at</span>
                      <input
                        type="datetime-local"
                        className={dashboardInputClass(busy)}
                        value={paidAtLocal}
                        onChange={(e) => setPaidAtLocal(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={dashboardLabelClass()}>Method</span>
                      <select
                        className={dashboardSelectClass(busy)}
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        disabled={busy}
                      >
                        <option value="cash">cash</option>
                        <option value="bank">bank</option>
                        <option value="mpesa">mpesa</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={dashboardLabelClass()}>Cash / transfer amount</span>
                      <input
                        className={dashboardInputClass(busy)}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        disabled={busy}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={dashboardLabelClass()}>Supplier credit applied</span>
                      <input
                        className={dashboardInputClass(busy)}
                        value={creditApplied}
                        onChange={(e) => setCreditApplied(e.target.value)}
                        disabled={busy}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className={dashboardLabelClass()}>Reference # (optional)</span>
                      <input
                        className={dashboardInputClass(busy)}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className={dashboardLabelClass()}>Notes (optional)</span>
                      <textarea
                        className={dashboardTextareaClass(busy)}
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() => void submitPayment()}
                      >
                        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Record with options above
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          <div>
            <h4 className="text-sm font-semibold text-foreground">Payment history</h4>
            {!canHistory ? (
              <p className={cn(dashboardHintClass(), "mt-1")}>
                Requires {Permission.PurchasingPaymentRead}.
              </p>
            ) : historyLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : history.length === 0 ? (
              <p className={cn(dashboardHintClass(), "mt-1")}>No payments recorded yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/80 text-[10px] font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">When</th>
                      <th className="px-2 py-1.5">Method</th>
                      <th className="px-2 py-1.5 text-right">Applied</th>
                      <th className="px-2 py-1.5">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.allocationId} className="border-t">
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {new Date(h.paidAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{h.paymentMethod}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatMoney(n(h.amountAppliedToInvoice))}
                        </td>
                        <td className="max-w-[220px] truncate px-2 py-1.5">{h.reference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
