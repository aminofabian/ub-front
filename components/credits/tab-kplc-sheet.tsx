"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Loader2, X, Zap } from "lucide-react";

import {
  fetchPublicTabKplcConfig,
  fetchPublicTabKplcTokens,
  removePublicTabKplcMeter,
  type PublicTabKplcConfig,
  type PublicTabKplcToken,
} from "@/lib/public-customer-tab";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full border border-[var(--tab-border)] bg-[var(--tab-input)] px-3 py-2.5 text-[16px] font-semibold tabular-nums outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--tab-focus)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_28%,transparent)] disabled:opacity-50";

const btnPrimaryClass =
  "flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)] active:opacity-85 disabled:cursor-not-allowed disabled:opacity-45";

function money(n: number, currency = "KES") {
  return formatMoneyCompact(n, resolveCurrencyCode(currency));
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function meterLooksValid(raw: string): boolean {
  const digits = digitsOnly(raw);
  return digits.length >= 8 && digits.length <= 13;
}

function formatMeterDisplay(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length < 8) return raw;
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatTokenNo(raw: string): string {
  const digits = raw.replace(/\s/g, "");
  if (digits.length < 8) return raw;
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function toAmount(value: number | string | null | undefined): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatTokenDate(iso: string | null): string {
  if (!iso) return "Date unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const comingSoonMuted =
  "color-mix(in_oklab, var(--tab-bg) 72%, var(--tab-fg))";

function TokenSlipSlots({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn("flex items-end justify-between gap-1.5", compact ? "mt-3" : "mt-4")}
      aria-hidden
    >
      {Array.from({ length: 5 }, (_, group) => (
        <span
          key={group}
          className="flex gap-[3px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:ease-out"
          style={{ animationDelay: `${group * 70}ms` }}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              className={cn("inline-block border", compact ? "h-4 w-[0.45rem]" : "h-5 w-[0.55rem]")}
              style={{
                borderColor: "color-mix(in_oklab, var(--tab-bg) 38%, transparent)",
                backgroundColor:
                  group === 4 && i === 3
                    ? "color-mix(in_oklab, var(--tab-bg) 28%, transparent)"
                    : "transparent",
              }}
            />
          ))}
        </span>
      ))}
    </div>
  );
}

