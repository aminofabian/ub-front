"use client";

import { useEffect, useMemo, useState } from "react";
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

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchOpenSupplierInvoices,
  fetchSupplierById,
  fetchSupplyDisbursementStatus,
  fetchSupplyPayOptions,
  fetchSupplyPaymentHistory,
  postSupplierPayment,
  postSupplyKopokopoPay,
  type OpenSupplierInvoiceRow,
  type PathBSupplyListRowRecord,
  type SupplierRecord,
  type SupplyKopokopoPayRecord,
  type SupplyPayOptionsRecord,
  type SupplyPaymentHistoryRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { supCardInset, supFieldLabel, supInput, supSelect, supStatTile, supTextarea } from "../../suppliers/_components/supplier-ui-tokens";
import { formatSupplyMoney, supplyN } from "./supplies-shared";

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

/** Stop polling the drawer; backend marks stale pending after ~3 min too. */
const DISBURSEMENT_POLL_INTERVAL_MS = 2500;
const DISBURSEMENT_POLL_MAX_MS = 3 * 60 * 1000;

type PaySupplyDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PathBSupplyListRowRecord | null;
  onPaid: () => void;
  /** Optional: allow clearing unpaid supplies (e.g. after supplier was deleted). */
  onDeleteSupply?: (row: PathBSupplyListRowRecord) => void | Promise<void>;
  canDeleteSupply?: boolean;
  /**
   * When true, select every open invoice for this supplier on open
   * (settle previous balances in one payment).
   */
  settleAllOnOpen?: boolean;
};

