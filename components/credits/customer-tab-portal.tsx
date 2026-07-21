"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toKenyanLocal07 } from "@/lib/kenyan-phone";
import {
  fetchPublicCustomerTab,
  fetchPublicTabStkStatus,
  initiatePublicTabStk,
  type PublicCustomerTab,
} from "@/lib/public-customer-tab";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
};

type Props = {
  phoneSegment: string;
  branding: Branding;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtMoney(amount: unknown, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length >= 3 ? currency : "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(toNum(amount));
  } catch {
    return `${currency} ${toNum(amount).toFixed(2)}`;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CustomerTabPortal({ phoneSegment, branding }: Props) {
  const phone = useMemo(
    () => toKenyanLocal07(phoneSegment) ?? phoneSegment.trim(),
    [phoneSegment],
  );

  const [tab, setTab] = useState<PublicCustomerTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary = branding.primaryHex || "#0b6e4f";
  const accent = branding.accentHex || "#f4a261";
  const shopName = branding.shopName || "Shop";

  const themeStyle = useMemo(
    (): CSSProperties =>
      ({
        "--tab-primary": primary,
        "--tab-accent": accent,
      }) as CSSProperties,
    [primary, accent],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchPublicCustomerTab(phone);
    if (!data) {
      setNotFound(true);
      setTab(null);
    } else {
      setNotFound(false);
      setTab(data);
      const owed = toNum(data.balanceOwed);
      setAmount(owed > 0 ? owed.toFixed(2) : "");
    }
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!intentId || !promptSent || paid) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const st = await fetchPublicTabStkStatus(phone, intentId);
        if (cancelled) return;
        if (st.status === "fulfilled") {
          setPaid(true);
          setStatusMsg("Payment received — thank you!");
          setPromptSent(false);
          void reload();
          return;
        }
        if (st.status === "failed") {
          setStatusMsg("Payment didn’t go through. You can try again.");
          setPromptSent(false);
          setIntentId(null);
        }
      } catch {
        /* keep polling briefly */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intentId, promptSent, paid, phone, reload]);

  const owed = toNum(tab?.balanceOwed);
  const currency = tab?.currency || "KES";

  async function onPay() {
    setError(null);
    setStatusMsg(null);
    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amt > owed + 0.001) {
      setError(`Amount can’t exceed ${fmtMoney(owed, currency)}.`);
      return;
    }
    setBusy(true);
    try {
      const res = await initiatePublicTabStk(phone, amt, newIdempotencyKey());
      setIntentId(res.intentId);
      setPromptSent(true);
      setPaid(false);
      setStatusMsg("M-Pesa prompt sent — check your phone and enter your PIN.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send M-Pesa prompt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-[100dvh] text-stone-900"
      style={{
        ...themeStyle,
        background:
          "radial-gradient(120% 80% at 10% -10%, color-mix(in oklab, var(--tab-primary) 22%, transparent), transparent 55%), radial-gradient(90% 60% at 100% 0%, color-mix(in oklab, var(--tab-accent) 28%, transparent), transparent 50%), linear-gradient(165deg, #f7f3eb 0%, #efe8dc 48%, #e8f2ec 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 pb-10 pt-8 sm:px-6">
        <header className="mb-8 flex items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              className="h-11 w-11 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold text-white shadow-sm"
              style={{ background: primary }}
              aria-hidden
            >
              {(tab?.shopName || shopName).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="truncate font-[family-name:var(--font-display,Georgia,serif)] text-2xl font-semibold tracking-tight"
              style={{ color: primary }}
            >
              {tab?.shopName || shopName}
            </p>
            <p className="text-sm text-stone-600">Your tab · {phone}</p>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-stone-600">
            <Loader2 className="size-8 animate-spin" style={{ color: primary }} />
            <p className="text-sm">Loading your balance…</p>
          </div>
        ) : notFound ? (
          <div className="flex flex-1 flex-col justify-center gap-4 py-16">
            <h1 className="font-[family-name:var(--font-display,Georgia,serif)] text-3xl font-semibold tracking-tight">
              Tab not found
            </h1>
            <p className="max-w-sm text-stone-600">
              We couldn’t find an open tab for this number at this shop. If you
              just bought on credit, ask the cashier to confirm your phone is on
              the account.
            </p>
            <Link
              href="/shop"
              className="text-sm font-medium underline-offset-4 hover:underline"
              style={{ color: primary }}
            >
              Back to shop
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-10">
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-stone-500">
                Total owed
              </p>
              <p
                className="font-[family-name:var(--font-display,Georgia,serif)] text-5xl font-semibold tracking-tight sm:text-6xl"
                style={{ color: primary }}
              >
                {fmtMoney(owed, currency)}
              </p>
              {tab?.customerName ? (
                <p className="mt-3 text-base text-stone-600">
                  Hi {tab.customerName.trim()}
                </p>
              ) : null}
            </section>

            {owed > 0 ? (
              <section className="mb-12">
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Pay amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step="0.01"
                    max={owed}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={busy || promptSent}
                    className="min-w-0 flex-1 rounded-xl border border-stone-300/80 bg-white/80 px-4 py-3 text-lg outline-none ring-[var(--tab-primary)] focus:ring-2"
                  />
                  <Button
                    type="button"
                    disabled={busy || promptSent || owed <= 0}
                    onClick={() => void onPay()}
                    className="h-auto shrink-0 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-none"
                    style={{ background: primary }}
                  >
                    {busy ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      "Pay with M-Pesa"
                    )}
                  </Button>
                </div>
                {promptSent ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-stone-700">
                    <Smartphone className="mt-0.5 size-4 shrink-0" style={{ color: primary }} />
                    {statusMsg}
                  </p>
                ) : null}
                {paid ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="size-4" />
                    {statusMsg}
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 text-sm text-red-700">{error}</p>
                ) : null}
                {!promptSent && !paid && !error ? (
                  <p className="mt-3 text-xs text-stone-500">
                    We’ll send an M-Pesa prompt to {phone}. Enter your PIN to
                    clear this tab.
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="mb-12 rounded-2xl bg-white/50 px-4 py-5">
                <p className="flex items-center gap-2 font-medium text-emerald-900">
                  <CheckCircle2 className="size-5" />
                  You’re all settled — nothing owed.
                </p>
              </section>
            )}

            <section className="flex-1">
              <h2 className="mb-4 font-[family-name:var(--font-display,Georgia,serif)] text-xl font-semibold tracking-tight">
                On credit
              </h2>
              {(tab?.purchases?.length ?? 0) === 0 ? (
                <p className="text-sm text-stone-500">No recent tab purchases.</p>
              ) : (
                <ul className="space-y-6">
                  {tab!.purchases.map((row) => (
                    <li key={row.saleId} className="border-t border-stone-300/50 pt-4">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-800">
                            {row.receiptNo != null
                              ? `Receipt #${row.receiptNo}`
                              : "Purchase"}
                          </p>
                          <p className="text-xs text-stone-500">
                            {fmtDate(row.soldAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums">
                          {fmtMoney(row.creditAmount, currency)}
                        </p>
                      </div>
                      <ul className="space-y-1">
                        {row.lines.map((line, i) => (
                          <li
                            key={`${row.saleId}-${i}`}
                            className="flex justify-between gap-3 text-sm text-stone-600"
                          >
                            <span className="min-w-0 truncate">
                              {line.name}
                              {toNum(line.quantity) !== 1
                                ? ` × ${toNum(line.quantity)}`
                                : ""}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {fmtMoney(line.lineTotal, currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
