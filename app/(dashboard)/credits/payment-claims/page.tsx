"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  approvePaymentClaim,
  listSubmittedPaymentClaims,
  type PublicPaymentClaimRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function fmtInstant(raw: string): string {
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

export default function PaymentClaimsReviewPage() {
  const { me, business } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.CreditsClaimsReview);
  const currency = useMemo(() => business?.currency?.trim() || "KES", [business?.currency]);

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
      setMessage(error instanceof Error ? error.message : "Failed to load claims.");
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
    async (claimId: string) => {
      setMessage("");
      setBusyId(claimId);
      try {
        await approvePaymentClaim(claimId);
        await load();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Approve failed.");
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
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.CreditsClaimsReview}</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Payment claims</h1>
          <p className="text-sm text-muted-foreground">Review and approve public payment submissions.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Claim</th>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtInstant(r.updatedAt)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.creditAccountId}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.submittedAmount != null ? `${currency} ${Number(r.submittedAmount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.submittedReference ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => void onApprove(r.id)}
                    >
                      {busyId === r.id ? "Approving…" : "Approve"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No submitted claims right now.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

