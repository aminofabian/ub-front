"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  fetchSuppliers,
  postSupplierPayment,
  type SupplierRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supInput,
  supSelect,
  supTextarea,
} from "../../suppliers/_components/supplier-ui-tokens";
import { formatSupplyMoney, supplyN } from "./supplies-shared";

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

function resolvePaymentMethod(preferred: string | null | undefined): string {
  const p = (preferred ?? "").trim().toLowerCase();
  if (p === "cash" || p === "bank" || p === "mpesa") return p;
  if (p.includes("mpesa") || p.includes("m-pesa")) return "mpesa";
  if (p.includes("bank") || p.includes("transfer") || p.includes("rtgs")) {
    return "bank";
  }
  return "cash";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeposited: () => void;
  currency: string;
};

export function AdvanceDepositDrawer({
  open,
  onOpenChange,
  onDeposited,
  currency,
}: Props) {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(defaultLocalDateTime);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => suppliers.find((s) => s.id === supplierId) ?? null,
    [suppliers, supplierId],
  );
  const existingCredit = supplyN(selected?.prepaymentBalance);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAmount("");
    setReference("");
    setNotes("");
    setPaidAt(defaultLocalDateTime());
    setLoadingSuppliers(true);
    void fetchSuppliers()
      .then((rows) => {
        const active = rows.filter(
          (s) => (s.status ?? "").toLowerCase() !== "inactive" && !s.deletedAt,
        );
        setSuppliers(active);
        if (active.length > 0) {
          setSupplierId((prev) =>
            prev && active.some((s) => s.id === prev) ? prev : active[0]!.id,
          );
          const first = active[0]!;
          setPaymentMethod(resolvePaymentMethod(first.paymentMethodPreferred));
        } else {
          setSupplierId("");
        }
      })
      .catch((e) => {
        setSuppliers([]);
        setError(e instanceof Error ? e.message : "Could not load suppliers.");
      })
      .finally(() => setLoadingSuppliers(false));
  }, [open]);

  useEffect(() => {
    if (!selected) return;
    setPaymentMethod(resolvePaymentMethod(selected.paymentMethodPreferred));
  }, [selected]);

  const submit = async () => {
    setError(null);
    if (!supplierId) {
      setError("Pick a supplier.");
      return;
    }
    const cash = Number(amount);
    if (!Number.isFinite(cash) || cash <= 0) {
      setError("Enter a deposit amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const result = await postSupplierPayment({
        supplierId,
        paidAt: toIsoInstant(paidAt),
        paymentMethod,
        paymentAmount: cash,
        creditApplied: 0,
        reference: reference.trim() || undefined,
        notes: notes.trim() || "Supplier advance deposit",
        allocations: [],
        notifySupplier: false,
      });
      const after = supplyN(result.supplierPrepaymentBalanceAfter);
      toast.success(
        `Advance deposited · credit now ${formatSupplyMoney(after, currency)}`,
      );
      onDeposited();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record advance.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Pay supplier in advance"
      description="Deposit cash against a supplier. When they bring items, that credit settles the bill automatically."
      icon={<Wallet className="size-4" aria-hidden />}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-none"
            disabled={busy || loadingSuppliers || !supplierId}
            onClick={() => void submit()}
          >
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Depositing…
              </>
            ) : (
              "Deposit advance"
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? <FormDrawerMessageBanner text={error} /> : null}

        <label className="flex flex-col gap-1.5">
          <span className={supFieldLabel}>Supplier</span>
          <select
            className={supSelect}
            value={supplierId}
            disabled={busy || loadingSuppliers}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            {loadingSuppliers ? (
              <option value="">Loading…</option>
            ) : suppliers.length === 0 ? (
              <option value="">No suppliers</option>
            ) : (
              suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {supplyN(s.prepaymentBalance) > 0.009
                    ? ` · credit ${formatSupplyMoney(supplyN(s.prepaymentBalance), currency)}`
                    : ""}
                </option>
              ))
            )}
          </select>
        </label>

        {selected && existingCredit > 0.009 ? (
          <p
            className={cn(
              "border border-emerald-600/20 bg-emerald-500/8 px-3 py-2 text-[12px] text-emerald-900",
            )}
          >
            Current advance credit:{" "}
            <span className="font-semibold tabular-nums">
              {formatSupplyMoney(existingCredit, currency)}
            </span>
            . New deposits add on top.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Amount</span>
            <input
              className={supInput}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              inputMode="decimal"
              placeholder="0.00"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Method</span>
            <select
              className={supSelect}
              value={paymentMethod}
              disabled={busy}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank transfer</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Paid at</span>
            <input
              type="datetime-local"
              className={supInput}
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Reference (optional)</span>
            <input
              className={supInput}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Notes (optional)</span>
            <textarea
              className={supTextarea}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              placeholder="e.g. Weekly float for Peter"
            />
          </label>
        </div>
      </div>
    </FormDrawer>
  );
}
