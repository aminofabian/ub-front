"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PackageSearch, ShieldCheck } from "lucide-react";

import {
  fetchPublicOrderTracking,
  fetchPublicOrderTrackingByToken,
  type PublicOrderTracking,
} from "@/lib/public-storefront-client";
import { APP_ROUTES } from "@/lib/config";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { useStorefrontSignIn } from "@/components/storefront/storefront-sign-in-sheet";

function statusLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "Placed";
  return s.replace(/_/g, " ");
}

function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "your phone";
  return `••••${digits.slice(-4)}`;
}

/**
 * Guest order tracking page — the link quoted in the WhatsApp order message.
 * Phase 5: when the link carries a one-tap receipt token (`?t=`), the order
 * verifies without the phone-last-4 prompt and offers to continue into the
 * sign-in sheet prefilled with the order's phone.
 */
export default function ShopOrderTrackView({ slug }: { slug: string }) {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params?.code ?? "").trim();
  const { available, open } = useStorefrontSignIn();

  const [last4, setLast4] = useState("");
  const [searching, setSearching] = useState(false);
  const [tracking, setTracking] = useState<PublicOrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const [usedToken, setUsedToken] = useState(false);

  useEffect(() => {
    if (!code) return;
    let token = "";
    try {
      token = new URLSearchParams(window.location.search).get("t") ?? "";
    } catch {
      /* keep empty */
    }

    if (token) {
      setUsedToken(true);
      void runTokenLookup(token);
      return;
    }

    // Auto-verify with a stored last-4 when present (session convenience).
    try {
      const stored = window.sessionStorage.getItem("ub.orderPhoneLast4.v1");
      if (stored && stored.length === 4) {
        setLast4(stored);
        void runLookup(stored);
      } else {
        setAsked(true);
      }
    } catch {
      setAsked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function runTokenLookup(token: string) {
    setSearching(true);
    setError(null);
    try {
      const result = await fetchPublicOrderTrackingByToken(slug, code, token);
      if (!result) {
        // Generic on purpose (backend never distinguishes order/token failures):
        // fall back to the phone-last-4 form, which still works.
        setTracking(null);
        setError(
          "This link has expired or was already used. Enter the last 4 digits of the phone you ordered with to check instead.",
        );
        setAsked(true);
        return;
      }
      setTracking(result);
    } finally {
      setSearching(false);
    }
  }

  async function runLookup(phoneLast4: string) {
    const last4Digits = phoneLast4.replace(/\D/g, "");
    if (last4Digits.length !== 4) {
      setError("Enter the last 4 digits of the phone number you ordered with.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const result = await fetchPublicOrderTracking(slug, code, last4Digits);
      if (!result) {
        setError("No order found with that code and phone. Double-check both and try again.");
        setTracking(null);
        return;
      }
      setTracking(result);
      try {
        window.sessionStorage.setItem("ub.orderPhoneLast4.v1", last4Digits);
      } catch {
        /* ignore */
      }
    } finally {
      setSearching(false);
    }
  }

  const continueToAccount = () => {
    if (!tracking?.customerPhone) return;
    if (!available) {
      window.location.assign(
        `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopAccount)}`,
      );
      return;
    }
    // Phase 5: the receipt token verified this phone — prefill the sheet's
    // phone step so sign-in is one tap away (OTP still gates the session).
    open({ reason: "header", next: APP_ROUTES.shopAccount, initialPhone: tracking.customerPhone });
  };

  const backToManual = () => {
    setTracking(null);
    setError(null);
    setAsked(true);
  };

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center gap-5 px-5 py-12">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <PackageSearch className="size-7" strokeWidth={1.5} aria-hidden />
      </div>

      {tracking ? (
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Order {tracking.orderCode}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {formatDisplayPrice(tracking.currency, Number(tracking.grandTotal))}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tracking.catalogBranchName}
          </p>

          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-900 dark:text-amber-200">
                {statusLabel(tracking.status)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fulfilment</span>
              <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-sky-900 dark:text-sky-200">
                {statusLabel(tracking.fulfillmentStatus)}
              </span>
            </div>
          </div>

          {tracking.receiptVerified ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-900">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                This is your order
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Phone on file: {maskPhone(tracking.customerPhone)}. Continue to open your
                account — we&apos;ll text you a code to verify.
              </p>
              <button
                type="button"
                onClick={continueToAccount}
                className="mt-3 h-10 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Continue to your account
              </button>
              <button
                type="button"
                onClick={backToManual}
                className="mt-2 w-full text-center text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
              >
                Not your order? Check by phone instead
              </button>
            </div>
          ) : (
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-900">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              The shop was notified when you ordered. They may call you to confirm
              stock and how you&apos;ll pay.
            </p>
          )}
        </div>
      ) : (
        <form
          className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void runLookup(last4);
          }}
        >
          <h1 className="text-xl font-bold tracking-tight">Track order {code}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {usedToken
              ? "Check your order with the phone you used when ordering."
              : "Enter the last 4 digits of the phone number you used when ordering."}
          </p>
          <label className="mt-5 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last 4 digits of your phone
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="2874"
              className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          {error ? (
            <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={searching || last4.length !== 4}
            className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {searching ? "Looking up…" : asked ? "Check status" : "Checking…"}
          </button>
        </form>
      )}

      <Link
        href={APP_ROUTES.shop}
        className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Continue shopping
      </Link>
    </div>
  );
}
