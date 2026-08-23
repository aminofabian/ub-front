"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  searchPublicShops,
  type PublicShopSearchResult,
} from "@/lib/api";
import {
  fetchShopperShops,
  sendShopperIdentifyCode,
  verifyShopperIdentifyCode,
} from "@/lib/apex-identify";
import {
  apexShopSearchQuery,
  buildApexForwardUrl,
} from "@/lib/apex-forward";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { businessNameToSlug } from "@/lib/shop-lookup";
import { cn } from "@/lib/utils";

import { landingRootStyle } from "./landing-styles";

/** Who the apex sheet is acting for — shopper or shop owner (Phase 4, §8). */
export type ApexSignInMode = "shopper" | "staff";

type LandingSignInModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateShop: () => void;
  /** Which door opened the sheet: "Sign in" → shopper; "Find shop" → staff. */
  initialMode?: ApexSignInMode;
};

type Step =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; query: string; rows: PublicShopSearchResult[] }
  | { status: "miss"; query: string }
  | { status: "phone-idle" }
  | { status: "phone-sending" }
  | { status: "phone-code"; phone: string }
  | { status: "phone-verifying"; phone: string }
  | { status: "phone-results"; rows: PublicShopSearchResult[] }
  | { status: "phone-empty" };

/** Shopper door on the shop host: phone-first sign-in back to the account. */
const SHOPPER_FORWARD_PATH = `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopAccount)}`;
/** Staff door on the shop host (D5 shape: office mode, back to the business hub). */
const STAFF_FORWARD_PATH = `${APP_ROUTES.staffLogin}?mode=office&next=${encodeURIComponent(APP_ROUTES.business)}`;

const RESEND_SECONDS = 60;

