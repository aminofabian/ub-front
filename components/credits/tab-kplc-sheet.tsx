"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Check, ChevronDown, Copy, Loader2, X, Zap } from "lucide-react";

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
import { cn } from "@/lib/utils";
import {
  TabOverlay,
  tabOverlayCloseClass,
  tabOverlayHeaderClass,
} from "@/components/credits/tab-overlay";

const fieldClass =
  "w-full border border-[var(--tab-border)] bg-[var(--tab-input)] px-3 py-2.5 text-[16px] font-semibold tabular-nums outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[var(--tab-focus)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_28%,transparent)] disabled:opacity-50";

const btnPrimaryClass =
  "flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--tab-focus)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tab-card)] active:opacity-85 disabled:cursor-not-allowed disabled:opacity-45";

const comingSoonMuted =
  "color-mix(in_oklab, var(--tab-bg) 72%, var(--tab-fg))";

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

function formatRelativeTokenTime(iso: string | null, nowMs = Date.now()): string {
  if (!iso) return "Date unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  const diffMs = nowMs - date.getTime();
  if (diffMs < 45_000) return "Just now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  const days = Math.round(diffMs / 86_400_000);
  if (days < 45) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    month: "short",
    year: "numeric",
  }).format(date);
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

function ComingSoonLine() {
  return (
    <p className="px-4 pb-1.5 text-center text-[12px] leading-snug text-[var(--tab-muted)]">
      Buying from this tab is next
    </p>
  );
}

function CopyTokenButton({
  tokenNo,
  copied,
  inverted,
  onCopy,
}: {
  tokenNo: string;
  copied: boolean;
  inverted?: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "mt-2 flex w-full items-center justify-between gap-2 px-2.5 py-2.5 text-left",
        inverted
          ? "border border-[color-mix(in_oklab,var(--tab-bg)_28%,transparent)] bg-[color-mix(in_oklab,var(--tab-bg)_10%,transparent)]"
          : "border border-[var(--tab-border)] bg-[var(--tab-card)]",
      )}
    >
      <span className="min-w-0 font-mono text-[13px] font-semibold tabular-nums tracking-wide">
        {formatTokenNo(tokenNo)}
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-[12px] font-medium",
          inverted ? "text-[color-mix(in_oklab,var(--tab-bg)_72%,var(--tab-fg))]" : "text-[var(--tab-muted)]",
        )}
      >
        {copied ? (
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
  );
}

