"use client";

import { useState } from "react";
import { Warehouse } from "lucide-react";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type { SupplyBatchDetailRecord } from "@/lib/api";
import { clearSupplyBatch, postStandaloneWastage } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatQty(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatMoney(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const REASONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "SPOILAGE", label: "Spoilage" },
  { value: "BREAKAGE", label: "Breakage" },
  { value: "THEFT", label: "Theft" },
  { value: "SAMPLE", label: "Sample" },
  { value: "PERSONAL_USE", label: "Personal use" },
  { value: "COUNTING_ERROR", label: "Counting error" },
  { value: "OTHER", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SupplyBatchDetailRecord;
  mode: "wastage" | "clear";
  onDone: () => void;
}

export function ClearingDrawer({ open, onOpenChange, data, mode, onDone }: Props) {
  const [reason, setReason] = useState("EXPIRED");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const itemsWithRemaining =
    data.items.filter((it) => Number(it.quantityRemaining) > 0) ?? [];

  const totalWriteOff = itemsWithRemaining.reduce(
    (sum, it) => sum + Number(it.quantityRemaining) * Number(it.unitCost),
    0,
  );

  const isClear = mode === "clear";

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (isClear) {
        await clearSupplyBatch(data.id, { reason, notes: notes || null });
      } else {
        for (const it of itemsWithRemaining) {
          const qty = Number(it.quantityRemaining);
          if (qty <= 0) continue;
          await postStandaloneWastage({
            branchId: data.branchId,
            itemId: it.itemId,
            batchId: it.inventoryBatchId,
            quantity: qty,
            unitCost: it.unitCost,
            reason: reason + (notes ? " — " + notes : ""),
            wastageReason: reason,
          });
        }
      }
      onOpenChange(false);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isClear ? "Clear supply batch" : "Record wastage"}
      description={
        isClear
          ? "Write off remaining stock and close this batch."
          : "Record wastage for remaining stock without closing the batch."
      }
      contextLabel={"Batch " + data.batchNumber}
      icon={<Warehouse className="h-5 w-5" />}
      width="full"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            className="h-12 rounded-2xl text-[14px] sm:h-9 sm:rounded-none sm:text-sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-12 rounded-2xl text-[14px] sm:h-9 sm:rounded-none sm:text-sm"
            onClick={handleSubmit}
            disabled={saving || itemsWithRemaining.length === 0}
          >
            {saving
              ? "Saving…"
              : isClear
                ? "Confirm — clear batch"
                : "Save wastage"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {itemsWithRemaining.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All items are fully accounted for. No remaining stock to write off.
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="space-y-2 sm:hidden">
              {itemsWithRemaining.map((it) => {
                const writeOff =
                  Number(it.quantityRemaining) * Number(it.unitCost);
                return (
                  <li
                    key={it.inventoryBatchId}
                    className="rounded-2xl border border-border bg-white px-3 py-2.5"
                  >
                    <p className="text-[14px] font-semibold leading-snug text-foreground">
                      {it.itemName ?? it.itemId}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-mono tabular-nums font-medium">
                          {formatQty(it.quantityRemaining)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Unit cost</span>
                        <span className="font-mono tabular-nums font-medium">
                          {formatMoney(it.unitCost)}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-between gap-2 border-t border-border/60 pt-1.5">
                        <span className="text-muted-foreground">Write-off</span>
                        <span className="font-mono tabular-nums font-semibold text-rose-600">
                          {formatMoney(writeOff)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
              <li className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-3 py-2.5 dark:border-rose-900/40 dark:bg-rose-950/30">
                <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                  <span>Total write-off</span>
                  <span className="font-mono tabular-nums text-rose-700 dark:text-rose-300">
                    {formatMoney(totalWriteOff)}
                  </span>
                </div>
              </li>
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-none border shadow-none sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Remaining</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Write-off value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemsWithRemaining.map((it) => (
                    <tr
                      key={it.inventoryBatchId}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">
                        {it.itemName ?? it.itemId}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatQty(it.quantityRemaining)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(it.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-600">
                        {formatMoney(
                          Number(it.quantityRemaining) * Number(it.unitCost),
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/20 font-medium">
                    <td className="px-3 py-2" colSpan={3}>
                      Total write-off
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-600">
                      {formatMoney(totalWriteOff)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="space-y-3 rounded-2xl border p-4 sm:rounded-none">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Reason</span>
            <select
              className={cn(
                "h-12 rounded-2xl border bg-background px-3 text-[15px] sm:h-10 sm:rounded sm:text-sm",
              )}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Notes (optional)</span>
            <textarea
              className="rounded-2xl border bg-background px-3 py-2.5 text-[15px] sm:rounded sm:text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context…"
            />
          </label>
        </div>
      </div>
    </FormDrawer>
  );
}