export function LandingSignInModal({
  open,
  onOpenChange,
  onCreateShop,
  initialMode = "shopper",
}: LandingSignInModalProps) {
  const [mode, setMode] = useState<ApexSignInMode>(initialMode);
  const [entryKind, setEntryKind] = useState<"name" | "phone">("name");
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState<Step>({ status: "idle" });
  const [forwardingSlug, setForwardingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setEntryKind("name");
      setQuery("");
      setPhone("");
      setCode("");
      setCountdown(0);
      setStep({ status: "idle" });
      setForwardingSlug(null);
    }
  }, [open, initialMode]);

  // Resend countdown for the OTP step.
  useEffect(() => {
    if (step.status !== "phone-code" || countdown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCountdown((value) => (value > 1 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step.status, countdown]);

  const previewSlug = businessNameToSlug(query);
  const previewHost = previewSlug
    ? `${previewSlug}.${PLATFORM_DOMAIN}`
    : `yourshop.${PLATFORM_DOMAIN}`;

  const forwardPath = mode === "staff" ? STAFF_FORWARD_PATH : SHOPPER_FORWARD_PATH;

  const go = (row: PublicShopSearchResult) => {
    if (forwardingSlug) {
      return;
    }
    setForwardingSlug(row.slug);
    // Give the shopper a beat to register the destination ("wrong shop?" back).
    window.setTimeout(() => {
      const url = buildApexForwardUrl(row, forwardPath);
      if (url) {
        window.location.assign(url);
      } else {
        setForwardingSlug(null);
        setStep({ status: "miss", query: row.name });
      }
    }, 900);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = apexShopSearchQuery(query);
    if (q.length < 2) {
      setStep({ status: "miss", query: "" });
      return;
    }
    setStep({ status: "loading" });
    const rows = await searchPublicShops(q);
    setStep(
      rows.length === 0
        ? { status: "miss", query: q }
        : { status: "results", query: q, rows },
    );
  };

  const onPhoneSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setStep({ status: "phone-idle" });
      setPhone("");
      return;
    }
    setStep({ status: "phone-sending" });
    const result = await sendShopperIdentifyCode(digits);
    if (!result) {
      setStep({ status: "phone-idle" });
      return;
    }
    setCode("");
    setCountdown(RESEND_SECONDS);
    setStep({ status: "phone-code", phone: digits });
  };

  const onCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step.status !== "phone-code") {
      return;
    }
    const digits = code.replace(/\D/g, "");
    if (digits.length < 4) {
      return;
    }
    setStep({ status: "phone-verifying", phone: step.phone });
    const verified = await verifyShopperIdentifyCode(step.phone, digits);
    if (!verified?.phoneVerificationToken) {
      setCode("");
      setStep({ status: "phone-code", phone: step.phone });
      return;
    }
    const rows = await fetchShopperShops(step.phone, verified.phoneVerificationToken);
    setStep(
      rows.length === 0 ? { status: "phone-empty" } : { status: "phone-results", rows },
    );
  };

  const switchMode = (next: ApexSignInMode) => {
    setMode(next);
    setEntryKind("name");
    setStep({ status: "idle" });
    setForwardingSlug(null);
  };

  const switchEntryKind = (next: "name" | "phone") => {
    setEntryKind(next);
    setForwardingSlug(null);
    setStep(next === "phone" ? { status: "phone-idle" } : { status: "idle" });
  };

  const startCreate = () => {
    onOpenChange(false);
    onCreateShop();
  };

  const heading = mode === "staff" ? "Where do you sell?" : "Which shop do you shop at?";
  const eyebrow = mode === "staff" ? "Ticket · Find till" : "Ticket · Sign in";
  const description =
    mode === "staff"
      ? "Enter your business name. We'll look up your shop and open the till on your subdomain."
      : "Tell us your shop's name or your phone number and we'll take you there to sign in — one tap, no password here.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "landing-page max-h-[min(92dvh,640px)] w-[calc(100vw-2rem)] max-w-md gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:size-8 [&>button]:rounded-none [&>button]:border [&>button]:border-[var(--kiosk-border)] [&>button]:bg-[var(--kiosk-elevated)] [&>button]:text-[var(--kiosk-text-muted)]",
        )}
        overlayClassName="bg-[rgba(20,20,18,0.62)] backdrop-blur-[3px]"
        style={landingRootStyle()}
      >
        <div className="landing-find-shop overflow-hidden border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_96%,#f3efe6)] shadow-[0_28px_80px_-24px_rgba(20,20,18,0.42)]">
          <div aria-hidden className="landing-find-shop-perf h-3 w-full" />

          <div className="px-5 pb-6 pt-4 sm:px-7">
            <DialogHeader className="space-y-2 text-left">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                {eyebrow}
              </p>
              <DialogTitle className="font-heading text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--kiosk-text)]">
                {heading}
              </DialogTitle>
              <DialogDescription className="text-[14px] leading-relaxed text-[var(--kiosk-text-muted)]">
                {description}
              </DialogDescription>
            </DialogHeader>

            <div
              className="mt-4 grid grid-cols-2 gap-1 border border-[var(--kiosk-border-soft)] bg-[var(--kiosk-bg)] p-1"
              role="tablist"
              aria-label="Sign in as"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "shopper"}
                onClick={() => switchMode("shopper")}
                className={cn(
                  "px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
                  mode === "shopper"
                    ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-bg)]"
                    : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
                )}
              >
                I&apos;m a shopper
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "staff"}
                onClick={() => switchMode("staff")}
                className={cn(
                  "px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
                  mode === "staff"
                    ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-bg)]"
                    : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
                )}
              >
                I run a shop
              </button>
            </div>

            {forwardingSlug ? (
              <div className="mt-6 border border-dashed border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                  {mode === "staff" ? "Match found" : "Taking you to"}
                </p>
                <p className="mt-2 font-heading text-2xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                  {step.status === "results" || step.status === "phone-results"
                    ? step.rows.find((row) => row.slug === forwardingSlug)?.name
                    : ""}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--kiosk-text-muted)]">
                  {step.status === "results" || step.status === "phone-results"
                    ? step.rows.find((row) => row.slug === forwardingSlug)?.primaryHost ??
                      previewHost
                    : previewHost}
                </p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                  Opening {mode === "staff" ? "till" : "sign in"}…
                </p>
                <button
                  type="button"
                  className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                  onClick={() => setForwardingSlug(null)}
                >
                  Wrong shop? Go back
                </button>
              </div>
            ) : step.status === "phone-idle" || step.status === "phone-sending" ? (
              <PhoneForm
                phone={phone}
                busy={step.status === "phone-sending"}
                onChange={setPhone}
                onSubmit={onPhoneSubmit}
              />
            ) : step.status === "phone-code" || step.status === "phone-verifying" ? (
              <CodeForm
                phone={step.status === "phone-code" ? step.phone : ""}
                code={code}
                busy={step.status === "phone-verifying"}
                countdown={countdown}
                onChange={setCode}
                onSubmit={onCodeSubmit}
                onResend={() =>
                  void sendShopperIdentifyCode(step.phone).then((result) => {
                    if (result) {
                      setCountdown(RESEND_SECONDS);
                    }
                  })
                }
                onBack={() => setStep({ status: "phone-idle" })}
              />
            ) : step.status === "phone-results" ? (
              <ResultsList
                rows={step.rows}
                onPick={go}
                onBack={() => setStep({ status: "phone-idle" })}
                backLabel="← Different number"
              />
            ) : step.status === "phone-empty" ? (
              <div className="mt-6 border border-dashed border-[color-mix(in_srgb,var(--kiosk-danger)_35%,var(--kiosk-border))] bg-[var(--kiosk-danger-bg)] px-3.5 py-3">
                <p className="text-[13px] text-[var(--kiosk-text)]">
                  We couldn&apos;t find any shops for that number. If you&apos;ve
                  shopped somewhere before, try its name instead.
                </p>
                <button
                  type="button"
                  className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                  onClick={() => switchEntryKind("name")}
                >
                  ← Search by shop name
                </button>
              </div>
            ) : step.status === "loading" ? (
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                Looking up…
              </p>
            ) : step.status === "results" && step.rows.length === 1 ? (
              <MatchCard
                row={step.rows[0]}
                mode={mode}
                onContinue={() => go(step.rows[0])}
                onEdit={() => setStep({ status: "idle" })}
              />
            ) : step.status === "results" ? (
              <ResultsList
                rows={step.rows}
                query={step.query}
                onPick={go}
                onBack={() => setStep({ status: "idle" })}
              />
            ) : step.status === "miss" ? (
              <div className="mt-6 border border-dashed border-[color-mix(in_srgb,var(--kiosk-danger)_35%,var(--kiosk-border))] bg-[var(--kiosk-danger-bg)] px-3.5 py-3">
                <p className="text-[13px] text-[var(--kiosk-text)]">
                  No shop found{step.query ? ` for “${step.query}”` : " — try a shop name"}.{" "}
                  {mode === "staff"
                    ? "If this is your shop, claim it and open the till."
                    : "If you can't remember the name, check your SMS receipts — your shop's name is on every one."}
                </p>
                <button
                  type="button"
                  className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                  onClick={startCreate}
                >
                  Start free instead →
                </button>
                <button
                  type="button"
                  className="mt-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                  onClick={() => setStep({ status: "idle" })}
                >
                  ← Try another name
                </button>
              </div>
            ) : (
              <div className="mt-6">
                {mode === "shopper" ? (
                  <div
                    className="mb-4 grid grid-cols-2 gap-1 border border-[var(--kiosk-border-soft)] bg-[var(--kiosk-bg)] p-1"
                    role="tablist"
                    aria-label="Find your shop by"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={entryKind === "name"}
                      onClick={() => switchEntryKind("name")}
                      className={cn(
                        "px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
                        entryKind === "name"
                          ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-bg)]"
                          : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
                      )}
                    >
                      Shop name
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={entryKind === "phone"}
                      onClick={() => switchEntryKind("phone")}
                      className={cn(
                        "px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
                        entryKind === "phone"
                          ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-bg)]"
                          : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
                      )}
                    >
                      Phone number
                    </button>
                  </div>
                ) : null}

                {entryKind === "phone" && mode === "shopper" ? (
                  <PhoneForm
                    phone={phone}
                    busy={false}
                    onChange={setPhone}
                    onSubmit={onPhoneSubmit}
                  />
                ) : (
                  <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                        {mode === "staff" ? "Business name" : "Shop name"}
                      </span>
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        autoFocus
                        autoComplete="organization"
                        placeholder={
                          mode === "staff" ? "e.g. Mama Njeri Shop" : "e.g. Mama Njeri Minimart"
                        }
                        className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
                      />
                    </label>

                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                      Looking for{" "}
                      <span className="text-[var(--kiosk-gold)]">{previewHost}</span>
                    </p>

                    <button
                      type="submit"
                      disabled={query.trim().length < 2}
                      className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
                    >
                      {mode === "staff" ? "Find shop" : "Continue"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhoneForm({
  phone,
  busy,
  onChange,
  onSubmit,
}: {
  phone: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          Phone number
        </span>
        <input
          value={phone}
          onChange={(event) => onChange(event.target.value.replace(/[^\d+\s-]/g, ""))}
          autoFocus
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="e.g. 0714 282 874"
          className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
        />
      </label>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
        We&apos;ll text you a code to verify it&apos;s you.
      </p>
      <button
        type="submit"
        disabled={busy || phone.replace(/\D/g, "").length < 9}
        className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send my code"}
      </button>
    </form>
  );
}

function CodeForm({
  phone,
  code,
  busy,
  countdown,
  onChange,
  onSubmit,
  onResend,
  onBack,
}: {
  phone: string;
  code: string;
  busy: boolean;
  countdown: number;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const masked = phone.length >= 4 ? `••••${phone.slice(-4)}` : phone;
  return (
    <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          Enter the code we texted {masked}
        </span>
        <input
          value={code}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
          autoFocus
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="1234"
          className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-center text-lg font-semibold tracking-[0.35em] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || code.replace(/\D/g, "").length < 4}
        className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
      >
        {busy ? "Checking…" : "Verify"}
      </button>
      {countdown > 0 ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
          Resend in {countdown}s
        </p>
      ) : (
        <button
          type="button"
          onClick={onResend}
          className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
        >
          Resend code
        </button>
      )}
      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
      >
        ← Wrong number
      </button>
    </form>
  );
}

function ResultsList({
  rows,
  query,
  onPick,
  onBack,
  backLabel = "← Not your shop",
}: {
  rows: PublicShopSearchResult[];
  query?: string;
  onPick: (row: PublicShopSearchResult) => void;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="mt-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
        {query ? `${rows.length} shops match “${query}”` : `${rows.length} shop${rows.length === 1 ? "" : "s"} found`}
      </p>
      <ul className="mt-2 divide-y divide-[var(--kiosk-border-soft)] border-y border-[var(--kiosk-border-soft)]">
        {rows.map((row) => (
          <li key={row.slug}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-[var(--kiosk-gold-soft)]"
              onClick={() => onPick(row)}
            >
              <span className="min-w-0">
                <span className="block truncate font-heading text-[15px] font-semibold tracking-[-0.01em] text-[var(--kiosk-text)]">
                  {row.name}
                </span>
                <span className="block truncate font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--kiosk-text-muted)]">
                  {row.primaryHost ?? `${row.slug}.${PLATFORM_DOMAIN}`}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)]">
                Continue →
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
        onClick={onBack}
      >
        {backLabel}
      </button>
    </div>
  );
}

function MatchCard({
  row,
  mode,
  onContinue,
  onEdit,
}: {
  row: PublicShopSearchResult;
  mode: ApexSignInMode;
  onContinue: () => void;
  onEdit: () => void;
}) {
  const host = row.primaryHost ?? `${row.slug}.${PLATFORM_DOMAIN}`;
  return (
    <div className="mt-6">
      <div className="border border-dashed border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
          Match found
        </p>
        <p className="mt-2 font-heading text-2xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
          {row.name}
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--kiosk-text-muted)]">
          {host}
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="landing-nav-ticket landing-nav-ticket--primary mt-4 w-full justify-center"
      >
        {mode === "staff" ? "Open till" : "Sign in"}
      </button>
      <button
        type="button"
        className="mt-3 block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
        onClick={onEdit}
      >
        Wrong shop? Go back
      </button>
    </div>
  );
}
