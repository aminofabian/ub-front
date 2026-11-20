"use client";

import { Pill } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type MedicineLotLine = { lineId: string; name: string; quantity: number };
export type MedicineLotValues = Record<string, { lotNumber: string; expiryDate: string }>;

type Props = {
  lines: MedicineLotLine[];
  onConfirm: (values: MedicineLotValues) => void;
  onDismiss: () => void;
};

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Asked before a delivery is received when it holds medicines: the lot number and expiry date
 * printed on each pack. Nothing has been received yet when this opens.
 */
export function MedicineLotDialog({ lines, onConfirm, onDismiss }: Props) {
  const [values, setValues] = useState<MedicineLotValues>({});
  const [error, setError] = useState("");
  const today = todayIso();

  const set = (lineId: string, patch: Partial<{ lotNumber: string; expiryDate: string }>) =>
    setValues((prev) => ({
      ...prev,
      [lineId]: {
        lotNumber: patch.lotNumber ?? prev[lineId]?.lotNumber ?? "",
        expiryDate: patch.expiryDate ?? prev[lineId]?.expiryDate ?? "",
      },
    }));

  const submit = () => {
    const out: MedicineLotValues = {};
    for (const l of lines) {
      const lotNumber = values[l.lineId]?.lotNumber.trim() ?? "";
      const expiryDate = values[l.lineId]?.expiryDate ?? "";
      if (!lotNumber || !expiryDate) {
        setError(`Enter the lot number and expiry date for ${l.name}.`);
        return;
      }
      if (expiryDate < today) {
        setError(`${l.name} has already expired. Do not receive it; return it to the supplier.`);
        return;
      }
      out[l.lineId] = { lotNumber, expiryDate };
    }
    onConfirm(out);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent side="center" className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
            <span
              className="mt-1 flex size-8 shrink-0 items-center justify-center bg-[var(--op-accent,#1D4B3B)] text-white"
              aria-hidden
            >
              <Pill className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-1 pr-6">
              <DialogTitle>Lot and expiry for medicines</DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed">
                Copy these from the pack. Nothing has been received yet. If one product arrived in two
                lots, receive each lot separately.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            {lines.map((l, index) => (
              <fieldset key={l.lineId} className="space-y-2 border border-border p-3">
                <legend className="px-1 text-sm font-medium">
                  {l.name} <span className="font-normal tabular-nums text-muted-foreground">× {l.quantity}</span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Lot number</span>
                    <Input
                      value={values[l.lineId]?.lotNumber ?? ""}
                      onChange={(e) => set(l.lineId, { lotNumber: e.target.value })}
                      maxLength={64}
                      autoComplete="off"
                      autoFocus={index === 0}
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Expiry date</span>
                    <Input
                      type="date"
                      min={today}
                      value={values[l.lineId]?.expiryDate ?? ""}
                      onChange={(e) => set(l.lineId, { expiryDate: e.target.value })}
                    />
                  </label>
                </div>
              </fieldset>
            ))}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onDismiss}>
              Cancel
            </Button>
            <Button type="submit">Receive stock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