export function PaySupplyDrawer({
  open,
  onOpenChange,
  row,
  onPaid,
  onDeleteSupply,
  canDeleteSupply = false,
  settleAllOnOpen = false,
}: PaySupplyDrawerProps) {
  const { me } = useDashboard();
  const canPay = hasPermission(me?.permissions, Permission.PurchasingPaymentWrite);
  const canHistory = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canReadSupplier = hasPermission(me?.permissions, Permission.SuppliersRead);

  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [deletingSupply, setDeletingSupply] = useState(false);
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
  const [openInvoices, setOpenInvoices] = useState<OpenSupplierInvoiceRow[]>([]);
  const [openInvoicesLoading, setOpenInvoicesLoading] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const rowBalanceOpen = row ? supplyN(row.balanceOpen) : 0;
  const selectedOpen = useMemo(() => {
    if (openInvoices.length === 0 && row && rowBalanceOpen > 0.009) {
      return [
        {
          id: row.supplierInvoiceId,
          supplierId: row.supplierId,
          invoiceNumber: row.invoiceNumber,
          invoiceDate: row.createdAt,
          dueDate: null,
          grandTotal: supplyN(row.grandTotal),
          openBalance: rowBalanceOpen,
        } satisfies OpenSupplierInvoiceRow,
      ].filter((inv) => selectedInvoiceIds.includes(inv.id));
    }
    return openInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
  }, [openInvoices, selectedInvoiceIds, row, rowBalanceOpen]);

  const payTotal = useMemo(
    () =>
      selectedOpen.reduce((sum, inv) => sum + supplyN(inv.openBalance), 0),
    [selectedOpen],
  );
  const multiSelect = selectedOpen.length > 1;
  const singleSelectedId =
    selectedOpen.length === 1 ? selectedOpen[0]?.id : null;
  const kopokopoEligible =
    Boolean(payOptions?.kopokopoPayEligible) &&
    singleSelectedId === row?.supplierInvoiceId &&
    !multiSelect;
  const payoutPhone = payOptions?.payoutPhone?.trim() ?? supplier?.payoutPhone?.trim() ?? "";
  const paidFull = row ? row.paymentStatus === "PAID" : false;
  const paymentDetails = supplier?.paymentDetails?.trim() ?? "";
  const preferredMethod = resolvePaymentMethod(supplier?.paymentMethodPreferred);
  const supplierDeleted = Boolean(supplier?.deletedAt);
  const canClearUnpaid =
    Boolean(row) &&
    canDeleteSupply &&
    Boolean(onDeleteSupply) &&
    supplyN(row?.amountPaid ?? 0) < 0.005;
  const otherOpenCount = Math.max(0, openInvoices.length - 1);
  const allOpenTotal = useMemo(
    () => openInvoices.reduce((sum, inv) => sum + supplyN(inv.openBalance), 0),
    [openInvoices],
  );

  const selectAllOpen = () => {
    const ids = openInvoices.map((inv) => inv.id);
    setSelectedInvoiceIds(ids);
    const total = openInvoices.reduce(
      (sum, inv) => sum + supplyN(inv.openBalance),
      0,
    );
    const init = total > 0 ? total.toFixed(2) : "";
    setAllocation(init);
    setPaymentAmount(init);
    setCreditApplied("0");
  };

  const selectOnlyCurrent = () => {
    if (!row) return;
    setSelectedInvoiceIds([row.supplierInvoiceId]);
    const b = rowBalanceOpen;
    const init = b > 0 ? b.toFixed(2) : "";
    setAllocation(init);
    setPaymentAmount(init);
    setCreditApplied("0");
  };

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => {
      const has = prev.includes(invoiceId);
      if (has) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== invoiceId);
      }
      return [...prev, invoiceId];
    });
  };

  useEffect(() => {
    if (!open || !row || !canReadSupplier) {
      setSupplier(null);
      setSupplierError(null);
      return;
    }
    setSupplierLoading(true);
    setSupplierError(null);
    void fetchSupplierById(row.supplierId, { includeDeleted: true })
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
      setOpenInvoices([]);
      setSelectedInvoiceIds([]);
      return;
    }
    setOpenInvoicesLoading(true);
    void fetchOpenSupplierInvoices(row.supplierId)
      .then((rows) => {
        const open = rows.filter((inv) => supplyN(inv.openBalance) > 0.009);
        // Ensure the current invoice appears even if list endpoint lags.
        if (
          rowBalanceOpen > 0.009 &&
          !open.some((inv) => inv.id === row.supplierInvoiceId)
        ) {
          open.unshift({
            id: row.supplierInvoiceId,
            supplierId: row.supplierId,
            invoiceNumber: row.invoiceNumber,
            invoiceDate: row.createdAt,
            dueDate: null,
            grandTotal: supplyN(row.grandTotal),
            openBalance: rowBalanceOpen,
          });
        }
        // Oldest first so clearing previous balances feels natural.
        open.sort((a, b) => {
          const da = new Date(a.invoiceDate).getTime();
          const db = new Date(b.invoiceDate).getTime();
          return da - db;
        });
        setOpenInvoices(open);
        if (settleAllOnOpen && open.length > 0) {
          setSelectedInvoiceIds(open.map((inv) => inv.id));
          const total = open.reduce(
            (sum, inv) => sum + supplyN(inv.openBalance),
            0,
          );
          const init = total > 0 ? total.toFixed(2) : "";
          setAllocation(init);
          setPaymentAmount(init);
        } else {
          setSelectedInvoiceIds(
            open.some((inv) => inv.id === row.supplierInvoiceId)
              ? [row.supplierInvoiceId]
              : open[0]
                ? [open[0].id]
                : [],
          );
        }
      })
      .catch(() => {
        setOpenInvoices([]);
        setSelectedInvoiceIds(
          rowBalanceOpen > 0.009 ? [row.supplierInvoiceId] : [],
        );
      })
      .finally(() => setOpenInvoicesLoading(false));
  }, [open, row, settleAllOnOpen, rowBalanceOpen]);

  useEffect(() => {
    if (!open || !row) {
      setPayOptions(null);
      setKopokopoPhase("idle");
      setKopokopoMessage(null);
      return;
    }
    const b = supplyN(row.balanceOpen);
    if (!settleAllOnOpen) {
      const init = b > 0 ? b.toFixed(2) : "";
      setAllocation(init);
      setPaymentAmount(init);
    }
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
  }, [open, row, settleAllOnOpen]);

  // Keep cash amount in sync when selection changes (simple confirm path).
  useEffect(() => {
    if (!open || !row || showAdvanced) return;
    if (payTotal > 0.009) {
      const init = payTotal.toFixed(2);
      setAllocation(init);
      setPaymentAmount(init);
    }
  }, [open, row, payTotal, showAdvanced, selectedInvoiceIds]);

  const applyDisbursementStatus = (status: SupplyKopokopoPayRecord) => {
    const s = (status.status ?? "").toLowerCase();
    if (s === "success") {
      setKopokopoPhase("success");
      setKopokopoMessage(status.message ?? "Payment confirmed.");
      toast.success("Supplier paid via M-Pesa", {
        description: row
          ? `${formatSupplyMoney(rowBalanceOpen)} sent to ${row.supplierName || "supplier"}.`
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

  const stopWaitingForKopokopo = (message: string) => {
    setKopokopoPhase("failed");
    setKopokopoMessage(message);
    setError(message);
  };

  useEffect(() => {
    if (!open || !row || kopokopoPhase !== "pending") {
      return;
    }
    let cancelled = false;
    const startedAt = Date.now();
    const poll = async () => {
      if (Date.now() - startedAt >= DISBURSEMENT_POLL_MAX_MS) {
        if (!cancelled) {
          stopWaitingForKopokopo(
            "Stopped waiting after 3 minutes. Check KopoKopo whether M-Pesa was sent, then retry or record the payment manually.",
          );
        }
        return;
      }
      try {
        const status = await fetchSupplyDisbursementStatus(row.supplierInvoiceId);
        if (cancelled) {
          return;
        }
        applyDisbursementStatus(status);
      } catch {
        /* keep polling until timeout */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), DISBURSEMENT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, row, kopokopoPhase, rowBalanceOpen, onPaid, onOpenChange]);

  useEffect(() => {
    if (!showAdvanced || !row || multiSelect) {
      return;
    }
    const allocN = Number(allocation.trim());
    if (Number.isFinite(allocN) && allocN > 0) {
      setPaymentAmount(allocN.toFixed(2));
    }
  }, [allocation, showAdvanced, row, multiSelect]);

  const submitPayment = async () => {
    if (!row || !canPay) {
      return;
    }
    setError(null);
    if (selectedOpen.length === 0) {
      setError("Select at least one unpaid invoice.");
      return;
    }

    let allocations: { supplierInvoiceId: string; amount: number }[];
    if (multiSelect) {
      allocations = selectedOpen.map((inv) => ({
        supplierInvoiceId: inv.id,
        amount: Number(supplyN(inv.openBalance).toFixed(2)),
      }));
    } else {
      const allocN = Number(allocation.trim());
      const openBal = supplyN(selectedOpen[0]?.openBalance ?? rowBalanceOpen);
      if (!Number.isFinite(allocN) || allocN <= 0) {
        setError("Enter a positive amount to apply to this supply.");
        return;
      }
      if (allocN > openBal + 0.001) {
        setError(
          `Amount cannot exceed open balance (${formatSupplyMoney(openBal)}).`,
        );
        return;
      }
      allocations = [
        {
          supplierInvoiceId: selectedOpen[0]?.id ?? row.supplierInvoiceId,
          amount: allocN,
        },
      ];
    }

    const totalAlloc = allocations.reduce((sum, line) => sum + line.amount, 0);
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
    if (cash + credit < totalAlloc - 0.001) {
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
        allocations,
      });
      toast.success(
        multiSelect
          ? `Cleared ${allocations.length} unpaid invoices`
          : "Supplier paid",
        {
          description: `${formatSupplyMoney(totalAlloc)} recorded for ${row.supplierName || "supplier"}.`,
          duration: 8000,
        },
      );
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
    // Always clear full open balances on the selected invoices.
    setShowAdvanced(false);
    setCreditApplied("0");
    setPaymentMethod(preferredMethod);
    setPaidAtLocal(defaultLocalDateTime());
    const total = payTotal > 0.009 ? payTotal : rowBalanceOpen;
    setAllocation(total > 0 ? total.toFixed(2) : "");
    setPaymentAmount(total > 0 ? total.toFixed(2) : "");
    void (async () => {
      if (!canPay || selectedOpen.length === 0) {
        if (selectedOpen.length === 0) {
          setError("Select at least one unpaid invoice.");
        }
        return;
      }
      setError(null);
      const allocations = selectedOpen.map((inv) => ({
        supplierInvoiceId: inv.id,
        amount: Number(supplyN(inv.openBalance).toFixed(2)),
      }));
      const totalAlloc = allocations.reduce((sum, line) => sum + line.amount, 0);
      let paidAt: string;
      try {
        paidAt = toIsoInstant(defaultLocalDateTime());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid date");
        return;
      }
      setBusy(true);
      try {
        await postSupplierPayment({
          supplierId: row.supplierId,
          paidAt,
          paymentMethod: preferredMethod,
          paymentAmount: totalAlloc,
          creditApplied: 0,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          allocations,
        });
        toast.success(
          allocations.length > 1
            ? `Cleared ${allocations.length} unpaid invoices`
            : "Supplier paid",
          {
            description: `${formatSupplyMoney(totalAlloc)} recorded for ${row.supplierName || "supplier"}.`,
            duration: 8000,
          },
        );
        onPaid();
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed.");
      } finally {
        setBusy(false);
      }
    })();
  };

  const confirmLabel = () => {
    if (kopokopoPhase === "pending" || kopokopoPhase === "sending") {
      return "Sending M-Pesa…";
    }
    if (kopokopoEligible) {
      return `Send M-Pesa · ${formatSupplyMoney(rowBalanceOpen)}`;
    }
    if (multiSelect) {
      return `Clear ${selectedOpen.length} unpaid · ${formatSupplyMoney(payTotal)}`;
    }
    return `Confirm payment · ${formatSupplyMoney(payTotal > 0.009 ? payTotal : rowBalanceOpen)}`;
  };

  const viewingPaymentDetailsOnly = !(
    (payTotal > 0.009 || rowBalanceOpen > 0.009) &&
    canPay &&
    !paidFull
  );

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        row
          ? viewingPaymentDetailsOnly
            ? `Payment details · ${row.supplierName}`
            : `Pay ${row.supplierName}`
          : viewingPaymentDetailsOnly
            ? "Payment details"
            : "Pay supply"
      }
      description={
        row
          ? viewingPaymentDetailsOnly
            ? `Remittance details and payment history for ${row.invoiceNumber}.`
            : otherOpenCount > 0
              ? `This supplier has ${openInvoices.length} unpaid invoices (${formatSupplyMoney(allOpenTotal)}). Select which to clear, or clear all at once.`
              : `Confirm payment for ${row.invoiceNumber}. Use the supplier's remittance details below, then record in one step.`
          : undefined
      }
      width="wide"
      icon={<CreditCard className="size-5 text-primary" aria-hidden />}
      banner={error ? <FormDrawerMessageBanner text={error} /> : undefined}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy || deletingSupply}>
            Cancel
          </Button>
          {canClearUnpaid && row ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy || deletingSupply}
              onClick={() => {
                void (async () => {
                  setDeletingSupply(true);
                  try {
                    await onDeleteSupply?.(row);
                    onOpenChange(false);
                  } finally {
                    setDeletingSupply(false);
                  }
                })();
              }}
            >
              {deletingSupply ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Delete supply
            </Button>
          ) : null}
          {kopokopoPhase === "pending" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                stopWaitingForKopokopo(
                  "Stopped waiting on this screen. If M-Pesa did not go through, retry Send M-Pesa or record the payment manually.",
                )
              }
            >
              Stop waiting
            </Button>
          ) : null}
          {!paidFull && (payTotal > 0.009 || rowBalanceOpen > 0.009) && canPay ? (
            <Button
              type="button"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void onConfirmPay()}
              disabled={
                busy ||
                deletingSupply ||
                payOptionsLoading ||
                openInvoicesLoading ||
                selectedOpen.length === 0 ||
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className={supStatTile}>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice
              </span>
              <span className="mt-1 block font-mono text-sm font-semibold">
                {row.invoiceNumber}
              </span>
            </div>
            <div className={supStatTile}>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice total
              </span>
              <span className="mt-1 block font-mono text-sm font-semibold tabular-nums">
                {formatSupplyMoney(supplyN(row.grandTotal))}
              </span>
            </div>
            <div className={supStatTile}>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {multiSelect ? "Paying now" : "Balance due"}
              </span>
              <span className="mt-1 block font-mono text-lg font-bold tabular-nums text-foreground">
                {formatSupplyMoney(payTotal > 0.009 ? payTotal : rowBalanceOpen)}
              </span>
            </div>
          </div>

          {!paidFull && canPay && (openInvoices.length > 1 || openInvoicesLoading) ? (
            <section
              className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3"
              aria-labelledby="open-balances-heading"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3
                    id="open-balances-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    Open balances for this supplier
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {openInvoicesLoading
                      ? "Loading other unpaid invoices…"
                      : `${openInvoices.length} unpaid · ${formatSupplyMoney(allOpenTotal)} total`}
                  </p>
                </div>
                {!openInvoicesLoading && openInvoices.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={busy}
                      onClick={selectOnlyCurrent}
                    >
                      This invoice only
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
                      disabled={busy}
                      onClick={selectAllOpen}
                    >
                      Clear all · {formatSupplyMoney(allOpenTotal)}
                    </Button>
                  </div>
                ) : null}
              </div>
              {!openInvoicesLoading && openInvoices.length > 0 ? (
                <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
                  {openInvoices.map((inv) => {
                    const checked = selectedInvoiceIds.includes(inv.id);
                    const isCurrent = inv.id === row.supplierInvoiceId;
                    return (
                      <li key={inv.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                            checked
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-border/60 bg-card hover:bg-muted/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 accent-emerald-600"
                            checked={checked}
                            disabled={busy || (checked && selectedInvoiceIds.length <= 1)}
                            onChange={() => toggleInvoice(inv.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold">
                                {inv.invoiceNumber}
                              </span>
                              {isCurrent ? (
                                <span className="rounded bg-muted px-1 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                  Current
                                </span>
                              ) : (
                                <span className="rounded bg-amber-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                  Prev
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {new Date(inv.invoiceDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                            {formatSupplyMoney(supplyN(inv.openBalance))}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {multiSelect ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  M-Pesa Send Money pays one invoice at a time. Clearing several uses a
                  recorded payment against all selected balances.
                </p>
              ) : null}
            </section>
          ) : null}

          {paidFull ? (
            <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
              This supply is fully paid.
            </p>
          ) : !canPay ? (
            <p className="text-sm text-muted-foreground">
              You need <code className="text-xs">{Permission.PurchasingPaymentWrite}</code> to post
              payments.
            </p>
          ) : null}

          {/* Always show remittance details — including when the bill is already paid */}
          <section
            className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-4 shadow-sm ring-1 ring-primary/10"
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
                    {paidFull ? "Supplier remittance details" : "How to pay this supplier"}
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
              {row.supplierId && !supplierDeleted ? (
                <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 gap-1" asChild>
                  <Link href={`${APP_ROUTES.suppliers}?supplier=${encodeURIComponent(row.supplierId)}`}>
                    Edit
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </div>

            {supplierDeleted ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                This supplier was deleted.
                {!paidFull
                  ? " You can still pay or delete this unpaid supply to clear the payable."
                  : null}
              </p>
            ) : null}

            {supplierLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading payment details…
              </div>
            ) : !canReadSupplier ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                You need supplier read access to view remittance details.
              </p>
            ) : supplierError ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {supplierError}
                {canClearUnpaid
                  ? " Use Delete supply below to clear this unpaid receipt."
                  : ""}
              </p>
            ) : paymentDetails || payoutPhone ? (
              <div className="mt-3 space-y-3">
                {payoutPhone ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                      KopoKopo M-Pesa payout
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-foreground">{payoutPhone}</p>
                    {!paidFull && kopokopoEligible ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Confirm below to send {formatSupplyMoney(rowBalanceOpen)} via KopoKopo Send Money.
                      </p>
                    ) : !paidFull && payOptions && !payOptions.supplierPayoutEnabled ? (
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                        Supplier payouts are off.{" "}
                        <Link
                          href={APP_ROUTES.paymentsSettings}
                          className="font-semibold underline"
                        >
                          Enable under Payments
                        </Link>
                        .
                      </p>
                    ) : !paidFull && payOptions && !payOptions.supplierPayoutGatewayReady ? (
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                        Choose an active payout gateway in{" "}
                        <Link
                          href={APP_ROUTES.paymentsSettings}
                          className="font-semibold underline"
                        >
                          Payments settings
                        </Link>
                        .
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {paymentDetails ? (
                  <div className={cn(supCardInset, "px-3.5 py-3")}>
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
                </Link>
                .
              </p>
            )}
          </section>

          {!paidFull && canPay ? (
            <>
              {kopokopoPhase === "pending" ? (
                <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-center text-sm text-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin align-[-2px]" aria-hidden />
                  {kopokopoMessage ?? "Waiting for M-Pesa confirmation…"}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Polling stops after 3 minutes, when KopoKopo confirms, or if you tap Stop waiting.
                  </span>
                </p>
              ) : kopokopoPhase === "failed" && kopokopoMessage ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-center text-sm text-amber-950 dark:text-amber-100">
                  {kopokopoMessage}
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
                      <span className="font-semibold text-foreground">{formatSupplyMoney(rowBalanceOpen)}</span>{" "}
                      via KopoKopo. The ledger updates when KopoKopo confirms.
                    </>
                  ) : (
                    <>
                      Send{" "}
                      <span className="font-semibold text-foreground">
                        {formatSupplyMoney(payTotal > 0.009 ? payTotal : rowBalanceOpen)}
                      </span>{" "}
                      using the details above, then tap{" "}
                      <span className="font-semibold text-foreground">
                        {multiSelect ? "Clear unpaid" : "Confirm payment"}
                      </span>{" "}
                      to record it in PalMart.
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
                  disabled={multiSelect}
                >
                  {multiSelect
                    ? "Partial / credit options (select one invoice)"
                    : kopokopoEligible
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
                {showAdvanced && !multiSelect ? (
                  <div className="grid gap-4 border-t border-border/60 p-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className={supFieldLabel}>Apply to this supply</span>
                      <input
                        className={supInput}
                        value={allocation}
                        onChange={(e) => setAllocation(e.target.value)}
                        disabled={busy}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={supFieldLabel}>Paid at</span>
                      <input
                        type="datetime-local"
                        className={supInput}
                        value={paidAtLocal}
                        onChange={(e) => setPaidAtLocal(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={supFieldLabel}>Method</span>
                      <select
                        className={supSelect}
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
                      <span className={supFieldLabel}>Cash / transfer amount</span>
                      <input
                        className={supInput}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        disabled={busy}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={supFieldLabel}>Supplier credit applied</span>
                      <input
                        className={supInput}
                        value={creditApplied}
                        onChange={(e) => setCreditApplied(e.target.value)}
                        disabled={busy}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className={supFieldLabel}>Reference # (optional)</span>
                      <input
                        className={supInput}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className={supFieldLabel}>Notes (optional)</span>
                      <textarea
                        className={supTextarea}
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
          ) : null}

          <div>
            <h4 className="text-sm font-semibold text-foreground">Payment history</h4>
            {!canHistory ? (
              <p className={cn("text-xs text-muted-foreground", "mt-1")}>
                Requires {Permission.PurchasingPaymentRead}.
              </p>
            ) : historyLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </div>
            ) : history.length === 0 ? (
              <p className={cn("text-xs text-muted-foreground", "mt-1")}>No payments recorded yet.</p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/80 text-[10px] font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5">When</th>
                      <th className="px-2 py-1.5">Method</th>
                      <th className="px-2 py-1.5 text-right">Cash</th>
                      <th className="px-2 py-1.5 text-right">Applied</th>
                      <th className="px-2 py-1.5">Ref / notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.allocationId} className="border-t align-top">
                        <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                          {new Date(h.paidAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 font-mono capitalize">{h.paymentMethod}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatSupplyMoney(supplyN(h.paymentCashAmount))}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                          {formatSupplyMoney(supplyN(h.amountAppliedToInvoice))}
                        </td>
                        <td className="max-w-[14rem] px-2 py-1.5">
                          <span className="block truncate">{h.reference?.trim() || "—"}</span>
                          {h.notes?.trim() ? (
                            <span className="mt-0.5 block whitespace-pre-wrap text-[11px] text-muted-foreground">
                              {h.notes.trim()}
                            </span>
                          ) : null}
                        </td>
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
