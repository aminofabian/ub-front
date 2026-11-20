"use client";

import { SearchCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  RX_INK,
  RX_META,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  errorText,
  formatDate,
  formatDateTime,
  formatQty,
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, EmptyState, Figure, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { fetchRecall, quarantineLot, type RecallReport } from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

export function PharmacyRecall({ onChanged }: { onChanged: () => void }) {
  const [lot, setLot] = useState("");
  const [report, setReport] = useState<RecallReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const trace = async (value: string) => {
    const wanted = value.trim();
    if (!wanted) {
      setError("Enter the lot number from the recall notice.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setReport(await fetchRecall(wanted));
    } catch (err) {
      setReport(null);
      setError(errorText(err, "Could not trace that lot."));
    } finally {
      setLoading(false);
    }
  };

  const pull = async () => {
    if (!report) return;
    if (!reason.trim()) {
      setError("Say who issued the recall or why.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await quarantineLot({ lotNumber: report.lotNumber, reason: reason.trim() });
      toast.success(
        res.quarantinedBatchIds.length === 0
          ? "Nothing was on sale for this lot"
          : `${res.quarantinedBatchIds.length} ${res.quarantinedBatchIds.length === 1 ? "batch" : "batches"} taken off sale`,
      );
      setReason("");
      onChanged();
      await trace(report.lotNumber);
    } catch (err) {
      setError(errorText(err, "Could not quarantine the lot."));
    } finally {
      setBusy(false);
    }
  };

  const onSale = report?.batches.filter((b) => b.status === "active" && b.quantityRemaining > 0) ?? [];

  return (
    <>
      <Panel
        title="Trace a lot"
        description="Enter the manufacturer's lot number from a recall notice to see what is left and who bought it."
      >
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void trace(lot);
          }}
        >
          <Field label="Lot number" className="min-w-[14rem] flex-1">
            <input className={cn(RX_INPUT, "font-mono")} value={lot} onChange={(e) => setLot(e.target.value)} maxLength={64} autoComplete="off" />
          </Field>
          <Button type="submit" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={loading}>
            {loading ? "Tracing…" : "Trace"}
          </Button>
        </form>
        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      </Panel>

      {report && report.batches.length === 0 ? (
        <Panel>
          <EmptyState
            icon={SearchCheck}
            title={`No stock was ever received with lot ${report.lotNumber}`}
            body="Check the number against the pack. Stock received before lot numbers were recorded will not show here; look under Stock safety, Missing lot or expiry."
          />
        </Panel>
      ) : null}

      {report && report.batches.length > 0 ? (
        <>
          <Panel title={`Lot ${report.lotNumber}`}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Figure label="Still on sale" value={formatQty(report.quantityOnSale)} tone={report.quantityOnSale > 0 ? "warn" : undefined} />
              <Figure label="Quarantined" value={formatQty(report.quantityQuarantined)} />
              <Figure label="Till sales" value={report.sales.length} />
              <Figure label="Online orders" value={report.onlineOrders.length} />
            </div>
            {onSale.length > 0 ? (
              <div className={cn("mt-4 flex flex-wrap items-end gap-2 border-t pt-4", RX_RULE)}>
                <Field label="Recall reason" className="min-w-[14rem] flex-1">
                  <input
                    className={RX_INPUT}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={180}
                    placeholder="e.g. Supplier notice of 12 March"
                  />
                </Field>
                <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => void pull()}>
                  Take {onSale.length} {onSale.length === 1 ? "batch" : "batches"} off sale
                </Button>
              </div>
            ) : (
              <p className={cn("mt-4 border-t pt-3 text-[13px]", RX_RULE, RX_MUTED)}>Nothing from this lot is on sale.</p>
            )}
            {report.truncated ? (
              <p className="mt-2 text-[13px] text-[#8A4129]">This lot has more history than is shown here.</p>
            ) : null}
          </Panel>

          <Panel title="Where the stock is" flush>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className={cn("border-b", RX_RULE)}>
                    <th className={RX_TH}>Product</th>
                    <th className={RX_TH}>Branch</th>
                    <th className={RX_TH}>Expiry</th>
                    <th className={cn(RX_TH, "text-right")}>Left</th>
                    <th className={RX_TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.batches.map((b) => (
                    <tr key={b.batchId} className={RX_ROW}>
                      <td className={cn(RX_TD, "font-medium", RX_INK)}>{b.itemName}</td>
                      <td className={cn(RX_TD, RX_MUTED)}>{b.branchName ?? ""}</td>
                      <td className={RX_TD}>{formatDate(b.expiryDate) || "None"}</td>
                      <td className={cn(RX_TD, "text-right font-mono tabular-nums")}>{formatQty(b.quantityRemaining)}</td>
                      <td className={RX_TD}>
                        <Chip tone={b.status === "quarantined" ? "live" : b.status === "active" && b.quantityRemaining > 0 ? "warn" : "quiet"}>
                          {b.status === "quarantined" ? "Quarantined" : b.status === "active" && b.quantityRemaining > 0 ? "On sale" : "Sold out"}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="Who bought it"
            description="Sales at the till that drew on this lot. A customer shows only when one was attached to the sale."
            flush
          >
            {report.sales.length === 0 ? (
              <p className={cn("px-4 py-4 text-sm", RX_MUTED)}>No till sales used this lot.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr className={cn("border-b", RX_RULE)}>
                      <th className={RX_TH}>Receipt</th>
                      <th className={RX_TH}>When</th>
                      <th className={RX_TH}>Product</th>
                      <th className={cn(RX_TH, "text-right")}>Qty</th>
                      <th className={RX_TH}>Customer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sales.map((s, i) => (
                      <tr key={`${s.saleId}-${i}`} className={RX_ROW}>
                        <td className={cn(RX_TD, "font-mono")}>
                          {s.receiptNo != null ? `#${s.receiptNo}` : s.saleId.slice(0, 8)}
                          {s.saleStatus && s.saleStatus.toLowerCase() !== "completed" ? (
                            <span className={cn("ml-2 font-sans text-[12px]", RX_MUTED)}>{s.saleStatus.toLowerCase()}</span>
                          ) : null}
                        </td>
                        <td className={cn(RX_TD, RX_META)}>{formatDateTime(s.soldAt)}</td>
                        <td className={RX_TD}>{s.itemName ?? ""}</td>
                        <td className={cn(RX_TD, "text-right font-mono tabular-nums")}>{formatQty(s.quantity)}</td>
                        <td className={RX_TD}>{s.customerName ?? <span className={RX_MUTED}>Walk-in</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {report.onlineOrders.length > 0 ? (
            <Panel title="Online orders" flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr className={cn("border-b", RX_RULE)}>
                      <th className={RX_TH}>When</th>
                      <th className={RX_TH}>Product</th>
                      <th className={cn(RX_TH, "text-right")}>Qty</th>
                      <th className={RX_TH}>Customer</th>
                      <th className={RX_TH}>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.onlineOrders.map((o, i) => (
                      <tr key={`${o.orderId}-${i}`} className={RX_ROW}>
                        <td className={cn(RX_TD, RX_META)}>{formatDateTime(o.at)}</td>
                        <td className={RX_TD}>{o.itemName ?? ""}</td>
                        <td className={cn(RX_TD, "text-right font-mono tabular-nums")}>{formatQty(o.quantity)}</td>
                        <td className={RX_TD}>{o.customerName ?? ""}</td>
                        <td className={cn(RX_TD, "font-mono")}>{o.customerPhone ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}
    </>
  );
}
