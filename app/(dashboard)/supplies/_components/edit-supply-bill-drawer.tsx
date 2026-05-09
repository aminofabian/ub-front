"use client";

import { useEffect, useMemo, useState } from "react";
import { FileEdit, Loader2 } from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchPathBSupplyInvoiceDetail,
  patchPathBSupplyInvoice,
  type PathBSupplyInvoiceDetailRecord,
  type PathBSupplyListRowRecord,
  type PatchPathBSupplyInvoiceLinePayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

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

type LineForm = {
  supplierInvoiceLineId: string;
  description: string;
  usableQtyStr: string;
  wastageQtyStr: string;
  lineTotalStr: string;
};

type EditSupplyBillDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PathBSupplyListRowRecord | null;
  onSaved: () => void;
};

export function EditSupplyBillDrawer({ open, onOpenChange, row, onSaved }: EditSupplyBillDrawerProps) {
  const [detail, setDetail] = useState<PathBSupplyInvoiceDetailRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineForms, setLineForms] = useState<LineForm[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEditLines = useMemo(
    () => (detail ? n(detail.amountPaid) < 0.005 : false),
    [detail],
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset when drawer target changes */
    if (!open || !row) {
      setDetail(null);
      setLoadError(null);
      setLoading(false);
      setInvoiceNumber("");
      setInvoiceDate("");
      setDueDate("");
      setNotes("");
      setLineForms([]);
      setSaveError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    void fetchPathBSupplyInvoiceDetail(row.supplierInvoiceId)
      .then((d) => {
        setDetail(d);
        setInvoiceNumber(d.invoiceNumber);
        setInvoiceDate(d.invoiceDate);
        setDueDate(d.dueDate ?? "");
        setNotes(d.notes ?? "");
        setLineForms(
          d.lines.map((ln) => ({
            supplierInvoiceLineId: ln.id,
            description: ln.description,
            usableQtyStr: String(n(ln.usableQty)),
            wastageQtyStr: String(n(ln.wastageQty)),
            lineTotalStr: String(n(ln.lineTotal)),
          })),
        );
      })
      .catch((e) => {
        setDetail(null);
        setLineForms([]);
        setLoadError(e instanceof Error ? e.message : "Could not load bill.");
      })
      .finally(() => setLoading(false));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, row]);

  const onSave = async () => {
    if (!row || !detail) {
      return;
    }
    setSaveError(null);
    const invTrim = invoiceNumber.trim();
    if (!invTrim) {
      setSaveError("Invoice number is required.");
      return;
    }
    if (!invoiceDate.trim()) {
      setSaveError("Invoice date is required.");
      return;
    }
    let linesPayload: PatchPathBSupplyInvoiceLinePayload[] | undefined;
    if (canEditLines) {
      const built: PatchPathBSupplyInvoiceLinePayload[] = [];
      for (const f of lineForms) {
        const usable = Number(f.usableQtyStr);
        const wastage = Number(f.wastageQtyStr);
        const lineTotal = Number(f.lineTotalStr);
        if (!Number.isFinite(usable) || usable < 0) {
          setSaveError("Each line needs valid usable quantity (0 or more).");
          return;
        }
        if (!Number.isFinite(wastage) || wastage < 0) {
          setSaveError("Each line needs valid wastage quantity (0 or more).");
          return;
        }
        if (usable <= 0 && wastage <= 0) {
          setSaveError("Each line needs at least some usable or wastage quantity.");
          return;
        }
        if (!Number.isFinite(lineTotal) || lineTotal < 0.01) {
          setSaveError("Each line total must be at least 0.01.");
          return;
        }
        built.push({
          supplierInvoiceLineId: f.supplierInvoiceLineId,
          usableQty: usable,
          wastageQty: wastage,
          lineTotal,
          description: f.description.trim() || null,
        });
      }
      if (built.length !== detail.lines.length) {
        setSaveError("Line count mismatch — refresh and try again.");
        return;
      }
      linesPayload = built;
    }
    setBusy(true);
    try {
      await patchPathBSupplyInvoice(row.supplierInvoiceId, {
        invoiceNumber: invTrim,
        invoiceDate: invoiceDate.trim(),
        dueDate: dueDate.trim() ? dueDate.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
        lines: linesPayload,
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const billErrorText = [loadError, saveError].filter(Boolean).join("\n\n");

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={row ? `Edit bill · ${row.invoiceNumber}` : "Edit bill"}
      description="Invoice reference fields always editable. Quantity splits and line totals can be changed only while the bill has no supplier payments — stock and the Path B journal are rebuilt to match."
      width="extraWide"
      icon={<FileEdit className="size-5 text-primary" aria-hidden />}
      banner={billErrorText ? <FormDrawerMessageBanner text={billErrorText} /> : undefined}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={busy || loading || !detail || !row}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-5 px-1 pb-4">

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading bill…
          </div>
        ) : null}

        {!loading && detail ? (
          <>
            <div className="grid gap-3 rounded-xl border bg-muted/15 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Supplier</p>
                <p className="text-sm font-semibold">{detail.supplierName || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total</p>
                <p className="font-mono text-sm font-semibold tabular-nums">{formatMoney(n(detail.grandTotal))}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Paid / balance</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  Paid {formatMoney(n(detail.amountPaid))} · Open {formatMoney(n(detail.balanceOpen))}
                </p>
              </div>
            </div>

            {!canEditLines ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                This bill has supplier payments recorded. You can still edit invoice number, dates, and notes — line
                quantities and amounts are locked.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Invoice number</span>
                <input
                  className={dashboardInputClass(busy)}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={dashboardLabelClass()}>Invoice date</span>
                <input
                  type="date"
                  className={dashboardInputClass(busy)}
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={dashboardLabelClass()}>Due date (optional)</span>
                <input
                  type="date"
                  className={dashboardInputClass(busy)}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={dashboardLabelClass()}>Notes (optional)</span>
                <textarea
                  className={dashboardTextareaClass(busy)}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Receiving lines</h3>
              <p className={cn(dashboardHintClass(), "mb-2")}>
                {canEditLines
                  ? "Usable and wastage split drives how much enters stock versus shrinkage. Line total is the supplier amount for that row; unit cost is derived as line total ÷ (usable + wastage)."
                  : "Line economics are fixed while payments exist."}
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                  <thead className="bg-muted/80 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Usable</th>
                      <th className="px-3 py-2 text-right">Wastage</th>
                      <th className="px-3 py-2 text-right">Line total</th>
                      <th className="px-3 py-2 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((ln) => {
                      const f = lineForms.find((x) => x.supplierInvoiceLineId === ln.id);
                      const u = f ? Number(f.usableQtyStr) : 0;
                      const w = f ? Number(f.wastageQtyStr) : 0;
                      const lt = f ? Number(f.lineTotalStr) : 0;
                      const den = Number.isFinite(u) && Number.isFinite(w) ? u + w : 0;
                      const unit = den > 0 && Number.isFinite(lt) ? lt / den : n(ln.unitCost);
                      return (
                        <tr key={ln.id} className="border-t align-top">
                          <td className="px-3 py-2">
                            {canEditLines && f ? (
                              <textarea
                                className={cn(dashboardTextareaClass(busy), "min-h-[2.5rem] text-xs")}
                                rows={2}
                                value={f.description}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id ? { ...row, description: v } : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="text-muted-foreground">{ln.description}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(dashboardInputClass(busy), "w-20 text-right font-mono text-xs")}
                                value={f.usableQtyStr}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id ? { ...row, usableQtyStr: v } : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums">{String(n(ln.usableQty))}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(dashboardInputClass(busy), "w-20 text-right font-mono text-xs")}
                                value={f.wastageQtyStr}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id ? { ...row, wastageQtyStr: v } : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums">{String(n(ln.wastageQty))}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(dashboardInputClass(busy), "w-24 text-right font-mono text-xs")}
                                value={f.lineTotalStr}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id ? { ...row, lineTotalStr: v } : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="font-mono tabular-nums">{formatMoney(n(ln.lineTotal))}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {den > 0 && Number.isFinite(unit) ? unit.toFixed(4) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </FormDrawer>
  );
}
