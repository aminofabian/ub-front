"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  approvePaymentClaim,
  listSubmittedPaymentClaims,
  rejectPaymentClaim,
  type PublicPaymentClaimRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function fmtInstant(raw: string): string {
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function sourceLabel(source: string | null | undefined): string {
  if (source === "cashier") return "Till";
  if (source === "tab_portal") return "Tab portal";
  return "Pay link";
}

export default function PaymentClaimsReviewPage() {
  const { me, business } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.CreditsClaimsReview);
  const currency = useMemo(
    () => business?.currency?.trim() || "KES",
    [business?.currency],
  );

  const [rows, setRows] = useState<PublicPaymentClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      setRows(await listSubmittedPaymentClaims());
    } catch (error) {
      setRows([]);
      setMessage(
        error instanceof Error ? error.message : "Failed to load claims.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [allowed, load]);

  const onApprove = useCallback(
    async (claimId: string, channel: "cash" | "mpesa") => {
      setMessage("");
      setBusyId(claimId);
      try {
        await approvePaymentClaim(claimId, channel);
        await load();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Approve failed.");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const onReject = useCallback(
    async (claimId: string) => {
      setMessage("");
      setBusyId(claimId);
      try {
        await rejectPaymentClaim(claimId, "Rejected by admin");
        await load();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Reject failed.");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2 p-6">
        <h1 className="text-xl font-semibold">Payment claims</h1>
        <p className="text-sm text-muted-foreground">
          You need permission{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            {Permission.CreditsClaimsReview}
          </code>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payment claims</h1>
          <p className="text-sm text-muted-foreground">
            Review till clearances, tab portal payments, and public pay links.
            Approving drops the customer&apos;s tab balance.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const proposed =
                  r.proposedChannel === "mpesa" || r.proposedChannel === "cash"
                    ? r.proposedChannel
                    : null;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {fmtInstant(r.updatedAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.source === "cashier"
                            ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-100"
                            : r.source === "tab_portal"
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 dark:text-emerald-100"
                              : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                        }
                      >
                        {sourceLabel(r.source)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {r.customerName?.trim() || "Customer"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.customerPhone?.trim() || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.submittedAmount != null
                        ? `${currency} ${Number(r.submittedAmount).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs uppercase text-muted-foreground">
                      {proposed ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.submittedReference ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() =>
                            void onApprove(r.id, proposed ?? "cash")
                          }
                        >
                          {busyId === r.id
                            ? "…"
                            : proposed === "mpesa"
                              ? "Approve M-Pesa"
                              : "Approve cash"}
                        </Button>
                        {proposed !== "mpesa" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => void onApprove(r.id, "mpesa")}
                          >
                            M-Pesa
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => void onApprove(r.id, "cash")}
                          >
                            Cash
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busyId === r.id}
                          onClick={() => void onReject(r.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              No submitted claims right now.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
