"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchOpenSupplierInvoices,
  fetchSuppliers,
  postSupplierPayment,
  type OpenSupplierInvoiceRow,
  type PostSupplierPaymentAllocationLine,
  type SupplierRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

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

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecordSupplierPaymentPage() {
  const { me } = useDashboard();
  const canRead = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canWrite = hasPermission(me?.permissions, Permission.PurchasingPaymentWrite);

  const [feedback, setFeedback] = useState<{ text: string; kind: "error" | "success" } | null>(
    null,
  );
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [openInvoices, setOpenInvoices] = useState<OpenSupplierInvoiceRow[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const [paidAtLocal, setPaidAtLocal] = useState(defaultLocalDateTime);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [creditApplied, setCreditApplied] = useState("0");

  const refreshSuppliers = useCallback(async () => {
    setSupplierLoading(true);
    setFeedback(null);
    try {
      setSuppliers(await fetchSuppliers());
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Failed to load suppliers.",
        kind: "error",
      });
    } finally {
      setSupplierLoading(false);
    }
  }, []);

  const loadOpenInvoices = async () => {
    const sid = supplierId.trim();
    if (!sid) {
      setFeedback({ text: "Choose or enter a supplier ID.", kind: "error" });
      return;
    }
    setInvoiceLoading(true);
    setFeedback(null);
    try {
      const rows = await fetchOpenSupplierInvoices(sid);
      setOpenInvoices(rows);
      setAlloc({});
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Failed to load invoices.",
        kind: "error",
      });
    } finally {
      setInvoiceLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite) {
      return;
    }
    const sid = supplierId.trim();
    const lines: PostSupplierPaymentAllocationLine[] = [];
    for (const row of openInvoices) {
      const raw = (alloc[row.id] ?? "").trim();
      if (!raw) {
        continue;
      }
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0) {
        setFeedback({ text: "Allocation amounts must be positive numbers.", kind: "error" });
        return;
      }
      lines.push({ supplierInvoiceId: row.id, amount });
    }
    if (lines.length === 0) {
      setFeedback({ text: "Enter at least one allocation amount.", kind: "error" });
      return;
    }
    const cash = Number(paymentAmount);
    const credit = Number(creditApplied);
    if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(credit) || credit < 0) {
      setFeedback({ text: "Payment and credit must be non-negative numbers.", kind: "error" });
      return;
    }
    let paidAt: string;
    try {
      paidAt = toIsoInstant(paidAtLocal);
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Invalid date.",
        kind: "error",
      });
      return;
    }
    setFeedback(null);
    try {
      const result = await postSupplierPayment({
        supplierId: sid,
        paidAt,
        paymentMethod,
        paymentAmount: cash,
        creditApplied: credit,
        allocations: lines,
      });
      setFeedback({
        text: `Payment recorded. Allocated ${formatMoney(result.totalAllocated)}. Supplier credit balance after: ${formatMoney(result.supplierPrepaymentBalanceAfter)}.`,
        kind: "success",
      });
      await loadOpenInvoices();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Payment failed.",
        kind: "error",
      });
    }
  };

  if (!canRead) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Record supplier payment</h2>
        <p className="text-sm text-muted-foreground">
          You need{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.PurchasingPaymentRead}</code>{" "}
          (and usually <code className="text-xs">{Permission.PurchasingPaymentWrite}</code> to post).
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Record supplier payment</h2>
        <p className="text-sm text-muted-foreground">
          Load open posted invoices for a supplier, allocate amounts, then post cash (and optional supplier
          credit). Methods: <code className="text-xs">cash</code>, <code className="text-xs">bank</code>,{" "}
          <code className="text-xs">mpesa</code>. Cash + credit must cover total allocations.
        </p>
      </header>

      {feedback ? (
        <p
          className={
            feedback.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={supplierLoading}
          onClick={() => void refreshSuppliers()}
        >
          {supplierLoading ? "Loading suppliers…" : "Refresh suppliers"}
        </Button>
      </div>

      <div className="rounded-md border bg-muted/20 p-4">
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Supplier</span>
          <select
            className="rounded border bg-background px-2 py-1.5"
            value={suppliers.some((s) => s.id === supplierId) ? supplierId : ""}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">— Select from list —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 flex max-w-md flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Supplier ID (UUID)</span>
          <input
            className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
            placeholder="Paste or edit ID"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          />
        </label>
        <div className="mt-3">
          <Button type="button" variant="secondary" disabled={invoiceLoading} onClick={() => void loadOpenInvoices()}>
            {invoiceLoading ? "Loading…" : "Load open invoices"}
          </Button>
        </div>
      </div>

      {openInvoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open invoices loaded.</p>
      ) : (
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Invoice #</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium text-right">Open</th>
                  <th className="px-3 py-2 font-medium text-right">Pay now</th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.invoiceNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.invoiceDate}
                      {row.dueDate ? ` · due ${row.dueDate}` : ""}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.openBalance)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-28 rounded border bg-background px-2 py-1 text-right tabular-nums"
                        placeholder="0"
                        disabled={!canWrite}
                        value={alloc[row.id] ?? ""}
                        onChange={(e) => setAlloc((m) => ({ ...m, [row.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canWrite ? (
            <div className="grid max-w-xl gap-3 rounded-md border p-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Paid at (local)</span>
                <input
                  type="datetime-local"
                  className="rounded border bg-background px-2 py-1.5"
                  value={paidAtLocal}
                  onChange={(e) => setPaidAtLocal(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Payment method</span>
                <select
                  className="rounded border bg-background px-2 py-1.5"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">cash</option>
                  <option value="bank">bank</option>
                  <option value="mpesa">mpesa</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Cash / paid amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="rounded border bg-background px-2 py-1.5"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Credit applied (from supplier prepay)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="rounded border bg-background px-2 py-1.5"
                  value={creditApplied}
                  onChange={(e) => setCreditApplied(e.target.value)}
                />
              </label>
              <Button type="submit">Post payment</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You can view open invoices. Posting requires{" "}
              <code className="text-xs">{Permission.PurchasingPaymentWrite}</code>.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
