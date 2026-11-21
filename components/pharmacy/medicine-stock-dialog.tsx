"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { RX_INK, RX_INPUT, RX_MUTED, RX_RULE, errorText } from "@/components/pharmacy/pharmacy-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addMedicineStock } from "@/lib/pharmacy-api";
import { medicineStockRowProblem, todayIso, type MedicineStockRow } from "@/lib/pharmacy-stock-entry";
import { cn } from "@/lib/utils";

export type MedicineStockTarget = { itemId: string; name: string };

type Row = MedicineStockRow;
type RowState = { status: "idle" | "saved" | "error"; message?: string };

const EMPTY_ROW: Row = { quantity: "", unitCost: "", lotNumber: "", expiryDate: "" };

/**
 * Adds stock for one or several medicines, each with the lot number and expiry date from its
 * pack. This is how a chemist puts the shelves it already has onto the system: rows left empty
 * are skipped, each filled row is saved on its own, and a row that fails says why and stays.
 */
export function MedicineStockDialog({
  medicines,
  onClose,
  onSaved,
}: {
  medicines: MedicineStockTarget[];
  onClose: () => void;
  /** Called once at least one row was saved and the dialog closes. */
  onSaved: () => void;
}) {
  const { branchId, branches } = useDashboard();
  const branchName = branches.find((b) => b.id === branchId)?.name?.trim();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [states, setStates] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState(false);
  const today = todayIso();
  const single = medicines.length === 1;

  const row = (id: string): Row => rows[id] ?? EMPTY_ROW;
  const set = (id: string, key: keyof Row) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_ROW), [key]: e.target.value } }));
    setStates((prev) => (prev[id]?.status === "error" ? { ...prev, [id]: { status: "idle" } } : prev));
  };
  const started = (r: Row) => Boolean(r.quantity.trim() || r.lotNumber.trim() || r.expiryDate || r.unitCost.trim());

  const savedCount = Object.values(states).filter((s) => s.status === "saved").length;
  const pending = medicines.filter((m) => started(row(m.itemId)) && states[m.itemId]?.status !== "saved");

  const close = () => {
    if (busy) return;
    if (savedCount > 0) onSaved();
    else onClose();
  };

  const save = async () => {
    if (!branchId) return;
    const next: Record<string, RowState> = {};
    let invalid = false;
    for (const m of pending) {
      const problem = medicineStockRowProblem(row(m.itemId), today);
      if (problem) {
        next[m.itemId] = { status: "error", message: problem };
        invalid = true;
      }
    }
    if (invalid) {
      setStates((prev) => ({ ...prev, ...next }));
      return;
    }
    setBusy(true);
    let failed = 0;
    let saved = 0;
    for (const m of pending) {
      const r = row(m.itemId);
      try {
        await addMedicineStock({
          branchId,
          itemId: m.itemId,
          quantity: Number(r.quantity),
          unitCost: r.unitCost.trim() ? Number(r.unitCost) : 0,
          lotNumber: r.lotNumber.trim(),
          expiryDate: r.expiryDate,
        });
        saved++;
        setStates((prev) => ({ ...prev, [m.itemId]: { status: "saved" } }));
      } catch (err) {
        failed++;
        setStates((prev) => ({
          ...prev,
          [m.itemId]: { status: "error", message: errorText(err, "Could not add this stock.") },
        }));
      }
    }
    setBusy(false);
    if (saved > 0 && failed === 0) {
      toast.success(saved === 1 ? "Stock added" : `Stock added for ${saved} medicines`);
      onSaved();
    }
  };

  const cell = "px-2 py-2 align-top";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent side="center" className={cn("max-h-[92dvh] overflow-y-auto", single ? "sm:max-w-lg" : "sm:max-w-4xl")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>{single ? `Add stock: ${medicines[0]!.name}` : "Add stock"}</DialogTitle>
            <DialogDescription>
              {branchId
                ? `Count what is on the shelf${branchName ? ` at ${branchName}` : ""} and copy the lot number and expiry date from the pack. One row per lot: if a medicine has two lots, save one, then add the other.`
                : "Choose a branch at the top of the page first, so the stock goes to the right shop."}
              {!single && branchId ? " Rows you leave empty are skipped." : ""}
            </DialogDescription>
          </DialogHeader>

          {branchId ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className={cn("border-b text-left text-[12px]", RX_RULE, RX_MUTED)}>
                    {single ? null : <th className="px-2 py-2 font-medium">Medicine</th>}
                    <th className="w-24 px-2 py-2 font-medium">Quantity</th>
                    <th className="px-2 py-2 font-medium">Lot number</th>
                    <th className="w-40 px-2 py-2 font-medium">Expiry date</th>
                    <th className="w-28 px-2 py-2 font-medium">Cost each (optional)</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m) => {
                    const r = row(m.itemId);
                    const state = states[m.itemId];
                    const done = state?.status === "saved";
                    return (
                      <tr key={m.itemId} className={cn("border-b last:border-0", RX_RULE)}>
                        {single ? null : (
                          <td className={cn(cell, "min-w-[11rem]")}>
                            <span className={cn("block font-medium", RX_INK)}>{m.name}</span>
                            {done ? <span className="block text-[12.5px] text-[var(--op-accent,#1d4b3b)]">Added</span> : null}
                            {state?.status === "error" ? (
                              <span role="alert" className="block text-[12.5px] leading-snug text-destructive">
                                {state.message}
                              </span>
                            ) : null}
                          </td>
                        )}
                        <td className={cell}>
                          <input className={RX_INPUT} inputMode="decimal" aria-label={`Quantity of ${m.name}`} value={r.quantity} onChange={set(m.itemId, "quantity")} disabled={done || busy} />
                        </td>
                        <td className={cell}>
                          <input className={RX_INPUT} aria-label={`Lot number of ${m.name}`} value={r.lotNumber} onChange={set(m.itemId, "lotNumber")} maxLength={64} disabled={done || busy} />
                        </td>
                        <td className={cell}>
                          <input className={RX_INPUT} type="date" min={today} aria-label={`Expiry date of ${m.name}`} value={r.expiryDate} onChange={set(m.itemId, "expiryDate")} disabled={done || busy} />
                        </td>
                        <td className={cell}>
                          <input className={RX_INPUT} inputMode="decimal" aria-label={`Cost of one ${m.name}`} value={r.unitCost} onChange={set(m.itemId, "unitCost")} disabled={done || busy} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {single && states[medicines[0]!.itemId]?.status === "error" ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {states[medicines[0]!.itemId]!.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              {savedCount > 0 ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" disabled={busy || !branchId || pending.length === 0}>
              {busy ? "Adding…" : pending.length > 1 ? `Add stock for ${pending.length}` : "Add stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