function ComingSoonBuy({ compact }: { compact: boolean }) {
  return (
    <div
      className={cn(
        "bg-[var(--tab-fg)] text-[var(--tab-bg)]",
        compact ? "px-3 py-3" : "px-3 py-4",
      )}
      role="status"
    >
      <p
        className={cn(
          "font-semibold tracking-[-0.03em]",
          compact ? "text-[1.25rem] leading-none" : "text-[1.75rem] leading-[0.95]",
        )}
      >
        Coming soon
      </p>
      <p
        className={cn(
          "font-semibold tracking-[-0.02em]",
          compact ? "mt-1.5 text-[13px]" : "mt-2 text-[15px]",
        )}
      >
        Buy a token from this tab
      </p>
      <TokenSlipSlots compact={compact} />
      <p
        className={cn("leading-snug", compact ? "mt-2.5 text-[12px]" : "mt-3 text-[13px]")}
        style={{ color: comingSoonMuted }}
      >
        {compact
          ? "Look up stays open. Paying for a new token here is next."
          : "Look up any token already on this meter. Paying for a new one here is next."}
      </p>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  tabPhone: string;
  keyboardInset: number;
  fieldIdPrefix: string;
};

export function TabKplcSheet({
  open,
  onClose,
  tabPhone,
  keyboardInset,
  fieldIdPrefix,
}: Props) {
  const [config, setConfig] = useState<PublicTabKplcConfig | null>(null);
  const [meter, setMeter] = useState("");
  const [tokens, setTokens] = useState<PublicTabKplcToken[] | null>(null);
  const [loadedMeter, setLoadedMeter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const openedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      openedFor.current = null;
      return;
    }
    if (openedFor.current === tabPhone) return;
    openedFor.current = tabPhone;
    let stopped = false;
    setError(null);
    setTokens(null);
    setLoadedMeter(null);
    setExpanded(null);
    setBusy(true);
    fetchPublicTabKplcConfig(tabPhone)
      .then(async (next) => {
        if (stopped) return;
        setConfig(next);
        const last = next?.meters?.[0]?.meterNumber;
        if (!last) {
          setMeter("");
          setBusy(false);
          return;
        }
        setMeter(last);
        setBusy(false);
        await lookup(tabPhone, last, (fresh) => {
          if (!stopped) setConfig(fresh);
        });
      })
      .catch((e) => {
        if (!stopped) {
          setError(e instanceof Error ? e.message : "Could not load saved meters.");
          setBusy(false);
        }
      });
    return () => {
      stopped = true;
    };
  }, [open, tabPhone]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  async function lookup(
    phone: string,
    rawMeter: string,
    onConfig?: (next: PublicTabKplcConfig) => void,
  ) {
    const digits = digitsOnly(rawMeter);
    if (!meterLooksValid(digits)) {
      setError("Enter the meter number as printed on the meter or last slip.");
      return;
    }
    setBusy(true);
    setError(null);
    setExpanded(null);
    try {
      const history = await fetchPublicTabKplcTokens(phone, digits);
      setTokens(history.tokens);
      setLoadedMeter(history.meterNumber);
      setMeter(history.meterNumber);
      const fresh = await fetchPublicTabKplcConfig(phone);
      if (fresh) {
        setConfig(fresh);
        onConfig?.(fresh);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tokens for this meter.");
      setTokens(null);
      setLoadedMeter(null);
    } finally {
      setBusy(false);
    }
  }

  async function forget(meterNumber: string) {
    setBusy(true);
    setError(null);
    try {
      const next = await removePublicTabKplcMeter(tabPhone, meterNumber);
      setConfig(next);
      if (digitsOnly(meter) === digitsOnly(meterNumber)) {
        const fallback = next.meters[0]?.meterNumber ?? "";
        setMeter(fallback);
        setTokens(null);
        setLoadedMeter(null);
        if (fallback) {
          await lookup(tabPhone, fallback);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove that meter.");
    } finally {
      setBusy(false);
    }
  }

  async function copyToken(tokenNo: string) {
    try {
      await navigator.clipboard.writeText(tokenNo.replace(/\s/g, ""));
      setCopied(tokenNo);
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Could not copy the token. Long-press to copy it yourself.");
    }
  }

  if (!open) return null;

  const meters = config?.meters ?? [];
  const buyingSoon = config?.purchaseAvailable !== true;
  const canLookup = meterLooksValid(meter) && !busy;
  const sameLoadedMeter =
    loadedMeter != null && digitsOnly(meter) === loadedMeter;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${fieldIdPrefix}-kplc-title`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[92dvh] w-full flex-col border-t-2 border-[var(--tab-border)] bg-[var(--tab-card)] motion-safe:animate-in motion-safe:slide-in-from-bottom-full motion-safe:duration-200 motion-safe:ease-out"
        style={{
          paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom))`,
        }}
      >
        <div className="flex shrink-0 justify-center py-1.5" aria-hidden>
          <div className="h-1 w-10 bg-[var(--tab-border)]" />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
          <h2
            id={`${fieldIdPrefix}-kplc-title`}
            className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.02em]"
          >
            <Zap className="size-4" aria-hidden />
            KPLC tokens
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)]"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          {buyingSoon ? (
            <ComingSoonBuy compact={Boolean(tokens && tokens.length > 0)} />
          ) : null}

          <label
            htmlFor={`${fieldIdPrefix}-kplc-meter`}
            className="mt-3 mb-1.5 block text-[13px] font-medium"
          >
            Meter number
          </label>
          <input
            id={`${fieldIdPrefix}-kplc-meter`}
            inputMode="numeric"
            autoComplete="off"
            value={meter}
            disabled={busy}
            onChange={(e) => {
              setMeter(digitsOnly(e.target.value));
              setError(null);
            }}
            placeholder="As printed on the meter"
            className={fieldClass}
          />

          {meters.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {meters.map((saved) => {
                const selected = digitsOnly(meter) === saved.meterNumber;
                return (
                  <li key={saved.meterNumber}>
                    <div className="flex items-stretch gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setMeter(saved.meterNumber);
                          void lookup(tabPhone, saved.meterNumber);
                        }}
                        className={cn(
                          "flex min-h-10 min-w-0 flex-1 items-center px-3 text-left text-[14px] font-semibold tabular-nums disabled:opacity-40",
                          selected
                            ? "border border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                            : "border border-[var(--tab-border)] bg-[var(--tab-input)]",
                        )}
                      >
                        {formatMeterDisplay(saved.meterNumber)}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void forget(saved.meterNumber)}
                        className="flex size-10 shrink-0 items-center justify-center border border-[var(--tab-border)] text-[var(--tab-muted)] disabled:opacity-40"
                        aria-label={`Remove meter ${formatMeterDisplay(saved.meterNumber)}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12px] text-[var(--tab-muted)]">
              Saved on this tab, so the next phone you open it on still knows the meter.
            </p>
          )}

          {error ? (
            <p
              role="alert"
              className="mt-3 border border-[var(--tab-error-fg)] bg-[var(--tab-error-bg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
            >
              {error}
            </p>
          ) : null}

          {busy && tokens == null ? (
            <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--tab-muted)]">
              <Loader2 className="size-4 animate-spin" />
              Looking up tokens…
            </p>
          ) : null}

          {tokens && loadedMeter ? (
            <section className="mt-4">
              <h3 className="text-[15px] font-semibold tracking-[-0.02em]">
                Recent tokens
              </h3>
              {tokens.length === 0 ? (
                <p className="mt-2 text-[13px] leading-snug text-[var(--tab-muted)]">
                  No tokens on {formatMeterDisplay(loadedMeter)} yet.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-[var(--tab-border)] border-y border-[var(--tab-border)] bg-[var(--tab-bg)]">
                  {tokens.map((token) => {
                    const key = `${token.tokenNo}-${token.purchasedAt ?? ""}`;
                    const openRow = expanded === key;
                    const amount = toAmount(token.amount);
                    const units = toAmount(token.units);
                    return (
                      <li key={key}>
                        <div className="px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setExpanded(openRow ? null : key)}
                              className="min-w-0 flex-1 text-left"
                              aria-expanded={openRow}
                            >
                              <p className="text-[15px] font-semibold tabular-nums">
                                {amount != null ? money(amount) : "Token"}
                                {units != null ? (
                                  <span className="font-medium text-[var(--tab-muted)]">
                                    {" "}
                                    · {units.toLocaleString("en-KE")} kWh
                                  </span>
                                ) : null}
                              </p>
                              <p className="mt-0.5 text-[12px] text-[var(--tab-muted)]">
                                {formatTokenDate(token.purchasedAt)}
                                {token.paymentMethod ? ` · ${token.paymentMethod}` : ""}
                              </p>
                            </button>
                            <ChevronDown
                              className={cn(
                                "mt-1 size-3.5 shrink-0 text-[var(--tab-muted)] transition-transform duration-200",
                                openRow && "rotate-180",
                              )}
                              aria-hidden
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => void copyToken(token.tokenNo)}
                            className="mt-2 flex w-full items-center justify-between gap-2 border border-[var(--tab-border)] bg-[var(--tab-card)] px-2.5 py-2 text-left"
                          >
                            <span className="min-w-0 font-mono text-[13px] font-semibold tabular-nums tracking-wide">
                              {formatTokenNo(token.tokenNo)}
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--tab-muted)]">
                              {copied === token.tokenNo ? (
                                <>
                                  <Check className="size-3.5" aria-hidden />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3.5" aria-hidden />
                                  Copy
                                </>
                              )}
                            </span>
                          </button>
                          {openRow && token.concepts?.length ? (
                            <ul className="mt-2 space-y-1.5 border-t border-[var(--tab-border)] pt-2">
                              {token.concepts.map((concept, index) => {
                                const line = toAmount(concept.amount);
                                return (
                                  <li
                                    key={`${concept.code}-${index}`}
                                    className="flex items-baseline justify-between gap-3 text-[12px]"
                                  >
                                    <span className="min-w-0 text-[var(--tab-muted)]">
                                      {concept.label}
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                      {line != null ? money(line) : "—"}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--tab-border)] px-4 py-2.5">
          <button
            type="button"
            disabled={!canLookup}
            onClick={() => void lookup(tabPhone, meter)}
            className={btnPrimaryClass}
            style={{
              backgroundColor: "var(--tab-cta-bg)",
              color: "var(--tab-cta-fg)",
            }}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Looking up…
              </>
            ) : sameLoadedMeter ? (
              "Look up again"
            ) : (
              "Look up tokens"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
