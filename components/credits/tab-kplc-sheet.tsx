"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";

import {
  fetchPublicTabKplcConfig,
  fetchPublicTabKplcTokens,
  removePublicTabKplcMeter,
  setPublicTabKplcDepletionAlerts,
  type PublicTabKplcConfig,
  type PublicTabKplcDepletion,
  type PublicTabKplcMonthSpend,
  type PublicTabKplcStats,
  type PublicTabKplcToken,
} from "@/lib/public-customer-tab";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import {
  formatKplcClock,
  kplcEstimateCopy,
  resolveKplcEstimate,
  type KplcLiveEstimate,
} from "@/lib/kplc-estimate";
import { cn } from "@/lib/utils";
import { TabOverlay } from "@/components/credits/tab-overlay";
import { TabDestinationHeader } from "@/components/credits/tab-destination";
import styles from "@/components/credits/customer-tab-mobile.module.css";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tab-fg)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)]";

function money(n: number, currency = "KES") {
  return formatMoneyCompact(n, resolveCurrencyCode(currency));
}

function kwhLabel(n: number): string {
  return `${n.toLocaleString("en-KE", { maximumFractionDigits: 1 })} kWh`;
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

function formatAbsoluteTokenDate(iso: string): string {
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

function formatPurchaseDate(iso: string | null): string {
  if (!iso) return "Date unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function compactTimeLeft(empty: Date, nowMs = Date.now()): string {
  const diffMs = empty.getTime() - nowMs;
  if (diffMs <= 0) return "already out";
  const hours = Math.max(1, Math.round(diffMs / 3_600_000));
  if (hours < 24) return `~${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  const dayBit = `${days} day${days === 1 ? "" : "s"}`;
  if (remH === 0) return `~${dayBit}`;
  return `~${dayBit} ${remH} hour${remH === 1 ? "" : "s"}`;
}

function formatDepletionDate(empty: Date): string {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  }).format(empty);
  return `${weekday} ${formatKplcClock(empty)}`;
}

function monthKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!year || !month) return null;
  return `${year}-${month}`;
}

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, 15, 12));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);
}

function statsFromTokens(tokens: PublicTabKplcToken[]): PublicTabKplcStats {
  const buckets = new Map<string, PublicTabKplcMonthSpend>();
  let allTimeAmount = 0;
  let allTimeCount = 0;
  for (const token of tokens) {
    if (!token.purchasedAt) continue;
    const key = monthKey(token.purchasedAt);
    if (!key) continue;
    const amount = toAmount(token.amount) ?? 0;
    const units = toAmount(token.units) ?? 0;
    const current = buckets.get(key) ?? {
      yearMonth: key,
      label: monthLabel(key),
      amount: 0,
      units: 0,
      tokenCount: 0,
    };
    buckets.set(key, {
      ...current,
      amount: Number(current.amount) + amount,
      units: Number(current.units) + units,
      tokenCount: current.tokenCount + 1,
    });
    allTimeAmount += amount;
    allTimeCount += 1;
  }
  const months = [...buckets.values()].sort((a, b) =>
    a.yearMonth < b.yearMonth ? 1 : -1,
  );
  const nowKey = monthKey(new Date().toISOString());
  const thisMonth = months.find((m) => m.yearMonth === nowKey);
  return {
    thisMonthAmount: thisMonth ? Number(thisMonth.amount) : 0,
    thisMonthUnits: thisMonth ? Number(thisMonth.units) : 0,
    thisMonthCount: thisMonth?.tokenCount ?? 0,
    allTimeAmount,
    allTimeCount,
    months,
  };
}

function RemainingFace({ live }: { live: KplcLiveEstimate | null }) {
  if (!live) {
    return (
      <div className={styles.meterFace}>
        <p className={styles.meterAmount}>—</p>
        <p className={styles.meterCaption}>
          After the next token we can time how fast this meter drinks units.
        </p>
      </div>
    );
  }

  const empty = live.emptyAt;
  const out =
    live.alreadyEmpty || (empty != null && empty.getTime() <= Date.now());
  const remaining = live.remainingUnits;

  return (
    <div className={styles.meterFace}>
      {out ? (
        <>
          <p className={styles.meterAmount}>Out</p>
          <p className={styles.meterCaption}>
            {empty ? (
              <>
                Was due{" "}
                <time dateTime={empty.toISOString()}>{formatDepletionDate(empty)}</time>
              </>
            ) : (
              "Likely already empty"
            )}
            {remaining > 0 ? ` · ${kwhLabel(remaining)} on the last estimate` : ""}
          </p>
        </>
      ) : (
        <>
          <p className={styles.meterAmount}>{kwhLabel(remaining)}</p>
          <p className={styles.meterCaption}>
            {empty ? (
              <>
                Empty{" "}
                <time dateTime={empty.toISOString()}>{formatDepletionDate(empty)}</time>
                <span> · {compactTimeLeft(empty)}</span>
              </>
            ) : (
              "Units remaining on this meter"
            )}
          </p>
        </>
      )}
    </div>
  );
}

function PurchaseRow({
  token,
  copied,
  onCopy,
}: {
  token: PublicTabKplcToken;
  copied: boolean;
  onCopy: () => void;
}) {
  const amount = toAmount(token.amount);
  const units = toAmount(token.units);
  const formatted = formatTokenNo(token.tokenNo);
  const headline = units != null ? kwhLabel(units) : "Token";

  return (
    <li className="overflow-hidden odd:bg-[color-mix(in_oklab,var(--tab-focus)_4.5%,var(--tab-card))]">
      <button
        type="button"
        onClick={onCopy}
        className="flex w-full items-start gap-3 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] active:bg-[var(--tab-chip)]"
        aria-label={copied ? `Copied ${formatted}` : `Copy token ${formatted}`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">
            {headline}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--tab-muted)]">
            <time
              dateTime={token.purchasedAt ?? undefined}
              title={
                token.purchasedAt
                  ? formatAbsoluteTokenDate(token.purchasedAt)
                  : undefined
              }
            >
              {formatPurchaseDate(token.purchasedAt)}
            </time>
            {copied ? (
              <span className="text-[var(--tab-success-fg)]"> · copied</span>
            ) : (
              <span> · {formatted}</span>
            )}
          </p>
        </div>
        <p className="shrink-0 text-[15px] font-semibold tabular-nums tracking-[-0.02em]">
          {amount != null ? money(amount) : ""}
        </p>
      </button>
    </li>
  );
}

function LookupSkeleton() {
  return (
    <div className="space-y-6 px-1 py-2" aria-hidden>
      <div className="border-2 border-[var(--tab-border)] px-4 py-5">
        <div className="mx-auto h-7 w-40 bg-[var(--tab-border)]" />
        <div className="mx-auto mt-3 h-3 w-28 bg-[var(--tab-border)]" />
      </div>
      <div className="h-3 w-24 bg-[var(--tab-border)]" />
      <div className="h-4 w-32 bg-[var(--tab-border)]" />
      <div className="h-px w-full bg-[var(--tab-border)]" />
      <div className="h-4 w-28 bg-[var(--tab-border)]" />
      <div className="h-4 w-36 bg-[var(--tab-border)]" />
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
  const [stats, setStats] = useState<PublicTabKplcStats | null>(null);
  const [depletion, setDepletion] = useState<PublicTabKplcDepletion | null>(null);
  const [loadedMeter, setLoadedMeter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [addingMeter, setAddingMeter] = useState(false);
  const [showSpend, setShowSpend] = useState(false);
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
    setStats(null);
    setDepletion(null);
    setLoadedMeter(null);
    setAddingMeter(false);
    setShowSpend(false);
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
    try {
      const history = await fetchPublicTabKplcTokens(phone, digits);
      setTokens(history.tokens);
      setStats(history.stats ?? statsFromTokens(history.tokens));
      setDepletion(history.depletion ?? null);
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
      setStats(null);
      setDepletion(null);
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
        setStats(null);
        setDepletion(null);
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

  async function toggleDepletionAlerts(enabled: boolean) {
    if (!loadedMeter) return;
    setBusy(true);
    setError(null);
    try {
      const next = await setPublicTabKplcDepletionAlerts(tabPhone, loadedMeter, enabled);
      setDepletion(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update reminders.");
    } finally {
      setBusy(false);
    }
  }

  const resolvedStats = useMemo(() => {
    if (stats?.months?.length) return stats;
    if (tokens?.length) return statsFromTokens(tokens);
    return stats;
  }, [stats, tokens]);

  const sortedTokens = useMemo(() => {
    if (!tokens?.length) return [];
    return [...tokens].sort((a, b) =>
      (b.purchasedAt || "").localeCompare(a.purchasedAt || ""),
    );
  }, [tokens]);

  if (!open) return null;

  const meters = config?.meters ?? [];
  const buyingSoon = config?.purchaseAvailable !== true;
  const canLookup = meterLooksValid(meter) && !busy;
  const sameLoadedMeter =
    loadedMeter != null && digitsOnly(meter) === loadedMeter;
  const latest = sortedTokens[0] ?? null;
  const live = resolveKplcEstimate(sortedTokens, depletion, latest);
  const meterKnown = meters.some((saved) => saved.meterNumber === digitsOnly(meter));
  const showMeterInput = meters.length === 0 || addingMeter || (Boolean(meter) && !meterKnown);
  const daily = live && live.dailyUseUnits > 0 ? live.dailyUseUnits : null;
  const canRemind = Boolean(live && depletion);
  const lookingUp = busy && tokens == null;

  const latestFormatted = latest ? formatTokenNo(latest.tokenNo) : null;

  return (
    <TabOverlay
      open={open}
      onClose={onClose}
      labelledBy={`${fieldIdPrefix}-kplc-title`}
      keyboardInset={keyboardInset}
      size="destination"
    >
      <TabDestinationHeader
        title="Tokens"
        titleId={`${fieldIdPrefix}-kplc-title`}
        onClose={onClose}
        closeLabel="Back to tab"
        kicker={
          loadedMeter ? formatMeterDisplay(loadedMeter) : meters.length ? "Pick a meter" : "Add a meter"
        }
        trailing={
          resolvedStats && resolvedStats.months.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowSpend((current) => !current)}
              className={cn(
                "px-2 text-[13px] font-medium text-[var(--tab-muted)]",
                focusRing,
              )}
            >
              {showSpend ? "Hide spend" : "Spend"}
            </button>
          ) : null
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? (
          <p
            role="alert"
            className="mx-4 mb-3 border border-[var(--tab-error-fg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
          >
            {error}
          </p>
        ) : null}

        {lookingUp ? (
          <>
            <div className="sr-only" role="status">
              Looking up tokens…
            </div>
            <LookupSkeleton />
          </>
        ) : (
          <>
            <RemainingFace live={live} />

            {latest && latestFormatted ? (
              <div className="px-4">
                <button
                  type="button"
                  onClick={() => void copyToken(latest.tokenNo)}
                  className={cn(styles.tokenSlip, focusRing)}
                  aria-label={
                    copied === latest.tokenNo
                      ? `Copied ${latestFormatted}`
                      : `Copy token ${latestFormatted}`
                  }
                >
                  <p className={styles.tokenKicker}>
                    Latest token · tap to copy
                  </p>
                  <p className={styles.tokenNo}>{latestFormatted}</p>
                  <p className={styles.tokenHint}>
                    {copied === latest.tokenNo
                      ? "Copied"
                      : formatPurchaseDate(latest.purchasedAt)}
                    {toAmount(latest.units) != null
                      ? ` · ${kwhLabel(toAmount(latest.units)!)}`
                      : ""}
                  </p>
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-4">
              {daily != null ? (
                <p className="text-[13px] text-[var(--tab-muted)]">
                  {kwhLabel(daily)} / day
                </p>
              ) : null}
              {canRemind ? (
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={depletion?.alertsEnabled}
                  onClick={() =>
                    void toggleDepletionAlerts(!depletion?.alertsEnabled)
                  }
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold disabled:opacity-40",
                    focusRing,
                  )}
                >
                  <Bell
                    className="size-3.5"
                    fill={depletion?.alertsEnabled ? "currentColor" : "none"}
                    aria-hidden
                  />
                  {depletion?.alertsEnabled ? "Reminders on" : "Remind me"}
                </button>
              ) : null}
              {canLookup ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAddingMeter(false);
                    void lookup(tabPhone, meter);
                  }}
                  className={cn(
                    "inline-flex min-h-9 text-[13px] font-medium text-[var(--tab-muted)] disabled:opacity-40",
                    focusRing,
                  )}
                >
                  {busy ? "Looking up…" : sameLoadedMeter ? "Look up again" : "Look up"}
                </button>
              ) : null}
            </div>
            {live ? (
              <p className="px-4 pt-1 text-[12px] leading-relaxed text-[var(--tab-muted)]">
                {kplcEstimateCopy(live)}
              </p>
            ) : null}

            <section className="mt-6 px-4">
              <p className="text-[13px] text-[var(--tab-muted)]">Meters</p>
              {meters.length > 0 ? (
                <ul className="mt-2 grid gap-1.5">
                  {meters.map((saved) => {
                    const selected =
                      !addingMeter && digitsOnly(meter) === saved.meterNumber;
                    return (
                      <li key={saved.meterNumber}>
                        <div className="flex items-stretch gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setMeter(saved.meterNumber);
                              setAddingMeter(false);
                              void lookup(tabPhone, saved.meterNumber);
                            }}
                            className={cn(
                              "flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 px-3 text-left tabular-nums disabled:opacity-40",
                              selected
                                ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                                : "bg-[var(--tab-chip)]",
                              focusRing,
                            )}
                            aria-pressed={selected}
                          >
                            <span className="text-[15px] font-semibold tracking-[-0.02em]">
                              {formatMeterDisplay(saved.meterNumber)}
                            </span>
                            {selected ? (
                              <Check className="size-4 shrink-0" aria-hidden />
                            ) : null}
                          </button>
                          {selected ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void forget(saved.meterNumber)}
                              className={cn(
                                "flex size-12 shrink-0 items-center justify-center bg-[var(--tab-chip)] text-[var(--tab-muted)] disabled:opacity-40",
                                focusRing,
                              )}
                              aria-label={`Remove meter ${formatMeterDisplay(saved.meterNumber)}`}
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--tab-muted)]">
                  Saved on this tab, so the next phone still knows the meter.
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                aria-pressed={addingMeter}
                onClick={() => {
                  if (addingMeter) {
                    setAddingMeter(false);
                    setMeter(loadedMeter ?? meters[0]?.meterNumber ?? "");
                    return;
                  }
                  setAddingMeter(true);
                  if (meterKnown) setMeter("");
                }}
                className={cn(
                  "mt-2 inline-flex min-h-9 text-[14px] font-semibold disabled:opacity-40",
                  focusRing,
                )}
              >
                {addingMeter ? "Cancel" : "Add meter"}
              </button>
              {showMeterInput ? (
                <div className="mt-2">
                  <label htmlFor={`${fieldIdPrefix}-kplc-meter`} className="sr-only">
                    Meter number
                  </label>
                  <input
                    id={`${fieldIdPrefix}-kplc-meter`}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus={addingMeter}
                    value={meter}
                    disabled={busy}
                    onChange={(e) => {
                      setMeter(digitsOnly(e.target.value));
                      setError(null);
                    }}
                    placeholder="Meter as printed"
                    className={cn(
                      "w-full border-b border-[var(--tab-fg)] bg-transparent py-2 text-[16px] font-semibold tabular-nums outline-none",
                      focusRing,
                    )}
                  />
                  <button
                    type="button"
                    disabled={!canLookup}
                    onClick={() => {
                      setAddingMeter(false);
                      void lookup(tabPhone, meter);
                    }}
                    className={cn(
                      "mt-2 inline-flex min-h-10 text-[14px] font-semibold disabled:opacity-40",
                      focusRing,
                    )}
                  >
                    Look up
                  </button>
                </div>
              ) : null}
            </section>

            <section className="mt-7">
              <div className={styles.ledgerHead}>
                <h3 className={styles.ledgerTitle}>Purchases</h3>
                {sortedTokens.length > 0 ? (
                  <p className={styles.ledgerMeta}>
                    {sortedTokens.length} token
                    {sortedTokens.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
              {tokens && loadedMeter && tokens.length === 0 ? (
                <p className={styles.empty}>
                  No tokens on {formatMeterDisplay(loadedMeter)} yet.
                </p>
              ) : sortedTokens.length > 0 ? (
                <ul className="divide-y divide-[var(--tab-border)] border-y border-[var(--tab-border)]">
                  {sortedTokens.map((token) => (
                    <PurchaseRow
                      key={`${token.tokenNo}-${token.purchasedAt ?? ""}`}
                      token={token}
                      copied={copied === token.tokenNo}
                      onCopy={() => void copyToken(token.tokenNo)}
                    />
                  ))}
                </ul>
              ) : !lookingUp ? (
                <p className={styles.empty}>Look up a meter to load purchases.</p>
              ) : null}
            </section>

            {showSpend && resolvedStats && resolvedStats.months.length > 0 ? (
              <section className="px-4 pb-6 pt-4">
                <p className="text-[13px] text-[var(--tab-muted)]">Monthly spend</p>
                <ol className="mt-1 list-none p-0">
                  {resolvedStats.months.map((month) => {
                    const amount = toAmount(month.amount);
                    const units = toAmount(month.units);
                    return (
                      <li
                        key={month.yearMonth}
                        className="flex items-baseline justify-between gap-4 py-2.5"
                      >
                        <span>
                          <span className="block text-[14px] font-semibold">
                            {month.label}
                          </span>
                          <span className="text-[12px] text-[var(--tab-muted)]">
                            {month.tokenCount} token
                            {month.tokenCount === 1 ? "" : "s"}
                            {units != null ? ` · ${kwhLabel(units)}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {amount != null ? money(amount) : "—"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </div>

      {buyingSoon && !lookingUp ? (
        <div className="shrink-0 border-t border-[var(--tab-border)] px-4 py-3">
          <button
            type="button"
            disabled
            aria-label="Buy a KPLC token. Coming soon."
            className={cn(
              "flex min-h-12 w-full cursor-not-allowed items-center justify-center bg-[var(--tab-chip)] px-3 text-[14px] font-semibold text-[var(--tab-muted)]",
              focusRing,
            )}
          >
            Buy token — coming soon
          </button>
          <p className="mt-1.5 text-center text-[12px] leading-snug text-[var(--tab-muted)]">
            Look up and copy still work.
          </p>
        </div>
      ) : null}
    </TabOverlay>
  );
}
