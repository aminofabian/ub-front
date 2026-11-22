"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchReceivablesAgeing,
  fetchSalesInvoice,
  fetchSalesInvoices,
  issueSalesCreditNote,
  recordSalesReceipt,
  type ReceivablesAgeing,
  type SalesInvoice,
} from "@/lib/api";

const STATUS_LABEL: Record<string, string> = { open: "Unpaid", part_paid: "Part paid", paid: "Paid" };
const METHODS: { value: "cash" | "mpesa" | "bank"; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
];

function money(currency: string, value: number): string {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * What buyers owe this supplier: an invoice is raised when a trade order is dispatched, and money
 * received is recorded against it here.
 */
export function SalesInvoicesPanel({ canRecord }: { canRecord: boolean }) {
  const [unpaidOnly, setUnpaidOnly] = useState(true);
  const [invoices, setInvoices] = useState<SalesInvoice[] | null>(null);
  const [ageing, setAgeing] = useState<ReceivablesAgeing | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<SalesInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "mpesa" | "bank">("mpesa");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const credit = async () => {
    if (!open) return;
    const value = Number(creditAmount);
    if (!(value > 0) || !creditReason.trim()) {
      toast.error("Enter the amount to take off and the reason");
      return;
    }
    setBusy(true);
    try {
      setOpen(await issueSalesCreditNote(open.id, value, creditReason));
      setCreditAmount("");
      setCreditReason("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the credit note");
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    Promise.all([fetchSalesInvoices(unpaidOnly), fetchReceivablesAgeing()])
      .then(([rows, owed]) => {
        if (!alive) return;
        setInvoices(rows);
        setAgeing(owed);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [unpaidOnly]);

  useEffect(() => load(), [load]);

  const openInvoice = async (id: string) => {
    try {
      const invoice = await fetchSalesInvoice(id);
      setOpen(invoice);
      setAmount(invoice.balance > 0 ? String(invoice.balance) : "");
      setReference("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the invoice");
    }
  };

  const record = async () => {
    if (!open) return;
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Enter the amount received");
      return;
    }
    setBusy(true);
    try {
      const updated = await recordSalesReceipt(open.id, { amount: value, method, reference });
      setOpen(updated);
      setAmount(updated.balance > 0 ? String(updated.balance) : "");
      setReference("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the payment");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "h-11 w-full border border-foreground/15 bg-background px-2 text-[14px] tabular-nums sm:h-9";

  if (open) {
    return (
      <div className="mt-4">
        <button type="button" className="text-[13px] font-medium underline underline-offset-4" onClick={() => setOpen(null)}>
          Back to invoices
        </button>
        <h2 className="mt-3 text-lg font-semibold tracking-tight">
          {open.invoiceNo} · {STATUS_LABEL[open.status] ?? open.status}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {open.buyerBusinessName ? `${open.buyerBusinessName} · ` : ""}
          {open.buyerName} · {open.buyerPhone} · issued {open.issuedOn} · due {open.dueOn}
        </p>
        <dl className="mt-4 grid max-w-sm grid-cols-2 gap-y-1 text-[14px]">
          <dt className="text-muted-foreground">Invoice total</dt>
          <dd className="text-right tabular-nums">{money(open.currency, open.total)}</dd>
          <dt className="text-muted-foreground">Received</dt>
          <dd className="text-right tabular-nums">{money(open.currency, open.amountPaid)}</dd>
          {open.amountCredited ? (
            <>
              <dt className="text-muted-foreground">Credit notes</dt>
              <dd className="text-right tabular-nums">{money(open.currency, open.amountCredited)}</dd>
            </>
          ) : null}
          <dt className="font-medium">Still owed</dt>
          <dd className="text-right font-semibold tabular-nums">{money(open.currency, open.balance)}</dd>
        </dl>

        {open.receipts && open.receipts.length > 0 ? (
          <ul className="mt-4 divide-y divide-border border-y border-border text-[13px]">
            {open.receipts.map((r) => (
              <li key={r.id} className="flex justify-between gap-4 py-2">
                <span>
                  {r.receivedOn} · {METHODS.find((m) => m.value === r.method)?.label ?? r.method}
                  {r.reference ? ` · ${r.reference}` : ""}
                </span>
                <span className="tabular-nums">{money(open.currency, r.amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {canRecord && open.balance > 0 ? (
          <div className="mt-5 grid max-w-sm gap-2">
            <p className="text-[14px] font-medium">Record money received</p>
            <label className="text-[13px]">
              Amount
              <input className={`${inputClass} mt-1`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="text-[13px]">
              How it was paid
              <select
                className={`${inputClass} mt-1`}
                value={method}
                onChange={(e) => setMethod(e.target.value as "cash" | "mpesa" | "bank")}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px]">
              Reference (optional)
              <input className={`${inputClass} mt-1`} value={reference} onChange={(e) => setReference(e.target.value)} />
            </label>
            <Button type="button" disabled={busy} onClick={() => void record()}>
              {busy ? "Saving…" : "Record payment"}
            </Button>

            <p className="mt-4 text-[14px] font-medium">Take money off this invoice</p>
            <p className="text-[12px] leading-snug text-muted-foreground">
              For a shortage, goods sent back or a wrong price. It does not put stock back on your shelf.
            </p>
            <label className="text-[13px]">
              Amount to take off
              <input className={`${inputClass} mt-1`} inputMode="decimal" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
            </label>
            <label className="text-[13px]">
              Reason
              <input className={`${inputClass} mt-1`} value={creditReason} onChange={(e) => setCreditReason(e.target.value)} />
            </label>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void credit()}>
              Save credit note
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (failed) {
    return (
      <p className="mt-6 text-[14px] text-foreground">
        Could not load the invoices.{" "}
        <button type="button" className="font-medium underline underline-offset-4" onClick={() => load()}>
          Try again
        </button>
      </p>
    );
  }
  if (invoices == null) return <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>;

  return (
    <div className="mt-4">
      {ageing && ageing.buyers.length > 0 ? (
        <div className="mb-5">
          <p className="text-[14px] font-medium">
            Buyers owe you {money(ageing.currency ?? "", ageing.total)}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] text-muted-foreground">
                  <th className="py-1.5 font-medium">Buyer</th>
                  <th className="py-1.5 text-right font-medium">Not yet due</th>
                  <th className="py-1.5 text-right font-medium">1–30 days late</th>
                  <th className="py-1.5 text-right font-medium">31–60</th>
                  <th className="py-1.5 text-right font-medium">61–90</th>
                  <th className="py-1.5 text-right font-medium">Over 90</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ageing.buyers.map((b) => (
                  <tr key={b.buyerPhone} className="border-b border-border">
                    <td className="py-1.5 pr-2">{b.buyer}</td>
                    {[b.notYetDue, b.days1To30, b.days31To60, b.days61To90, b.over90, b.total].map((v, i) => (
                      <td key={i} className="py-1.5 text-right tabular-nums">
                        {v ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <label className="flex min-h-11 items-center gap-2 text-[13px] sm:min-h-9">
        <input type="checkbox" className="size-4" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} />
        Only invoices with money still owed
      </label>

      {invoices.length === 0 ? (
        <p className="mt-4 text-[14px] text-muted-foreground">
          {unpaidOnly ? "Nobody owes you on an invoice." : "No invoices yet. One is raised when you dispatch a trade order."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border border-y border-border">
          {invoices.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-foreground/[0.03]"
                onClick={() => void openInvoice(i.id)}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">
                    {i.buyerBusinessName || i.buyerName} · {i.invoiceNo}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {STATUS_LABEL[i.status] ?? i.status} · due {i.dueOn}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] tabular-nums">{money(i.currency, i.balance)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
