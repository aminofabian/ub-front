"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { formatMoney } from "@/lib/money";
import {
  adjustStaffEarnings,
  payStaff,
  type CommissionStatementRow,
  type PayoutMethod,
} from "@/lib/service-business-api";

const kes = (n: number) => formatMoney(n, "KES");

function serverMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  }
  return fallback;
}

export function PayoutDialog({
  row,
  onClose,
  onDone,
}: {
  row: CommissionStatementRow;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const { branchId } = useDashboard();
  const owed = Math.max(row.closing, 0);
  const [amount, setAmount] = useState(owed > 0 ? String(owed) : "");
  const [method, setMethod] = useState<PayoutMethod>("DRAWER");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // One key per intended payout: a retry after a dropped connection must not pay twice.
  const keyRef = useRef<string>(nextIdempotencyKey());

  async function pay() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter the amount you are paying");
    if (value > owed) {
      return setError(`${row.displayName} is owed ${kes(owed)}. Enter that or less.`);
    }
    if (method === "DRAWER" && !branchId) {
      return setError("Choose a branch at the top of the page first, so we know which till pays.");
    }
    setError(null);
    setSaving(true);
    try {
      await payStaff(
        row.staffProfileId,
        {
          amount: value,
          method,
          ...(method === "DRAWER" ? { branchId } : {}),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
        },
        keyRef.current,
      );
      toast.success(`Paid ${row.displayName} ${kes(value)}`);
      await onDone();
    } catch (err) {
      setError(serverMessage(err, "Could not record the payout. Nothing was paid; try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay {row.displayName}</DialogTitle>
          <DialogDescription>Owed now: {kes(owed)}. You can pay part of it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Amount (KSh)</span>
            <input
              className={dashboardInputClass(false, "font-mono text-base")}
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                setError(null);
              }}
            />
          </label>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Paid from</span>
            <select
              className={dashboardSelectClass()}
              value={method}
              onChange={(e) => setMethod(e.target.value as PayoutMethod)}
            >
              <option value="DRAWER">Cash from the till</option>
              <option value="MPESA">M-Pesa</option>
              <option value="OTHER">Bank or other</option>
            </select>
            <span className={dashboardHintClass()}>
              {method === "DRAWER"
                ? "The cash comes off the open shift, so the drawer still balances at close."
                : "This only records the payment. Send the money yourself."}
            </span>
          </label>
          {method !== "DRAWER" ? (
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Reference (optional)</span>
              <input
                className={dashboardInputClass()}
                value={reference}
                maxLength={191}
                placeholder="M-Pesa code"
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void pay()}>
            {saving ? "Paying…" : "Record payout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustDialog({
  row,
  onClose,
  onDone,
}: {
  row: CommissionStatementRow;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [direction, setDirection] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const keyRef = useRef<string>(nextIdempotencyKey());

  async function save() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount");
    if (!reason.trim()) return setError("Say why, so it is clear later");
    setError(null);
    setSaving(true);
    try {
      await adjustStaffEarnings(
        row.staffProfileId,
        { amount: direction === "add" ? value : -value, reason: reason.trim() },
        keyRef.current,
      );
      toast.success(`${row.displayName}\u2019s earnings adjusted`);
      await onDone();
    } catch (err) {
      setError(serverMessage(err, "Could not save the adjustment. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {row.displayName}&apos;s earnings</DialogTitle>
          <DialogDescription>For a bonus or to correct a mistake. It is recorded with your reason.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Change</span>
              <select
                className={dashboardSelectClass()}
                value={direction}
                onChange={(e) => setDirection(e.target.value as "add" | "deduct")}
              >
                <option value="add">Add</option>
                <option value="deduct">Deduct</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Amount (KSh)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Reason</span>
            <input
              className={dashboardInputClass()}
              value={reason}
              maxLength={500}
              placeholder="Busy Saturday bonus"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
