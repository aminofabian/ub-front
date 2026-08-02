"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Loader2, Radio } from "lucide-react";

import {
  fetchSupplierPortalSalesPulse,
  type SupplierPortalSalesPulse,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;

type Props = {
  /** When set, only render if signed-in supplier owns this hub username. */
  hubUsername?: string | null;
  ownerUsername?: string | null;
  className?: string;
  compact?: boolean;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtQty(v: unknown): string {
  const n = toNum(v);
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtMoney(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

function relativeTime(iso: string, nowMs: number): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(0, Math.round((nowMs - t) / 1000));
  if (sec < 8) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 36) return `${hr}h ago`;
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(t));
  } catch {
    return iso;
  }
}

function fingerprint(pulse: SupplierPortalSalesPulse): string {
  const head = pulse.events
    .slice(0, 8)
    .map((e) => e.id)
    .join("|");
  const s = pulse.summary;
  return [
    head,
    s.supplyQtyToday,
    s.tillQtyToday,
    s.supplyAmountToday,
    s.eventCount,
  ].join("·");
}

export function SupplierSalesPulse({
  hubUsername,
  ownerUsername,
  className,
  compact = false,
}: Props) {
  const [pulse, setPulse] = useState<SupplierPortalSalesPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [freshTick, setFreshTick] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevFp = useRef<string>("");
  const mounted = useRef(true);

  const ownsHub =
    !hubUsername ||
    !ownerUsername ||
    hubUsername.trim().toLowerCase() === ownerUsername.trim().toLowerCase();

  const refresh = useCallback(async (silent: boolean) => {
    if (!ownsHub) return;
    try {
      const next = await fetchSupplierPortalSalesPulse();
      if (!mounted.current) return;
      const fp = fingerprint(next);
      if (prevFp.current && prevFp.current !== fp) {
        setFreshTick((n) => n + 1);
      }
      prevFp.current = fp;
      setPulse(next);
      setError("");
    } catch (err) {
      if (!mounted.current) return;
      if (!silent) {
        setError(err instanceof Error ? err.message : "Could not load sales pulse");
      }
    } finally {
      if (mounted.current && !silent) setLoading(false);
    }
  }, [ownsHub]);

  useEffect(() => {
    mounted.current = true;
    if (!ownsHub) {
      setLoading(false);
      return () => {
        mounted.current = false;
      };
    }
    void refresh(false);
    const poll = window.setInterval(() => {
      void refresh(true);
    }, POLL_MS);
    const clock = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [ownsHub, refresh]);

  if (!ownsHub) return null;

  if (loading && !pulse) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-white/80 px-4 py-4 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Tuning live product pulse…
      </div>
    );
  }

  if (error && !pulse) {
    return (
      <p
        className={cn(
          "border border-red-300/80 bg-red-50 px-3 py-2 text-sm text-red-800",
          className,
        )}
      >
        {error}
      </p>
    );
  }

  if (!pulse) return null;

  const currency = pulse.currency || "KES";
  const maxQty = Math.max(
    1,
    ...pulse.products.map((p) => Math.max(toNum(p.qtyToday), toNum(p.qty7d) / 7)),
  );
  const hasTill = pulse.velocityShopCount > 0;
  const quiet =
    pulse.events.length === 0 &&
    toNum(pulse.summary.supplyQtyToday) === 0 &&
    toNum(pulse.summary.tillQtyToday) === 0;

  return (
    <section
      key={freshTick}
      className={cn(
        "relative overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,#0f1f1c_96%,#0f766e)] text-[#e8f0ee]",
        "animate-[sp-card-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]",
        className,
      )}
      aria-live="polite"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-teal-500/15 blur-3xl"
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-3.5 py-3 sm:px-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300" />
              </span>
              <h3 className="font-[family-name:var(--font-heading)] text-[1.15rem] font-semibold tracking-tight text-white sm:text-[1.3rem]">
                Live pulse
              </h3>
            </div>
            <p className="mt-1 max-w-xl text-[12px] leading-snug text-white/65">
              {hasTill
                ? "Supplies to shops plus till sell-through where shops share velocity."
                : "Product lines moving into your connected shops — ask a shop to share till velocity for shelf sales."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/90">
            <Radio className="size-3.5" />
            Live · {relativeTime(pulse.generatedAt, nowMs)}
          </div>
        </div>

        <div
          className={cn(
            "grid divide-y divide-white/10 border-b border-white/10 sm:divide-x sm:divide-y-0",
            compact ? "sm:grid-cols-2" : "sm:grid-cols-3",
          )}
        >
          <PulseStat
            label="Supplied today"
            value={`${fmtQty(pulse.summary.supplyQtyToday)} u`}
            hint={fmtMoney(pulse.summary.supplyAmountToday, currency)}
          />
          {hasTill || !compact ? (
            <PulseStat
              label="Till today"
              value={hasTill ? `${fmtQty(pulse.summary.tillQtyToday)} u` : "—"}
              hint={
                hasTill
                  ? `${pulse.velocityShopCount} shop${pulse.velocityShopCount === 1 ? "" : "s"} sharing`
                  : "No shop sharing yet"
              }
            />
          ) : null}
          {!compact ? (
            <PulseStat
              label="7-day supply"
              value={`${fmtQty(pulse.summary.supplyQty7d)} u`}
              hint={`${pulse.shopCount} linked shop${pulse.shopCount === 1 ? "" : "s"}`}
            />
          ) : null}
        </div>

        {quiet ? (
          <div className="flex items-start gap-3 px-3.5 py-5 sm:px-4">
            <Activity className="mt-0.5 size-4 shrink-0 text-white/45" />
            <p className="text-[13px] leading-relaxed text-white/70">
              No product movement yet today. When shops receive your stock
              {hasTill ? " or sell it at the till" : ""}, ticks land here within a few
              seconds.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-0 lg:grid-cols-2",
              "divide-y divide-white/10 lg:divide-x lg:divide-y-0",
            )}
          >
            <div className="min-w-0">
              <p className="px-3.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 sm:px-4">
                Tape
              </p>
              <ul className="mt-1 max-h-[22rem] overflow-y-auto overscroll-contain">
                {pulse.events.map((ev, idx) => (
                  <li
                    key={ev.id}
                    className={cn(
                      "flex items-start justify-between gap-3 border-t border-white/[0.06] px-3.5 py-2.5 sm:px-4",
                      idx === 0 && freshTick > 0 && "bg-emerald-400/10",
                    )}
                    style={
                      idx < 6
                        ? {
                            animation: `sp-card-in 0.4s cubic-bezier(0.22,1,0.36,1) ${idx * 40}ms both`,
                          }
                        : undefined
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white">
                        {ev.productName}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-white/50">
                        <ChannelChip channel={ev.channel} />
                        <span className="mx-1.5 text-white/25">·</span>
                        {ev.shopName}
                        <span className="mx-1.5 text-white/25">·</span>
                        {relativeTime(ev.at, nowMs)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[13px] font-semibold tabular-nums text-emerald-200">
                        ×{fmtQty(ev.quantity)}
                      </p>
                      {ev.channel === "supply" && ev.amount != null ? (
                        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-white/45">
                          {fmtMoney(ev.amount, currency)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <p className="px-3.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 sm:px-4">
                Moving products
              </p>
              <ul className="mt-1 space-y-0 px-3.5 pb-3 sm:px-4">
                {pulse.products.length === 0 ? (
                  <li className="py-3 text-[13px] text-white/55">No ranked products yet.</li>
                ) : (
                  pulse.products.slice(0, compact ? 6 : 10).map((row) => {
                    const score = Math.max(toNum(row.qtyToday), toNum(row.qty7d) / 7);
                    const width = Math.max(8, Math.round((score / maxQty) * 100));
                    return (
                      <li key={row.key} className="border-t border-white/[0.06] py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-white">
                              {row.productName}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-white/45">
                              <ChannelChip channel={row.channel} />
                              <span className="mx-1.5 text-white/25">·</span>
                              {row.shopName}
                            </p>
                          </div>
                          <p className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-white">
                            {toNum(row.qtyToday) > 0
                              ? `${fmtQty(row.qtyToday)} today`
                              : `${fmtQty(row.qty7d)} /7d`}
                          </p>
                        </div>
                        <div className="mt-2 h-1.5 w-full bg-white/10">
                          <div
                            className={cn(
                              "h-full transition-[width] duration-500 ease-out",
                              row.channel === "till" ? "bg-amber-300/90" : "bg-emerald-300/90",
                            )}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PulseStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="px-3.5 py-3 sm:px-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-[1.35rem] font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-white/50">{hint}</p>
    </div>
  );
}

function ChannelChip({ channel }: { channel: string }) {
  const till = channel === "till";
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-wider",
        till ? "text-amber-200/90" : "text-emerald-200/90",
      )}
    >
      {till ? "till" : "supply"}
    </span>
  );
}
