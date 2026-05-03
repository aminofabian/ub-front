"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchCustomers,
  fetchCustomerCreditStatement,
  issueCustomerPaymentClaim,
  postCustomerWalletTopUp,
  type CreditStatementRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function money(currency: string, n: number | string): string {
  const v = typeof n === "number" ? n : Number(n);
  return `${currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isUuidLike(raw: string): boolean {
  const s = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function fmtInstant(raw: string): string {
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) {
    return raw;
  }
  return d.toLocaleString();
}

export default function CustomerCreditStatementPage() {
  const params = useParams();
  const customerKey = typeof params.customerId === "string" ? params.customerId : "";

  const { me, business } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.CreditsCustomersRead);

  const currency = useMemo(() => business?.currency?.trim() || "KES", [business?.currency]);

  const [data, setData] = useState<CreditStatementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [claimIssueBusy, setClaimIssueBusy] = useState(false);
  const [claimIssued, setClaimIssued] = useState<{ claimId: string; plaintextToken: string } | null>(
    null,
  );
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string>("");
  const [phoneMatches, setPhoneMatches] = useState<{ id: string; name: string; phone: string }[]>(
    [],
  );

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      const id = resolvedCustomerId.trim();
      if (!id) {
        setData(null);
        setMessage("Customer not resolved.");
        return;
      }
      const stmt = await fetchCustomerCreditStatement(id);
      setData(stmt);
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : "Failed to load statement.");
    } finally {
      setLoading(false);
    }
  }, [resolvedCustomerId]);

  useEffect(() => {
    if (!allowed || !customerKey.trim()) return;
    const t = setTimeout(() => {
      const raw = customerKey.trim();
      if (isUuidLike(raw)) {
        setResolvedCustomerId(raw);
        setPhoneMatches([]);
        return;
      }
      // Treat as phone (or phone fragment). If multiple matches, require selection.
      setResolvedCustomerId("");
      setPhoneMatches([]);
      setLoading(true);
      setMessage("");
      void fetchCustomers(raw)
        .then((rows) => {
          const matches = rows.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phones.find((p) => p.primary)?.phone ?? c.phones[0]?.phone ?? "—",
          }));
          setPhoneMatches(matches);
          if (matches.length === 1) {
            setResolvedCustomerId(matches[0].id);
          } else if (matches.length === 0) {
            setMessage("No customers match that phone.");
          } else {
            setMessage("Multiple customers match that phone. Please pick one.");
          }
        })
        .catch((e) => {
          setMessage(e instanceof Error ? e.message : "Customer lookup failed.");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 0);
    return () => clearTimeout(t);
  }, [allowed, customerKey]);

  useEffect(() => {
    if (!allowed || !resolvedCustomerId.trim()) return;
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [allowed, load, resolvedCustomerId]);

  const canTopUpWallet = hasPermission(me?.permissions, Permission.CreditsWalletWrite);
  const canIssueClaim = hasPermission(me?.permissions, Permission.CreditsClaimsIssue);

  const onTopUpWallet = useCallback(async () => {
    const amt = Number(topUpAmount.trim());
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a positive top-up amount.");
      return;
    }
    const id = resolvedCustomerId.trim();
    if (!id) {
      setMessage("Customer not resolved.");
      return;
    }
    setMessage("");
    setTopUpBusy(true);
    try {
      await postCustomerWalletTopUp(id, { amount: amt });
      setTopUpAmount("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet top-up failed.");
    } finally {
      setTopUpBusy(false);
    }
  }, [resolvedCustomerId, load, topUpAmount]);

  const onIssueClaim = useCallback(async () => {
    setMessage("");
    setClaimIssued(null);
    const id = resolvedCustomerId.trim();
    if (!id) {
      setMessage("Customer not resolved.");
      return;
    }
    setClaimIssueBusy(true);
    try {
      const r = await issueCustomerPaymentClaim(id);
      setClaimIssued({ claimId: r.claimId, plaintextToken: r.plaintextToken });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Issue claim failed.");
    } finally {
      setClaimIssueBusy(false);
    }
  }, [resolvedCustomerId]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2 p-6">
        <h1 className="text-xl font-semibold">Customer statement</h1>
        <p className="text-sm text-muted-foreground">
          You need permission{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.CreditsCustomersRead}</code>.
        </p>
      </section>
    );
  }

  if (!customerKey.trim()) {
    return (
      <section className="max-w-xl space-y-2 p-6">
        <h1 className="text-xl font-semibold">Customer statement</h1>
        <p className="text-sm text-muted-foreground">Missing customer id.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={APP_ROUTES.customers}>← Customers</Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {phoneMatches.length > 1 && !resolvedCustomerId.trim() ? (
        <div className="rounded-md border p-4">
          <h2 className="text-sm font-medium">Choose customer</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Multiple customers matched <span className="font-mono">{customerKey}</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {phoneMatches.slice(0, 20).map((m) => (
              <Button
                key={m.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setResolvedCustomerId(m.id);
                  setMessage("");
                }}
              >
                {m.name} · {m.phone}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="rounded-md border bg-muted/10 p-4">
            <h1 className="text-lg font-semibold">{data.customerName}</h1>
            <p className="text-xs text-muted-foreground font-mono">{data.customerId}</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Balance owed</p>
                <p className="font-medium">{money(currency, data.balanceOwed)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wallet balance</p>
                <p className="font-medium">{money(currency, data.walletBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loyalty points</p>
                <p className="font-medium tabular-nums">{data.loyaltyPoints}</p>
              </div>
            </div>
          </div>

          {canTopUpWallet ? (
            <div className="rounded-md border p-4">
              <h2 className="text-sm font-medium">Wallet top-up</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Posts a counter cash top-up to this customer’s wallet.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Amount ({currency})</span>
                  <input
                    className="w-40 rounded border bg-background px-2 py-1.5 tabular-nums"
                    inputMode="decimal"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="e.g. 500"
                    disabled={topUpBusy}
                  />
                </label>
                <Button type="button" disabled={topUpBusy} onClick={() => void onTopUpWallet()}>
                  {topUpBusy ? "Posting…" : "Top up wallet"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4">
              <h2 className="text-sm font-medium">Wallet top-up</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                You need{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {Permission.CreditsWalletWrite}
                </code>{" "}
                to top up a wallet.
              </p>
            </div>
          )}

          {canIssueClaim ? (
            <div className="rounded-md border p-4">
              <h2 className="text-sm font-medium">Public payment claim</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Issues a one-time plaintext token that can be submitted without auth (share carefully).
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" disabled={claimIssueBusy} onClick={() => void onIssueClaim()}>
                  {claimIssueBusy ? "Issuing…" : "Issue token"}
                </Button>
              </div>
              {claimIssued ? (
                <div className="mt-3 space-y-1 rounded border bg-muted/20 p-3 text-xs">
                  <p>
                    Claim <span className="font-mono">{claimIssued.claimId}</span>
                  </p>
                  <p>
                    Token <span className="font-mono">{claimIssued.plaintextToken}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Submit endpoint: <span className="font-mono">/api/v1/public/credits/payment-claims/{"{token}"}</span>
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4">
              <h2 className="text-sm font-medium">Public payment claim</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                You need{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.CreditsClaimsIssue}</code> to issue a token.
              </p>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">At</th>
                  <th className="px-3 py-2 font-medium">Kind</th>
                  <th className="px-3 py-2 font-medium">Debit</th>
                  <th className="px-3 py-2 font-medium">Credit</th>
                  <th className="px-3 py-2 font-medium">Memo</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((l, idx) => (
                  <tr key={`${l.at}-${l.kind}-${idx}`} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtInstant(l.at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.kind}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {Number(l.debit) > 0 ? money(currency, l.debit) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {Number(l.credit) > 0 ? money(currency, l.credit) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.lines.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">No statement activity yet.</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data.</p>
      )}
    </section>
  );
}

