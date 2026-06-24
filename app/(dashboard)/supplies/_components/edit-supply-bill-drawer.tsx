"use client";

import { useEffect, useMemo, useState } from "react";
import { FileEdit } from "lucide-react";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import {
  fetchPathBSupplyInvoiceDetail,
  patchPathBSupplyInvoice,
  type PathBSupplyInvoiceDetailRecord,
  type PathBSupplyListRowRecord,
  type PatchPathBSupplyInvoiceLinePayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  SupDrawerFooter,
  SupLoadingBlock,
  SupSection,
} from "../../suppliers/_components/supplier-layout-primitives";
import {
  supCardInset,
  supFieldLabel,
  supInput,
  supStatTile,
  supTableHead,
  supTableRow,
  supTextarea,
} from "../../suppliers/_components/supplier-ui-tokens";
import { formatSupplyMoney, supplyN } from "./supplies-shared";

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
    () => (detail ? supplyN(detail.amountPaid) < 0.005 : false),
    [detail],
  );

  useEffect(() => {
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
            usableQtyStr: String(supplyN(ln.usableQty)),
            wastageQtyStr: String(supplyN(ln.wastageQty)),
            lineTotalStr: String(supplyN(ln.lineTotal)),
          })),
        );
      })
      .catch((e) => {
        setDetail(null);
        setLineForms([]);
        setLoadError(e instanceof Error ? e.message : "Could not load bill.");
      })
      .finally(() => setLoading(false));
  }, [open, row]);

  const onSave = async () => {
    if (!row || !detail) return;
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
      title={row ? `Manage supply · ${row.invoiceNumber}` : "Manage supply"}
      description="Update invoice details and receiving lines. Quantities and line totals lock after any supplier payment is recorded."
      contextLabel="Supply bill"
      width="extraWide"
      icon={<FileEdit className="size-5 text-primary" aria-hidden />}
      banner={billErrorText ? <FormDrawerMessageBanner text={billErrorText} /> : undefined}
      footer={
        <SupDrawerFooter
          onCancel={() => onOpenChange(false)}
          submitLabel="Save changes"
          submitForm="edit-supply-bill-form"
          submitDisabled={busy || loading || !detail || !row}
        />
      }
    >
      <form
        id="edit-supply-bill-form"
        className="space-y-5 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        {loading ? <SupLoadingBlock label="Loading bill…" /> : null}

        {!loading && detail ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className={supStatTile}>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Supplier
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {detail.supplierName || "—"}
                </span>
              </div>
              <div className={supStatTile}>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Invoice total
                </span>
                <span className="mt-1 block font-mono text-sm font-semibold tabular-nums">
                  {formatSupplyMoney(supplyN(detail.grandTotal))}
                </span>
              </div>
              <div className={supStatTile}>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Paid / open
                </span>
                <span className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground">
                  {formatSupplyMoney(supplyN(detail.amountPaid))} paid ·{" "}
                  <span className="font-semibold text-foreground">
                    {formatSupplyMoney(supplyN(detail.balanceOpen))} open
                  </span>
                </span>
              </div>
            </div>

            {!canEditLines ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3.5 py-2.5 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                This bill has supplier payments. You can still edit invoice number,
                dates, and notes — line quantities and amounts are locked.
              </div>
            ) : null}

            <SupSection
              title="Invoice details"
              hint="Reference fields sent to accounts payable."
              bodyClassName="p-4 sm:p-5"
            >
              <div className={cn(supCardInset, "grid gap-3 p-4 sm:grid-cols-2")}>
                <label className="flex flex-col gap-1.5">
                  <span className={supFieldLabel}>Invoice number</span>
                  <input
                    className={supInput}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={supFieldLabel}>Invoice date</span>
                  <input
                    type="date"
                    className={supInput}
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={supFieldLabel}>Due date (optional)</span>
                  <input
                    type="date"
                    className={supInput}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={supFieldLabel}>Notes (optional)</span>
                  <textarea
                    className={supTextarea}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
            </SupSection>

            <SupSection
              title="Receiving lines"
              hint={
                canEditLines
                  ? "Usable vs wastage drives stock vs shrinkage. Unit cost = line total ÷ (usable + wastage)."
                  : "Line economics are fixed while payments exist."
              }
              bodyClassName="p-0 sm:p-0"
            >
              <div className="overflow-x-auto border-t border-border/45">
                <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                  <thead className={supTableHead}>
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Description</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Usable</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Wastage</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Line total</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((ln) => {
                      const f = lineForms.find((x) => x.supplierInvoiceLineId === ln.id);
                      const u = f ? Number(f.usableQtyStr) : 0;
                      const w = f ? Number(f.wastageQtyStr) : 0;
                      const lt = f ? Number(f.lineTotalStr) : 0;
                      const den = Number.isFinite(u) && Number.isFinite(w) ? u + w : 0;
                      const unit = den > 0 && Number.isFinite(lt) ? lt / den : supplyN(ln.unitCost);
                      return (
                        <tr key={ln.id} className={cn(supTableRow, "align-top")}>
                          <td className="px-3 py-2.5">
                            {canEditLines && f ? (
                              <textarea
                                className={cn(supTextarea, "min-h-[2.5rem] text-xs")}
                                rows={2}
                                value={f.description}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id
                                        ? { ...row, description: v }
                                        : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="text-muted-foreground">{ln.description}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(supInput, "w-20 text-right font-mono text-xs")}
                                value={f.usableQtyStr}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id
                                        ? { ...row, usableQtyStr: v }
                                        : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums">
                                {String(supplyN(ln.usableQty))}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(supInput, "w-20 text-right font-mono text-xs")}
                                value={f.wastageQtyStr}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id
                                        ? { ...row, wastageQtyStr: v }
                                        : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums">
                                {String(supplyN(ln.wastageQty))}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(supInput, "w-24 text-right font-mono text-xs")}
                                value={f.lineTotalStr}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLineForms((prev) =>
                                    prev.map((row) =>
                                      row.supplierInvoiceLineId === ln.id
                                        ? { ...row, lineTotalStr: v }
                                        : row,
                                    ),
                                  );
                                }}
                                disabled={busy}
                              />
                            ) : (
                              <span className="font-mono tabular-nums">
                                {formatSupplyMoney(supplyN(ln.lineTotal))}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {den > 0 && Number.isFinite(unit) ? unit.toFixed(4) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SupSection>
          </>
        ) : null}
      </form>
    </FormDrawer>
  );
}
