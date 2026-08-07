"use client";

import { useEffect, useMemo, useState } from "react";
import { FileEdit } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import {
  addSupplyBatchExpense,
  deleteSupplyBatchExpense,
  fetchCurrentSellingPrice,
  fetchPathBSupplyInvoiceDetail,
  patchPathBSupplyInvoice,
  postSellingPrice,
  type PathBSupplyListRowRecord,
  type PatchPathBSupplyInvoiceLinePayload,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
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
import {
  ExtraCostsBody,
  type ExtraRow,
} from "./extra-costs-section";
import { formatSupplyMoney, supplyN } from "./supplies-shared";

type LineForm = {
  supplierInvoiceLineId: string;
  itemId: string | null;
  description: string;
  usableQtyStr: string;
  wastageQtyStr: string;
  buyingPriceStr: string;
  sellPriceStr: string;
  sellPriceTouched: boolean;
  initialSellPrice: number | null;
};

type EditSupplyBillDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PathBSupplyListRowRecord | null;
  onSaved: () => void;
};

function parseNonNeg(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function lineTotalFrom(usable: number, wastage: number, buying: number): number {
  return roundMoney2((usable + wastage) * buying);
}

export function EditSupplyBillDrawer({
  open,
  onOpenChange,
  row,
  onSaved,
}: EditSupplyBillDrawerProps) {
  const { me } = useDashboard();
  const canSetSellPrice = hasPermission(
    me?.permissions,
    Permission.PricingSellPriceSet,
  );
  const canEditExtras = hasPermission(
    me?.permissions,
    Permission.InventoryWrite,
  );

  const [detail, setDetail] = useState<
    Awaited<ReturnType<typeof fetchPathBSupplyInvoiceDetail>> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineForms, setLineForms] = useState<LineForm[]>([]);
  const [extras, setExtras] = useState<ExtraRow[]>([]);
  const [initialExpenseIds, setInitialExpenseIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEditLines = useMemo(
    () => (detail ? supplyN(detail.amountPaid) < 0.005 : false),
    [detail],
  );

  const supplyBatchId = detail?.supplyBatchId?.trim() || "";
  const branchId =
    detail?.branchId?.trim() || row?.branchId?.trim() || "";

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
      setExtras([]);
      setInitialExpenseIds([]);
      setSaveError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    void fetchPathBSupplyInvoiceDetail(row.supplierInvoiceId)
      .then(async (d) => {
        setDetail(d);
        setInvoiceNumber(d.invoiceNumber);
        setInvoiceDate(d.invoiceDate);
        setDueDate(d.dueDate ?? "");
        setNotes(d.notes ?? "");

        const bid = d.branchId?.trim() || row.branchId?.trim() || "";
        const sellByItem = new Map<string, number | null>();
        const itemIds = [
          ...new Set(
            d.lines
              .map((ln) => ln.itemId?.trim())
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        await Promise.all(
          itemIds.map(async (itemId) => {
            try {
              const cur = await fetchCurrentSellingPrice(itemId, bid || undefined, {
                toast: false,
              });
              const price = cur.price == null ? null : supplyN(cur.price);
              sellByItem.set(
                itemId,
                price != null && Number.isFinite(price) && price >= 0
                  ? price
                  : null,
              );
            } catch {
              sellByItem.set(itemId, null);
            }
          }),
        );

        setLineForms(
          d.lines.map((ln) => {
            const itemId = ln.itemId?.trim() || null;
            const sell =
              itemId && sellByItem.has(itemId)
                ? sellByItem.get(itemId) ?? null
                : null;
            return {
              supplierInvoiceLineId: ln.id,
              itemId,
              description: ln.description,
              usableQtyStr: String(supplyN(ln.usableQty)),
              wastageQtyStr: String(supplyN(ln.wastageQty)),
              buyingPriceStr: String(supplyN(ln.unitCost)),
              sellPriceStr: sell != null ? String(sell) : "",
              sellPriceTouched: false,
              initialSellPrice: sell,
            };
          }),
        );

        const expenseRows = d.expenses ?? [];
        setInitialExpenseIds(expenseRows.map((e) => e.id));
        setExtras(
          expenseRows.map((e) => ({
            key: e.id,
            category: e.category,
            amount: String(supplyN(e.amount)),
            desc: e.description ?? "",
          })),
        );
      })
      .catch((e) => {
        setDetail(null);
        setLineForms([]);
        setExtras([]);
        setInitialExpenseIds([]);
        setLoadError(e instanceof Error ? e.message : "Could not load bill.");
      })
      .finally(() => setLoading(false));
  }, [open, row]);

  const patchLineForm = (
    lineId: string,
    patch: Partial<LineForm>,
  ) => {
    setLineForms((prev) =>
      prev.map((r) =>
        r.supplierInvoiceLineId === lineId ? { ...r, ...patch } : r,
      ),
    );
  };

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
        const buying = Number(f.buyingPriceStr);
        if (!Number.isFinite(usable) || usable < 0) {
          setSaveError("Each line needs a valid quantity (0 or more).");
          return;
        }
        if (!Number.isFinite(wastage) || wastage < 0) {
          setSaveError("Each line needs valid wastage (0 or more).");
          return;
        }
        if (usable <= 0 && wastage <= 0) {
          setSaveError("Each line needs at least some quantity or wastage.");
          return;
        }
        if (!Number.isFinite(buying) || buying < 0) {
          setSaveError("Each line needs a valid buying price (0 or more).");
          return;
        }
        const lineTotal = lineTotalFrom(usable, wastage, buying);
        if (lineTotal < 0.01) {
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

    if (canEditExtras && supplyBatchId) {
      for (const e of extras) {
        const amount = parseNonNeg(e.amount);
        const hasAmount = amount != null && amount > 0;
        const hasCat = Boolean(e.category.trim());
        if (hasAmount && !hasCat) {
          setSaveError("Each extra cost needs a category.");
          return;
        }
        if (hasCat && !hasAmount) {
          setSaveError("Each extra cost needs an amount greater than 0.");
          return;
        }
      }
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

      const priceErrors: string[] = [];
      if (canSetSellPrice && branchId) {
        for (const f of lineForms) {
          if (!f.itemId || !f.sellPriceTouched) continue;
          const parsed = parseNonNeg(f.sellPriceStr);
          if (parsed == null) continue;
          if (
            f.initialSellPrice != null &&
            Math.abs(f.initialSellPrice - parsed) < 0.005
          ) {
            continue;
          }
          try {
            await postSellingPrice({
              itemId: f.itemId,
              branchId,
              price: parsed,
              effectiveFrom: invoiceDate.trim(),
              notes: `Retail after supply edit (${detail.supplierName})`,
            });
          } catch (pe) {
            const msg = pe instanceof Error ? pe.message : "";
            if (
              !msg.toLowerCase().includes("conflict") &&
              !msg.toLowerCase().includes("already starts")
            ) {
              priceErrors.push(
                `${f.description.trim() || f.itemId}: ${msg || "price update failed"}`,
              );
            }
          }
        }
      }

      if (canEditExtras && supplyBatchId) {
        const keptIds = new Set(
          extras
            .map((e) => e.key)
            .filter((k) => initialExpenseIds.includes(k)),
        );
        for (const id of initialExpenseIds) {
          if (!keptIds.has(id)) {
            await deleteSupplyBatchExpense(supplyBatchId, id);
          }
        }
        for (const e of extras) {
          const amount = parseNonNeg(e.amount);
          if (amount == null || amount <= 0 || !e.category.trim()) continue;
          const isExisting = initialExpenseIds.includes(e.key);
          if (isExisting) {
            const original = (detail.expenses ?? []).find((x) => x.id === e.key);
            const same =
              original &&
              original.category === e.category.trim() &&
              Math.abs(supplyN(original.amount) - amount) < 0.005 &&
              (original.description ?? "") === (e.desc.trim() || "");
            if (same) continue;
            await deleteSupplyBatchExpense(supplyBatchId, e.key);
          }
          await addSupplyBatchExpense(supplyBatchId, {
            category: e.category.trim(),
            amount,
            description: e.desc.trim() || null,
          });
        }
      }

      onSaved();
      if (priceErrors.length > 0) {
        setSaveError(
          `Bill saved, but shelf price could not be updated for: ${priceErrors.join("; ")}`,
        );
        return;
      }
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
      title={row ? `Edit supply · ${row.invoiceNumber}` : "Edit supply"}
      description="Update invoice details, quantities, buying and selling prices, and extra costs. Quantities and buying prices lock after any supplier payment."
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
                This bill has supplier payments. Quantity and buying price are
                locked — you can still edit invoice details, selling prices, and
                extra costs.
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
                  ? "Edit quantity and buying price. Line total = (qty + wastage) × buying. Selling price updates the shelf price."
                  : "Quantity and buying price are fixed while payments exist. Selling price can still be updated."
              }
              bodyClassName="p-0 sm:p-0"
            >
              <div className="overflow-x-auto border-t border-border/45">
                <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
                  <thead className={supTableHead}>
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Description</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Wastage
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Buying
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Selling
                      </th>
                      <th className="px-3 py-2.5 text-right font-semibold">
                        Line total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((ln) => {
                      const f = lineForms.find(
                        (x) => x.supplierInvoiceLineId === ln.id,
                      );
                      const u = f ? Number(f.usableQtyStr) : supplyN(ln.usableQty);
                      const w = f
                        ? Number(f.wastageQtyStr)
                        : supplyN(ln.wastageQty);
                      const buying = f
                        ? Number(f.buyingPriceStr)
                        : supplyN(ln.unitCost);
                      const lt =
                        Number.isFinite(u) &&
                        Number.isFinite(w) &&
                        Number.isFinite(buying)
                          ? lineTotalFrom(u, w, buying)
                          : supplyN(ln.lineTotal);
                      const sellDisabled =
                        busy ||
                        !canSetSellPrice ||
                        !f?.itemId ||
                        !branchId;
                      return (
                        <tr key={ln.id} className={cn(supTableRow, "align-top")}>
                          <td className="px-3 py-2.5">
                            {canEditLines && f ? (
                              <textarea
                                className={cn(supTextarea, "min-h-[2.5rem] text-xs")}
                                rows={2}
                                value={f.description}
                                onChange={(e) =>
                                  patchLineForm(ln.id, {
                                    description: e.target.value,
                                  })
                                }
                                disabled={busy}
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {ln.description}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {canEditLines && f ? (
                              <input
                                className={cn(
                                  supInput,
                                  "w-20 text-right font-mono text-xs",
                                )}
                                inputMode="decimal"
                                value={f.usableQtyStr}
                                onChange={(e) =>
                                  patchLineForm(ln.id, {
                                    usableQtyStr: e.target.value,
                                  })
                                }
                                disabled={busy}
                                aria-label={`Quantity for ${ln.description}`}
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
                                className={cn(
                                  supInput,
                                  "w-16 text-right font-mono text-xs",
                                )}
                                inputMode="decimal"
                                value={f.wastageQtyStr}
                                onChange={(e) =>
                                  patchLineForm(ln.id, {
                                    wastageQtyStr: e.target.value,
                                  })
                                }
                                disabled={busy}
                                aria-label={`Wastage for ${ln.description}`}
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
                                className={cn(
                                  supInput,
                                  "w-24 text-right font-mono text-xs",
                                )}
                                inputMode="decimal"
                                value={f.buyingPriceStr}
                                onChange={(e) =>
                                  patchLineForm(ln.id, {
                                    buyingPriceStr: e.target.value,
                                  })
                                }
                                disabled={busy}
                                aria-label={`Buying price for ${ln.description}`}
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums">
                                {supplyN(ln.unitCost).toFixed(4)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {f ? (
                              <input
                                className={cn(
                                  supInput,
                                  "w-24 text-right font-mono text-xs",
                                  sellDisabled && "opacity-70",
                                )}
                                inputMode="decimal"
                                value={f.sellPriceStr}
                                onChange={(e) =>
                                  patchLineForm(ln.id, {
                                    sellPriceStr: e.target.value,
                                    sellPriceTouched: true,
                                  })
                                }
                                disabled={sellDisabled}
                                placeholder={
                                  !f.itemId
                                    ? "—"
                                    : !canSetSellPrice
                                      ? "No access"
                                      : "0.00"
                                }
                                aria-label={`Selling price for ${ln.description}`}
                                title={
                                  !f.itemId
                                    ? "No catalog item linked"
                                    : !canSetSellPrice
                                      ? "You do not have permission to set selling prices"
                                      : !branchId
                                        ? "Branch missing — cannot update shelf price"
                                        : undefined
                                }
                              />
                            ) : (
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {Number.isFinite(lt)
                              ? formatSupplyMoney(lt)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SupSection>

            <SupSection
              title="Extra costs"
              hint={
                supplyBatchId
                  ? "Transport, handling, and other costs added to this delivery’s payable total."
                  : "No supply batch linked — extra costs cannot be edited on this bill."
              }
              bodyClassName="p-4 sm:p-5"
            >
              {supplyBatchId && canEditExtras ? (
                <div className={cn(supCardInset, "p-3")}>
                  <ExtraCostsBody
                    extras={extras}
                    onChange={setExtras}
                    busy={busy}
                  />
                </div>
              ) : supplyBatchId ? (
                <div className={cn(supCardInset, "space-y-1.5 p-3")}>
                  {extras.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No extra costs on this bill.
                    </p>
                  ) : (
                    extras.map((e) => (
                      <div
                        key={e.key}
                        className="flex flex-wrap items-center gap-2 text-xs"
                      >
                        <span className="font-medium capitalize">
                          {e.category || "Other"}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatSupplyMoney(parseNonNeg(e.amount) ?? 0)}
                        </span>
                        {e.desc ? (
                          <span className="text-muted-foreground">{e.desc}</span>
                        ) : null}
                      </div>
                    ))
                  )}
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    You need inventory write permission to change extra costs.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Extra costs are unavailable for this invoice.
                </p>
              )}
            </SupSection>
          </>
        ) : null}
      </form>
    </FormDrawer>
  );
}