function ConceptList({
  token,
  inverted,
}: {
  token: PublicTabKplcToken;
  inverted?: boolean;
}) {
  if (!token.concepts?.length) return null;
  return (
    <ul
      className={cn(
        "mt-2 space-y-1.5 border-t pt-2",
        inverted
          ? "border-[color-mix(in_oklab,var(--tab-bg)_22%,transparent)]"
          : "border-[var(--tab-border)]",
      )}
    >
      {token.concepts.map((concept, index) => {
        const line = toAmount(concept.amount);
        return (
          <li
            key={`${concept.code}-${index}`}
            className="flex items-baseline justify-between gap-3 text-[12px]"
          >
            <span
              className="min-w-0"
              style={
                inverted
                  ? { color: comingSoonMuted }
                  : { color: "var(--tab-muted)" }
              }
            >
              {concept.label}
            </span>
            <span className="shrink-0 tabular-nums">
              {line != null ? money(line) : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SpendTape({ stats }: { stats: PublicTabKplcStats }) {
  const months = stats.months;
  const peak = months.reduce((max, month) => {
    const amount = toAmount(month.amount) ?? 0;
    return amount > max ? amount : max;
  }, 0);
  if (months.length === 0) {
    return (
      <p className="px-4 pb-4 text-[13px] leading-snug text-[var(--tab-muted)]">
        No monthly spend yet. Look up a meter to start the tape.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-[var(--tab-border)] border-t border-[var(--tab-border)]">
      {months.map((month) => {
        const amount = toAmount(month.amount) ?? 0;
        const units = toAmount(month.units);
        const width = peak > 0 ? Math.max(6, Math.round((amount / peak) * 100)) : 6;
        return (
          <li key={month.yearMonth} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] font-semibold tracking-[-0.02em]">
                {month.label}
              </p>
              <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                {money(amount)}
              </p>
            </div>
            <div
              className="mt-2 h-1.5 w-full bg-[var(--tab-border)]"
              aria-hidden
            >
              <div
                className="h-full bg-[var(--tab-fg)]"
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-[var(--tab-muted)]">
              {month.tokenCount} token{month.tokenCount === 1 ? "" : "s"}
              {units != null ? ` · ${units.toLocaleString("en-KE")} kWh` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function depletionTitle(depletion: PublicTabKplcDepletion, nowMs = Date.now()): string {
  if (depletion.alreadyEmpty || !depletion.estimatedEmptyAt) {
    return "Likely already out";
  }
  const empty = new Date(depletion.estimatedEmptyAt);
  if (Number.isNaN(empty.getTime())) return "Likely already out";
  const days = Math.round((empty.getTime() - nowMs) / 86_400_000);
  if (days <= 0) return "Likely out today";
  if (days === 1) return "About 1 day left";
  if (days < 14) return `About ${days} days left`;
  return `Until ${new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(empty)}`;
}

function TokenFuse({ remaining, last }: { remaining: number; last: number }) {
  const fraction = last > 0 ? Math.max(0, Math.min(1, remaining / last)) : 0;
  const lit = Math.round(fraction * 20);
  return (
    <div className="mt-3 flex justify-between gap-1" aria-hidden>
      {Array.from({ length: 5 }, (_, group) => (
        <span key={group} className="flex gap-[3px]">
          {Array.from({ length: 4 }, (_, i) => {
            const index = group * 4 + i;
            const on = index < lit;
            return (
              <span
                key={i}
                className="inline-block h-5 w-[0.55rem] border"
                style={{
                  borderColor: "color-mix(in_oklab, var(--tab-bg) 38%, transparent)",
                  backgroundColor: on
                    ? "var(--tab-bg)"
                    : "transparent",
                }}
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}

function DepletionPanel({
  depletion,
  onToggle,
  busy,
}: {
  depletion: PublicTabKplcDepletion;
  onToggle: (enabled: boolean) => void;
  busy: boolean;
}) {
  const remaining = toAmount(depletion.remainingUnits);
  const last = toAmount(depletion.lastPurchaseUnits);
  const daily = toAmount(depletion.dailyUseUnits);
  const canEstimate = Boolean(depletion.estimatedEmptyAt) || depletion.alreadyEmpty;
  return (
    <div className="bg-[var(--tab-fg)] px-4 py-4 text-[var(--tab-bg)]">
      <p className="text-[1.5rem] font-semibold leading-[0.95] tracking-[-0.03em]">
        {canEstimate ? depletionTitle(depletion) : "Need one more top-up"}
      </p>
      {canEstimate && remaining != null && last != null ? (
        <TokenFuse remaining={remaining} last={last} />
      ) : (
        <p className="mt-2 text-[13px] leading-snug" style={{ color: comingSoonMuted }}>
          After the next token we can time how fast this meter drinks units.
        </p>
      )}
      {canEstimate ? (
        <p className="mt-3 text-[13px] leading-snug" style={{ color: comingSoonMuted }}>
          From how long the last {depletion.sampleIntervals || 0} slip
          {(depletion.sampleIntervals || 0) === 1 ? "" : "s"} lasted
          {daily != null ? ` · ~${daily.toFixed(1)} kWh a day` : ""}. Not a live meter read.
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy || !canEstimate}
        aria-pressed={depletion.alertsEnabled}
        onClick={() => onToggle(!depletion.alertsEnabled)}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 py-2.5 text-[14px] font-semibold disabled:opacity-45",
          depletion.alertsEnabled
            ? "bg-[var(--tab-bg)] text-[var(--tab-fg)]"
            : "border border-[color-mix(in_oklab,var(--tab-bg)_35%,transparent)]",
        )}
      >
        {depletion.alertsEnabled ? (
          <>
            <Bell className="size-4" aria-hidden />
            Reminders on · 2 days and 1 day before
          </>
        ) : (
          <>
            <BellOff className="size-4" aria-hidden />
            Text me before it runs out
          </>
        )}
      </button>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [view, setView] = useState<"tokens" | "stats">("tokens");
  const [addingMeter, setAddingMeter] = useState(false);
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
    setExpanded(null);
    setView("tokens");
    setAddingMeter(false);
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

  if (!open) return null;

  const meters = config?.meters ?? [];
  const buyingSoon = config?.purchaseAvailable !== true;
  const canLookup = meterLooksValid(meter) && !busy;
  const sameLoadedMeter =
    loadedMeter != null && digitsOnly(meter) === loadedMeter;
  const latest = tokens?.[0] ?? null;
  const older = tokens?.slice(1) ?? [];
  const canShowStats = Boolean(
    (resolvedStats && (resolvedStats.months.length > 0 || (tokens && tokens.length > 0))) ||
      depletion,
  );
  const meterKnown = meters.some((saved) => saved.meterNumber === digitsOnly(meter));
  const showMeterInput = meters.length === 0 || addingMeter || (Boolean(meter) && !meterKnown);

  return (
    <TabOverlay
      open={open}
      onClose={onClose}
      labelledBy={`${fieldIdPrefix}-kplc-title`}
      keyboardInset={keyboardInset}
      size={canShowStats ? "ledger" : "ticket"}
    >
        <div className={cn(tabOverlayHeaderClass, "items-center")}>
          <h2
            id={`${fieldIdPrefix}-kplc-title`}
            className="flex min-w-0 items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.02em]"
          >
            <Zap className="size-4 shrink-0" aria-hidden />
            KPLC tokens
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            {canShowStats ? (
              <div
                className="flex h-9 divide-x divide-[var(--tab-border)] border border-[var(--tab-border)] lg:hidden"
                role="group"
                aria-label="Token views"
              >
                <button
                  type="button"
                  onClick={() => setView("tokens")}
                  className={cn(
                    "px-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tab-focus)]",
                    view === "tokens"
                      ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                      : "text-[var(--tab-muted)]",
                  )}
                  aria-pressed={view === "tokens"}
                >
                  Tokens
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("stats");
                    setAddingMeter(false);
                  }}
                  className={cn(
                    "px-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tab-focus)]",
                    view === "stats"
                      ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                      : "text-[var(--tab-muted)]",
                  )}
                  aria-pressed={view === "stats"}
                >
                  Stats
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={tabOverlayCloseClass}
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {meters.length > 0 || view === "tokens" ? (
          <div className="shrink-0 border-y border-[var(--tab-border)] px-4 py-2">
          {meters.length > 0 ? (
            <ul className="flex flex-wrap gap-1">
              {meters.map((saved) => {
                const selected = !addingMeter && digitsOnly(meter) === saved.meterNumber;
                return (
                  <li key={saved.meterNumber}>
                    <div
                      className={cn(
                        "flex items-stretch",
                        selected
                          ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                          : "border border-[var(--tab-border)]",
                      )}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setMeter(saved.meterNumber);
                          setAddingMeter(false);
                          void lookup(tabPhone, saved.meterNumber);
                        }}
                        className="min-h-10 px-3 text-[13px] font-semibold tabular-nums disabled:opacity-40"
                      >
                        {formatMeterDisplay(saved.meterNumber)}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void forget(saved.meterNumber)}
                        className={cn(
                          "size-10 shrink-0 items-center justify-center disabled:opacity-40",
                          view === "tokens" ? "flex" : "hidden lg:flex",
                          selected
                            ? "border-l border-[color-mix(in_oklab,var(--tab-bg)_28%,transparent)] text-[var(--tab-bg)]"
                            : "border-l border-[var(--tab-border)] text-[var(--tab-muted)]",
                        )}
                        aria-label={`Remove meter ${formatMeterDisplay(saved.meterNumber)}`}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
              <li className={cn(view !== "tokens" && "max-lg:hidden")}>
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
                    setView("tokens");
                    setAddingMeter(true);
                    if (meterKnown) setMeter("");
                  }}
                  className={cn(
                    "flex min-h-10 items-center px-3 text-[13px] font-medium disabled:opacity-40",
                    addingMeter
                      ? "bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                      : "border border-[var(--tab-border)] text-[var(--tab-muted)]",
                  )}
                >
                  {addingMeter ? "Cancel" : "Another"}
                </button>
              </li>
            </ul>
          ) : view === "tokens" ? (
            <p className="text-[12px] text-[var(--tab-muted)]">
              Saved on this tab, so the next phone still knows the meter.
            </p>
          ) : null}
          {view === "tokens" && showMeterInput ? (
            <div className={meters.length > 0 ? "mt-2" : undefined}>
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
                className={fieldClass}
              />
            </div>
          ) : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          {error ? (
            <p
              role="alert"
              className="mx-4 mt-3 border border-[var(--tab-error-fg)] bg-[var(--tab-error-bg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
            >
              {error}
            </p>
          ) : null}

          {busy && tokens == null ? (
            <p className="mt-4 flex items-center gap-2 px-4 text-[13px] text-[var(--tab-muted)]">
              <Loader2 className="size-4 animate-spin" />
              Looking up tokens…
            </p>
          ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            canShowStats && "lg:grid lg:grid-cols-2 lg:overflow-hidden",
          )}
        >
          <div
            className={cn(
              "min-h-0",
              canShowStats && "lg:overflow-y-auto lg:overscroll-contain",
              view !== "tokens" && "max-lg:hidden",
            )}
          >
          {tokens && loadedMeter ? (
            <section>
              {tokens.length === 0 ? (
                <p className="px-4 pt-4 text-[13px] leading-snug text-[var(--tab-muted)]">
                  No tokens on {formatMeterDisplay(loadedMeter)} yet.
                </p>
              ) : (
                <>
                  {latest ? (
                    <LatestToken
                      token={latest}
                      copied={copied === latest.tokenNo}
                      expanded={expanded === `${latest.tokenNo}-${latest.purchasedAt ?? ""}`}
                      onToggle={() => {
                        const key = `${latest.tokenNo}-${latest.purchasedAt ?? ""}`;
                        setExpanded((cur) => (cur === key ? null : key));
                      }}
                      onCopy={() => void copyToken(latest.tokenNo)}
                    />
                  ) : null}
                  {older.length > 0 ? (
                    <ol className="divide-y divide-[var(--tab-border)]">
                      {older.map((token) => {
                        const key = `${token.tokenNo}-${token.purchasedAt ?? ""}`;
                        const openRow = expanded === key;
                        const amount = toAmount(token.amount);
                        const units = toAmount(token.units);
                        return (
                          <li key={key} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setExpanded(openRow ? null : key)}
                                className="min-w-0 flex-1 text-left"
                                aria-expanded={openRow}
                              >
                                <p className="text-[15px] font-semibold tracking-[-0.02em]">
                                  <time
                                    dateTime={token.purchasedAt ?? undefined}
                                    title={
                                      token.purchasedAt
                                        ? formatAbsoluteTokenDate(token.purchasedAt)
                                        : undefined
                                    }
                                  >
                                    {formatRelativeTokenTime(token.purchasedAt)}
                                  </time>
                                </p>
                                <p className="mt-0.5 text-[13px] tabular-nums text-[var(--tab-muted)]">
                                  {amount != null ? money(amount) : "Token"}
                                  {units != null
                                    ? ` · ${units.toLocaleString("en-KE")} kWh`
                                    : ""}
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
                            <CopyTokenButton
                              tokenNo={token.tokenNo}
                              copied={copied === token.tokenNo}
                              onCopy={() => void copyToken(token.tokenNo)}
                            />
                            {openRow ? <ConceptList token={token} /> : null}
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </>
              )}
            </section>
          ) : null}
          </div>

          {canShowStats ? (
            <div
              className={cn(
                "min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-[var(--tab-border)]",
                view !== "stats" && "max-lg:hidden",
              )}
            >
              {depletion ? (
                <DepletionPanel
                  depletion={depletion}
                  busy={busy}
                  onToggle={(enabled) => void toggleDepletionAlerts(enabled)}
                />
              ) : null}
              {resolvedStats ? (
                <section className="pt-4">
                  <div className="px-4 pb-2">
                    <h3 className="text-[15px] font-semibold tracking-[-0.02em]">
                      Monthly spend
                    </h3>
                    <p className="mt-1 text-[13px] leading-snug text-[var(--tab-muted)]">
                      {resolvedStats.allTimeCount} token
                      {resolvedStats.allTimeCount === 1 ? "" : "s"}
                      {toAmount(resolvedStats.allTimeAmount) != null
                        ? ` · ${money(toAmount(resolvedStats.allTimeAmount)!)} all time`
                        : ""}
                    </p>
                  </div>
                  <SpendTape stats={resolvedStats} />
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
        </div>

        <div className="shrink-0 border-t border-[var(--tab-border)] pt-2">
          {buyingSoon ? <ComingSoonLine /> : null}
          <div className="px-4 pb-2.5">
            <button
              type="button"
              disabled={!canLookup}
              onClick={() => {
                setAddingMeter(false);
                if (!sameLoadedMeter) setView("tokens");
                void lookup(tabPhone, meter);
              }}
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
    </TabOverlay>
  );
}

function LatestToken({
  token,
  copied,
  expanded,
  onToggle,
  onCopy,
}: {
  token: PublicTabKplcToken;
  copied: boolean;
  expanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const amount = toAmount(token.amount);
  const units = toAmount(token.units);
  return (
    <article className="bg-[var(--tab-fg)] px-4 py-4 text-[var(--tab-bg)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-[1.25rem] font-semibold leading-none tracking-[-0.03em]">
            <time
              dateTime={token.purchasedAt ?? undefined}
              title={
                token.purchasedAt ? formatAbsoluteTokenDate(token.purchasedAt) : undefined
              }
            >
              {formatRelativeTokenTime(token.purchasedAt)}
            </time>
          </p>
          <p className="mt-2 text-[14px] font-semibold tabular-nums">
            {amount != null ? money(amount) : "Latest token"}
            {units != null ? ` · ${units.toLocaleString("en-KE")} kWh` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          style={{ color: comingSoonMuted }}
          aria-hidden
        />
      </button>
      <CopyTokenButton
        tokenNo={token.tokenNo}
        copied={copied}
        inverted
        onCopy={onCopy}
      />
      {token.paymentMethod ? (
        <p className="mt-2 text-[12px]" style={{ color: comingSoonMuted }}>
          {token.paymentMethod}
        </p>
      ) : null}
      {expanded ? <ConceptList token={token} inverted /> : null}
    </article>
  );
}
