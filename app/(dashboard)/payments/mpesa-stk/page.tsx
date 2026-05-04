"use client";

import { useMemo, useState } from "react";
import { Building2, List, Smartphone } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { fetchCustomers, initiateMpesaStkIntent, simulateMpesaStkComplete } from "@/lib/api";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { hasPermission, Permission } from "@/lib/permissions";

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundMoney2(n);
}

export default function MpesaStkPage() {
  const { me, business } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.PaymentsStkInitiate);
  const currency = useMemo(() => business?.currency?.trim() || "KES", [business?.currency]);
  const businessId = useMemo(() => business?.id?.trim() || "", [business?.id]);

  const [customerPhoneQuery, setCustomerPhoneQuery] = useState("");
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerHits, setCustomerHits] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [amount, setAmount] = useState("");
  const [secret, setSecret] = useState("");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [lastIntent, setLastIntent] = useState<{
    intentId: string;
    checkoutRequestId: string;
    status: string;
    amount: number | string;
  } | null>(null);

  const onSearchCustomers = async () => {
    const q = customerPhoneQuery.trim();
    if (!q) {
      setCustomerHits([]);
      return;
    }
    setCustomerBusy(true);
    setMessage(null);
    try {
      const rows = await fetchCustomers(q);
      setCustomerHits(rows.map((c) => ({ id: c.id, name: c.name })));
    } catch (e) {
      setCustomerHits([]);
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Customer search failed." });
    } finally {
      setCustomerBusy(false);
    }
  };

  const onInitiate = async () => {
    const amt = parseMoney(amount);
    if (!selectedCustomerId.trim()) {
      setMessage({ kind: "error", text: "Select a customer." });
      return;
    }
    if (amt == null) {
      setMessage({ kind: "error", text: "Enter a positive amount." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const idem = nextIdempotencyKey();
      const r = await initiateMpesaStkIntent({ customerId: selectedCustomerId, amount: amt }, idem);
      setLastIntent(r);
      setMessage({ kind: "ok", text: `Intent created: ${r.intentId}` });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "STK initiate failed." });
    } finally {
      setBusy(false);
    }
  };

  const onSimulate = async () => {
    if (!lastIntent?.intentId || !businessId) {
      setMessage({ kind: "error", text: "Create an intent first." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await simulateMpesaStkComplete({
        businessId,
        intentId: lastIntent.intentId,
        secret: secret.trim() || null,
      });
      setMessage({ kind: "ok", text: "Simulated completion sent. Refresh statement/wallet to see the top-up." });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Simulate failed." });
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="M-Pesa STK"
        description={
          <>
            You need permission{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.PaymentsStkInitiate}</code>.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-4">
        <DashboardPageHero
          icon={Smartphone}
          eyebrow="Payments"
          title="M-Pesa STK"
          description="Create an STK intent for a customer wallet top-up. This slice includes a dev-only simulate helper."
        />
        <DashboardQuickLinks
          links={[
            { href: APP_ROUTES.customers, label: "Customers", desc: "Lookup", icon: List },
            { href: APP_ROUTES.business, label: "Business", desc: "Workspace", icon: Building2 },
          ]}
        />
      </header>

      {message ? (
        <DashboardFeedback kind={message.kind === "ok" ? "success" : "error"} text={message.text} />
      ) : null}

      <div className="rounded-md border p-4 space-y-4">
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Customer</h2>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Phone search</span>
              <input
                className="rounded border bg-background px-2 py-2"
                value={customerPhoneQuery}
                onChange={(e) => setCustomerPhoneQuery(e.target.value)}
                placeholder="2547…"
                disabled={customerBusy || busy}
              />
            </label>
            <Button type="button" variant="secondary" size="sm" disabled={customerBusy || busy} onClick={() => void onSearchCustomers()}>
              {customerBusy ? "Searching…" : "Find"}
            </Button>
          </div>
          {customerHits.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Select a customer:</p>
              <div className="flex flex-wrap gap-2">
                {customerHits.slice(0, 10).map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    size="sm"
                    variant={selectedCustomerId === c.id ? "default" : "outline"}
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {selectedCustomerId ? (
            <p className="text-xs text-muted-foreground">
              Selected customer id: <span className="font-mono">{selectedCustomerId}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Intent</h2>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Amount ({currency})</span>
              <input
                className="w-40 rounded border bg-background px-2 py-2 tabular-nums"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                disabled={busy}
              />
            </label>
            <Button type="button" disabled={busy} onClick={() => void onInitiate()}>
              {busy ? "Working…" : "Initiate STK"}
            </Button>
          </div>
          {lastIntent ? (
            <div className="rounded border bg-muted/20 p-3 text-xs space-y-1">
              <p>
                Intent <span className="font-mono">{lastIntent.intentId}</span>
              </p>
              <p>
                CheckoutRequestId <span className="font-mono">{lastIntent.checkoutRequestId}</span>
              </p>
              <p>
                Status <span className="font-mono">{lastIntent.status}</span> · Amount{" "}
                <span className="font-mono">{String(lastIntent.amount)}</span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">Simulate completion (dev)</h2>
          <p className="text-xs text-muted-foreground">
            Calls <span className="font-mono">POST /webhooks/mpesa/stk/complete</span> with businessId + intentId.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[16rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">X-Mpesa-Simulate-Secret (optional)</span>
              <input
                className="rounded border bg-background px-2 py-2 font-mono text-xs"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="must match MPESA_STK_SIMULATE_SECRET"
                disabled={busy}
              />
            </label>
            <Button type="button" variant="secondary" disabled={busy || !lastIntent} onClick={() => void onSimulate()}>
              {busy ? "Working…" : "Simulate complete"}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

