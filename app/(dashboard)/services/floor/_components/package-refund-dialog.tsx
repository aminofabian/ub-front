"use client";

import { useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError, fetchCustomers } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { fetchCustomerPackages, refundCustomerPackage, type CustomerPackage } from "@/lib/service-business-api";

const kes = (n: number) => formatMoney(n, "KES");

/**
 * A customer wants the money back for package visits they have not used. Find them by phone,
 * pick the package, and hand back what is left. Visits already used stay paid for.
 */
export function PackageRefundDialog({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [packages, setPackages] = useState<CustomerPackage[] | null>(null);
  const [chosenId, setChosenId] = useState("");
  const [method, setMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const chosen = packages?.find((p) => p.id === chosenId) ?? null;

  const problem = (err: unknown, fallback: string) => {
    const detail = err instanceof ApiRequestError ? (err.payload as { detail?: unknown } | null)?.detail : null;
    return typeof detail === "string" && detail.trim() ? detail : fallback;
  };

  async function find() {
    const digits = phone.replace(/[^0-9+]/g, "");
    if (digits.replace(/\D/g, "").length < 9) return setError("Enter the customer's phone number");
    setBusy(true);
    setError(null);
    try {
      const found = await fetchCustomers(digits);
      if (found.length === 0) {
        setPackages([]);
        return;
      }
      const rows = (await fetchCustomerPackages(found[0]!.id)).filter((p) => p.sessionsRemaining > 0 && p.valueRemaining > 0);
      setPackages(rows);
      setChosenId(rows.length === 1 ? rows[0]!.id : "");
    } catch (err) {
      setError(problem(err, "Could not look them up. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function refund() {
    if (!chosen) return setError("Choose the package");
    setBusy(true);
    setError(null);
    try {
      const result = await refundCustomerPackage(chosen.id, method);
      setDone(
        result.refunded > 0
          ? `Give back ${kes(result.refunded)} for ${result.sessionsRefunded} unused ${result.sessionsRefunded === 1 ? "visit" : "visits"} of ${chosen.serviceName}. The package is closed.`
          : "This package was already given back. Nothing more is owed.",
      );
    } catch (err) {
      setError(problem(err, "Nothing was given back. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give a package back</DialogTitle>
          <DialogDescription>
            The customer gets the money for visits they have not used. Visits already used stay paid for.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <p role="status" className="text-sm">
            {done}
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="flex items-end gap-2">
              <label className="grid flex-1 gap-1">
                <span className={dashboardLabelClass()}>Customer phone</span>
                <input
                  className={dashboardInputClass(busy, "font-mono")}
                  inputMode="tel"
                  autoComplete="off"
                  disabled={busy}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/[^0-9+ ]/g, ""));
                    setPackages(null);
                    setError(null);
                  }}
                />
              </label>
              <Button variant="outline" disabled={busy} onClick={() => void find()}>
                Find
              </Button>
            </div>
            {packages != null && packages.length === 0 ? (
              <p className={dashboardHintClass()}>No package with visits left under that number.</p>
            ) : null}
            {packages != null && packages.length > 0 ? (
              <>
                <ul className="divide-y" aria-label="Their packages">
                  {packages.map((p) => (
                    <li key={p.id}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 py-1.5 text-sm">
                        <input
                          type="radio"
                          name="package"
                          className="size-4"
                          checked={chosenId === p.id}
                          disabled={busy}
                          onChange={() => setChosenId(p.id)}
                        />
                        <span className="min-w-0 flex-1">
                          {p.serviceName}
                          <span className={`block ${dashboardHintClass()}`}>
                            {p.sessionsRemaining} of {p.sessionsTotal} visits left{p.expired ? " · out of time" : ""}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums">{kes(p.valueRemaining)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "mpesa_manual"] as const).map((m) => (
                    <Button key={m} variant={method === m ? "default" : "outline"} aria-pressed={method === m} disabled={busy} onClick={() => setMethod(m)}>
                      {m === "cash" ? "Cash" : "M-Pesa"}
                    </Button>
                  ))}
                </div>
                <p className={dashboardHintClass()}>
                  {method === "cash"
                    ? "The cash comes out of the drawer of the open shift."
                    : "Send it from your phone first, then confirm here."}
                </p>
              </>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {done || !packages || packages.length === 0 ? null : (
            <Button disabled={busy || !chosen} onClick={() => void refund()}>
              {busy ? "Recording…" : chosen ? `Give back ${kes(chosen.valueRemaining)}` : "Give back"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
