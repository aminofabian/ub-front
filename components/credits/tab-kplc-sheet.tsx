"use client";

import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from "react";
import { Bell, Check, MoreVertical, X, Zap } from "lucide-react";

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

function SectionRule({ title }: { title: string }) {
  return (
    <div className="flex items-end gap-3">
      <h3 className="shrink-0 text-[13px] font-medium">{title}</h3>
      <span className="mb-1.5 h-px min-w-0 flex-1 bg-[var(--tab-fg)]" aria-hidden />
    </div>
  );
}

function BracketButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 px-1 font-mono text-[13px] disabled:opacity-40",
        focusRing,
        className,
      )}
    >
      <span aria-hidden>[</span>
      {children}
      <span aria-hidden>]</span>
    </button>
  );
}

function RemainingBox({ live }: { live: KplcLiveEstimate | null }) {
  if (!live) {
    return (
      <div className="border-2 border-[var(--tab-fg)] px-4 py-4 text-center">
        <p className="text-[17px] font-semibold leading-snug">Need one more top-up</p>
        <p className="mt-2 text-[12px] leading-snug text-[var(--tab-muted)]">
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
    <div className="border-2 border-[var(--tab-fg)] px-4 py-4 text-center">
      {out ? (
        <>
          <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em]">
            Likely already out
          </p>
          {empty ? (
            <p className="mt-2.5 text-[15px] font-semibold leading-snug">
              Was due{" "}
              <time dateTime={empty.toISOString()}>{formatDepletionDate(empty)}</time>
            </p>
          ) : null}
          {remaining > 0 ? (
            <p className="mt-1.5 text-[13px] text-[var(--tab-muted)]">
              {kwhLabel(remaining)} on the last estimate
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-[1.5rem] font-semibold leading-none tracking-[-0.03em]">
            {kwhLabel(remaining)}{" "}
            <span className="font-medium">remaining</span>
          </p>
          {empty ? (
            <>
              <p className="mt-2.5 text-[15px] font-semibold leading-snug">
                Empty{" "}
                <time dateTime={empty.toISOString()}>{formatDepletionDate(empty)}</time>
              </p>
              <p className="mt-1.5 text-[13px] text-[var(--tab-muted)]">
                {compactTimeLeft(empty)} · estimate
              </p>
            </>
          ) : null}
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

  return (
    <li>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "flex w-full flex-col gap-0.5 py-3 text-left",
          focusRing,
        )}
        aria-label={copied ? `Copied ${formatted}` : `Copy token ${formatted}`}
      >
        <span className="flex items-baseline justify-between gap-4">
          <span className="text-[15px] font-semibold tabular-nums">
            {amount != null ? money(amount) : "Token"}
          </span>
          {units != null ? (
            <span className="shrink-0 tabular-nums text-[14px]">
              {kwhLabel(units)}
            </span>
          ) : null}
        </span>
        <span className="flex items-baseline justify-between gap-4 text-[12px] text-[var(--tab-muted)]">
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
          <span className={copied ? "text-[var(--tab-success-fg)]" : undefined}>
            {copied ? "copied" : formatted}
          </span>
        </span>
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
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

  return (
    <TabOverlay
      open={open}
      onClose={onClose}
      labelledBy={`${fieldIdPrefix}-kplc-title`}
      keyboardInset={keyboardInset}
      size="ticket"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden font-mono text-[var(--tab-fg)]">
        <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden border-y-2 border-[var(--tab-fg)]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-x border-dashed border-[var(--tab-fg)]">
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-3">
              <h2
                id={`${fieldIdPrefix}-kplc-title`}
                className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]"
              >
                <Zap className="size-4 shrink-0" aria-hidden />
                KPLC Tokens
              </h2>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  className={cn("flex size-9 items-center justify-center", focusRing)}
                  aria-expanded={menuOpen}
                  aria-label="More actions"
                  onClick={() => setMenuOpen((openMenu) => !openMenu)}
                >
                  <MoreVertical className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn("flex size-9 items-center justify-center", focusRing)}
                  aria-label="Close"
                  onClick={onClose}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </header>

            {menuOpen ? (
              <div className="mx-4 mb-3 border border-[var(--tab-fg)] px-3 py-2 text-[13px]">
                <BracketButton
                  disabled={!canLookup}
                  onClick={() => {
                    setAddingMeter(false);
                    setMenuOpen(false);
                    void lookup(tabPhone, meter);
                  }}
                >
                  {busy ? "Looking up…" : sameLoadedMeter ? "Look up again" : "Look up tokens"}
                </BracketButton>
                {resolvedStats && resolvedStats.months.length > 0 ? (
                  <BracketButton
                    onClick={() => {
                      setShowSpend((current) => !current);
                      setMenuOpen(false);
                    }}
                  >
                    {showSpend ? "Hide monthly spend" : "Monthly spend"}
                  </BracketButton>
                ) : null}
                {live ? (
                  <p className="mt-2 px-1 text-[11px] leading-relaxed text-[var(--tab-muted)]">
                    {kplcEstimateCopy(live)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {error ? (
                <p
                  role="alert"
                  className="mb-4 border border-[var(--tab-error-fg)] px-3 py-2 text-[13px] text-[var(--tab-error-fg)]"
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
                  <RemainingBox live={live} />

                  {daily != null ? (
                    <section className="mt-6">
                      <SectionRule title="Daily usage" />
                      <p className="mt-3 text-[16px] font-semibold tabular-nums">
                        {kwhLabel(daily)} / day
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--tab-muted)]">
                        Based on your recent use
                      </p>
                      {canRemind ? (
                        <BracketButton
                          className="mt-3"
                          disabled={busy}
                          aria-pressed={depletion?.alertsEnabled}
                          onClick={() =>
                            void toggleDepletionAlerts(!depletion?.alertsEnabled)
                          }
                        >
                          <Bell
                            className="size-3.5 text-amber-400"
                            fill={depletion?.alertsEnabled ? "currentColor" : "none"}
                            aria-hidden
                          />
                          {depletion?.alertsEnabled ? "Reminders on" : "Remind me"}
                        </BracketButton>
                      ) : null}
                    </section>
                  ) : canRemind ? (
                    <div className="mt-4">
                      <BracketButton
                        disabled={busy}
                        aria-pressed={depletion?.alertsEnabled}
                        onClick={() =>
                          void toggleDepletionAlerts(!depletion?.alertsEnabled)
                        }
                      >
                        <Bell
                          className="size-3.5 text-amber-400"
                          fill={depletion?.alertsEnabled ? "currentColor" : "none"}
                          aria-hidden
                        />
                        {depletion?.alertsEnabled ? "Reminders on" : "Remind me"}
                      </BracketButton>
                    </div>
                  ) : null}

                  <section className="mt-7">
                    <SectionRule title="Meters" />
                    {meters.length > 0 ? (
                      <ul className="mt-3 grid gap-1.5">
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
                                    "flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 border-2 px-3 text-left tabular-nums active:scale-[0.99] disabled:opacity-40",
                                    selected
                                      ? "border-[var(--tab-fg)] bg-[var(--tab-fg)] text-[var(--tab-bg)]"
                                      : "border-[var(--tab-fg)] bg-[var(--tab-chip)] hover:bg-[color-mix(in_oklab,var(--tab-fg)_8%,var(--tab-card))]",
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
                                      "flex size-12 shrink-0 items-center justify-center border-2 border-[var(--tab-fg)] text-[var(--tab-muted)] disabled:opacity-40",
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
                      <p className="mt-3 text-[12px] text-[var(--tab-muted)]">
                        Saved on this tab, so the next phone still knows the meter.
                      </p>
                    )}
                    <BracketButton
                      className="mt-1"
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
                    >
                      {addingMeter ? "Cancel" : "+ Add meter"}
                    </BracketButton>
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
                        <BracketButton
                          className="mt-2"
                          disabled={!canLookup}
                          onClick={() => {
                            setAddingMeter(false);
                            void lookup(tabPhone, meter);
                          }}
                        >
                          Look up
                        </BracketButton>
                      </div>
                    ) : null}
                  </section>

                  <section className="mt-7">
                    <SectionRule title="Recent purchases" />
                    {tokens && loadedMeter && tokens.length === 0 ? (
                      <p className="mt-3 text-[13px] leading-snug text-[var(--tab-muted)]">
                        No tokens on {formatMeterDisplay(loadedMeter)} yet.
                      </p>
                    ) : sortedTokens.length > 0 ? (
                      <ol className="mt-1 list-none p-0">
                        {sortedTokens.map((token) => (
                          <PurchaseRow
                            key={`${token.tokenNo}-${token.purchasedAt ?? ""}`}
                            token={token}
                            copied={copied === token.tokenNo}
                            onCopy={() => void copyToken(token.tokenNo)}
                          />
                        ))}
                      </ol>
                    ) : !lookingUp ? (
                      <p className="mt-3 text-[13px] text-[var(--tab-muted)]">
                        Look up a meter to load purchases.
                      </p>
                    ) : null}
                  </section>

                  {showSpend && resolvedStats && resolvedStats.months.length > 0 ? (
                    <section className="mt-7">
                      <SectionRule title="Monthly spend" />
                      <ol className="mt-2 list-none p-0">
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
              <div className="shrink-0 border-t border-dashed border-[var(--tab-fg)] px-4 py-3">
                <button
                  type="button"
                  disabled
                  aria-label="Buy a KPLC token. Coming soon."
                  className={cn(
                    "flex min-h-12 w-full cursor-not-allowed items-center justify-center border-2 border-[var(--tab-fg)] px-3 text-[14px] font-semibold",
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
          </div>
        </div>
      </div>
    </TabOverlay>
  );
}
