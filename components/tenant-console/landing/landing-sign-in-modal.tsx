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
  | { status: "miss"; query: string };

/** Shopper door on the shop host: phone-first sign-in back to the account. */
const SHOPPER_FORWARD_PATH = `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopAccount)}`;
/** Staff door on the shop host (D5 shape: office mode, back to the business hub). */
const STAFF_FORWARD_PATH = `${APP_ROUTES.staffLogin}?mode=office&next=${encodeURIComponent(APP_ROUTES.business)}`;

export function LandingSignInModal({
  open,
  onOpenChange,
  onCreateShop,
  initialMode = "shopper",
}: LandingSignInModalProps) {
  const [mode, setMode] = useState<ApexSignInMode>(initialMode);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>({ status: "idle" });
  const [forwardingSlug, setForwardingSlug] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setQuery("");
      setStep({ status: "idle" });
      setForwardingSlug(null);
    }
  }, [open, initialMode]);

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

  const switchMode = (next: ApexSignInMode) => {
    setMode(next);
    setStep({ status: "idle" });
    setForwardingSlug(null);
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
      : "Enter your shop's name and we'll take you there to sign in — one tap, no password here.";

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
                  {step.status === "results"
                    ? step.rows.find((row) => row.slug === forwardingSlug)?.name
                    : ""}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--kiosk-text-muted)]">
                  {step.status === "results"
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
              <div className="mt-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                  {step.rows.length} shops match “{step.query}”
                </p>
                <ul className="mt-2 divide-y divide-[var(--kiosk-border-soft)] border-y border-[var(--kiosk-border-soft)]">
                  {step.rows.map((row) => (
                    <li key={row.slug}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-2 py-3 text-left hover:bg-[var(--kiosk-gold-soft)]"
                        onClick={() => go(row)}
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
                  onClick={() => setStep({ status: "idle" })}
                >
                  ← Not your shop
                </button>
              </div>
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
              <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    {mode === "staff" ? "Business name" : "Shop name"}
                  </span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                    }}
                    autoFocus
                    autoComplete="organization"
                    placeholder={
                      mode === "staff" ? "e.g. Mama Njeri Shop" : "e.g. Mama Njeri Minimart"
                    }
                    className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
                  />
                </label>

                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                  Looking for <span className="text-[var(--kiosk-gold)]">{previewHost}</span>
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
        </div>
      </DialogContent>
    </Dialog>
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
