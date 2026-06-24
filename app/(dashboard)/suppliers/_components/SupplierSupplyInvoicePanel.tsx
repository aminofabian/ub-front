"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, FileEdit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchPathBSupplyInvoiceDetail,
  type PathBSupplyInvoiceDetailRecord,
  type PathBSupplyListRowRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { EditSupplyBillDrawer } from "../../supplies/_components/edit-supply-bill-drawer";
import { PaySupplyDrawer } from "../../supplies/_components/pay-supply-drawer";
import {
  formatSupplyMoney,
  supplyN,
  supplyPaymentStatusBadge,
} from "../../supplies/_components/supplies-shared";
import { SupLoadingBlock } from "./supplier-layout-primitives";
import { supTableHead, supTableRow } from "./supplier-ui-tokens";

function formatShortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function toListRow(d: PathBSupplyInvoiceDetailRecord): PathBSupplyListRowRecord {
  return {
    supplierInvoiceId: d.supplierInvoiceId,
    supplierId: d.supplierId,
    supplierName: d.supplierName,
    invoiceNumber: d.invoiceNumber,
    createdAt: d.createdAt,
    lineCount: d.lines.length,
    grandTotal: d.grandTotal,
    amountPaid: d.amountPaid,
    balanceOpen: d.balanceOpen,
    paymentStatus: d.paymentStatus,
  };
}

export function SupplierSupplyInvoicePanel({
  invoiceId,
  onUpdated,
}: {
  invoiceId: string | null;
  onUpdated?: () => void;
}) {
  const { me } = useDashboard();
  const canPathBWrite = hasPermission(me?.permissions, Permission.PurchasingPathBWrite);
  const canPay = hasPermission(me?.permissions, Permission.PurchasingPaymentWrite);
  const canPaymentRead = hasPermission(me?.permissions, Permission.PurchasingPaymentRead);
  const canOpenReceipt = canPay || canPaymentRead;

  const [detail, setDetail] = useState<PathBSupplyInvoiceDetailRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchPathBSupplyInvoiceDetail(id));
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "Could not load supply bill.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!invoiceId?.trim()) {
      setDetail(null);
      setError(null);
      return;
    }
    setDetail(null);
    void load(invoiceId);
  }, [invoiceId, load]);

  const listRow = useMemo(() => (detail ? toListRow(detail) : null), [detail]);
  const balance = detail ? supplyN(detail.balanceOpen) : 0;
  const statusBadge = detail ? supplyPaymentStatusBadge(detail.paymentStatus) : null;

  if (!invoiceId) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Select an invoice from purchase history.
      </p>
    );
  }

  if (loading && !detail) {
    return <SupLoadingBlock label="Loading supply bill…" className="py-10" />;
  }

  if (error && !detail) {
    return <p className="py-6 text-center text-xs text-destructive">{error}</p>;
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
      <div className="shrink-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusBadge ? (
            <span
              className={cn(
                "inline-flex rounded-md border px-1.5 py-px text-xs font-semibold uppercase tracking-wide",
                statusBadge.className,
              )}
            >
              {statusBadge.label}
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatShortDate(detail.invoiceDate)}
            {detail.dueDate ? ` · Due ${formatShortDate(detail.dueDate)}` : null}
          </span>
        </div>
        <dl className="divide-y divide-border/40 rounded-md border border-border/50 text-sm">
          <div className="flex justify-between gap-2 px-2 py-1">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-mono font-semibold tabular-nums">
              {formatSupplyMoney(supplyN(detail.grandTotal))}
            </dd>
          </div>
          <div className="flex justify-between gap-2 px-2 py-1">
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="font-mono tabular-nums text-primary">
              {formatSupplyMoney(supplyN(detail.amountPaid))}
            </dd>
          </div>
          <div className="flex justify-between gap-2 px-2 py-1">
            <dt className="text-muted-foreground">Open</dt>
            <dd
              className={cn(
                "font-mono font-semibold tabular-nums",
                balance > 0.009 ? "text-primary font-semibold" : "",
              )}
            >
              {formatSupplyMoney(balance)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/50">
        <div className="shrink-0 border-b border-border/45 bg-muted/30 px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Lines ({detail.lines.length})
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <table className="w-full text-left text-sm">
            <thead className={cn("sticky top-0 z-10", supTableHead)}>
              <tr>
                <th className="px-2 py-1 font-semibold">Item</th>
                <th className="px-2 py-1 text-right font-semibold">Qty</th>
                <th className="px-2 py-1 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((ln) => (
                <tr key={ln.id} className={supTableRow}>
                  <td className="px-2 py-1">
                    <p className="font-medium leading-snug text-foreground">{ln.description}</p>
                    {supplyN(ln.wastageQty) > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Wastage {formatSupplyMoney(supplyN(ln.wastageQty))}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-right font-mono tabular-nums">
                    {formatSupplyMoney(supplyN(ln.usableQty))}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-right font-mono font-medium tabular-nums">
                    {formatSupplyMoney(supplyN(ln.lineTotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail.notes?.trim() ? (
        <p className="shrink-0 rounded-md border border-border/45 bg-muted/15 px-2 py-1.5 text-xs text-muted-foreground">
          {detail.notes.trim()}
        </p>
      ) : null}

      <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-border/40 pt-1.5">
        {canOpenReceipt && listRow ? (
          <Button
            type="button"
            size="sm"
            variant={balance > 0.009 && canPay ? "default" : "outline"}
            className="h-7 gap-1 rounded-md text-xs"
            onClick={() => setPayOpen(true)}
          >
            <CreditCard className="size-3" aria-hidden />
            {balance > 0.009 && canPay ? "Pay" : "Payment"}
          </Button>
        ) : null}
        {canPathBWrite && listRow ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 rounded-md text-xs"
            onClick={() => setEditOpen(true)}
          >
            <FileEdit className="size-3" aria-hidden />
            Edit
          </Button>
        ) : null}
      </div>

      {listRow ? (
        <>
          <PaySupplyDrawer
            open={payOpen}
            onOpenChange={setPayOpen}
            row={listRow}
            onPaid={() => {
              void load(invoiceId);
              onUpdated?.();
            }}
          />
          <EditSupplyBillDrawer
            open={editOpen}
            onOpenChange={setEditOpen}
            row={listRow}
            onSaved={() => {
              void load(invoiceId);
              onUpdated?.();
            }}
          />
        </>
      ) : null}
    </div>
  );
}
