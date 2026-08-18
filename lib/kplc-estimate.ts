const NAIROBI = "Africa/Nairobi";

/** Skip lookup glitches / duplicate stamps. */
const MIN_INTERVAL_MS = 6 * 3_600_000;
/** Gaps shorter than this are top-ups, not a finished cycle. */
const MIN_CYCLE_MS = 36 * 3_600_000;
const EMPTY_EPS = 0.05;

/**
 * Relative kWh by hour of day in Africa/Nairobi. Night fridge, morning
 * kettle/iron, quiet midday, evening lights/TV/cooking. Sum is 822.
 */
const HOUR_WEIGHT = [
  14, 12, 11, 10, 11, 14, 32, 46, 50, 34, 28, 24, 22, 22, 24, 28, 34, 56, 72, 78, 74, 60, 40, 26,
] as const;
const HOUR_WEIGHT_SUM = 822;

export type KplcSlip = {
  purchasedAt?: string | null;
  units?: number | string | null;
};

export type KplcDepletionHint = {
  estimatedEmptyAt?: string | null;
  remainingUnits?: number | string | null;
  lastPurchaseUnits?: number | string | null;
  dailyUseUnits?: number | string | null;
  alreadyEmpty?: boolean;
  sampleIntervals?: number;
};

export type KplcLiveEstimate = {
  emptyAt: Date | null;
  remainingUnits: number;
  lastPurchaseUnits: number;
  stockAtLastBuy: number;
  carryInUnits: number;
  dailyUseUnits: number;
  sampleIntervals: number;
  alreadyEmpty: boolean;
};

function units(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function ordinalDay(day: number): string {
  const v = day % 100;
  if (v >= 11 && v <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function kplcHourShare(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return HOUR_WEIGHT[h] / HOUR_WEIGHT_SUM;
}

function millisLeftInHour(atMs: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: NAIROBI,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(atMs));
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const leftover = 3_600_000 - minute * 60_000 - second * 1_000 - (atMs % 1000);
  return leftover > 0 ? leftover : 0;
}

function hourInNairobi(atMs: number): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: NAIROBI,
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(atMs)).find((p) => p.type === "hour")?.value ?? 0,
  );
  return hour;
}

function consume(fromMs: number, toMs: number, stock: number, daily: number): number {
  if (stock <= 0 || daily <= 0 || !Number.isFinite(fromMs) || toMs <= fromMs) {
    return Math.max(0, stock);
  }
  let t = fromMs;
  let rem = stock;
  let guard = 0;
  while (rem > 1e-9 && t < toMs && guard++ < 24 * 200) {
    const hourUse = daily * kplcHourShare(hourInNairobi(t));
    let left = millisLeftInHour(t);
    if (left <= 0) {
      t += 1;
      continue;
    }
    const step = Math.min(left, toMs - t);
    const use = hourUse * (step / 3_600_000);
    if (use >= rem) return 0;
    rem -= use;
    t += step;
  }
  return Math.max(0, rem);
}

function whenEmpty(fromMs: number, stock: number, daily: number): Date | null {
  if (!Number.isFinite(fromMs) || stock <= 1e-9 || daily <= 0) return null;
  let t = fromMs;
  let rem = stock;
  let guard = 0;
  const cap = fromMs + 200 * 86_400_000;
  while (rem > 1e-9 && t < cap && guard++ < 24 * 200) {
    const hourUse = daily * kplcHourShare(hourInNairobi(t));
    let left = millisLeftInHour(t);
    if (left <= 0) {
      t += 1;
      continue;
    }
    const useFull = hourUse * (left / 3_600_000);
    if (useFull >= rem) {
      if (hourUse <= 0) {
        t += left;
        continue;
      }
      const add = Math.round(3_600_000 * (rem / hourUse));
      return new Date(t + Math.min(add, left));
    }
    rem -= useFull;
    t += left;
  }
  return new Date(t);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function datedSlips(tokens: KplcSlip[] | null | undefined): { at: number; kwh: number }[] {
  if (!tokens?.length) return [];
  return tokens
    .map((t) => ({
      at: t.purchasedAt ? new Date(t.purchasedAt).getTime() : Number.NaN,
      kwh: units(t.units),
    }))
    .filter((t) => Number.isFinite(t.at) && t.kwh > 0)
    .sort((a, b) => a.at - b.at);
}

function finishEstimate(
  latestAt: number,
  lastUnits: number,
  stockAtLastBuy: number,
  daily: number,
  sampleIntervals: number,
  nowMs: number,
): KplcLiveEstimate {
  const remaining = consume(latestAt, nowMs, stockAtLastBuy, daily);
  const carryIn = Math.max(0, stockAtLastBuy - lastUnits);
  const alreadyEmpty = remaining <= EMPTY_EPS;
  const emptyAt = alreadyEmpty
    ? (() => {
        const hit = whenEmpty(latestAt, stockAtLastBuy, daily);
        if (!hit || hit.getTime() > nowMs) return new Date(nowMs);
        return hit;
      })()
    : whenEmpty(nowMs, remaining, daily);
  return {
    emptyAt,
    remainingUnits: alreadyEmpty ? 0 : round1(remaining),
    lastPurchaseUnits: lastUnits,
    stockAtLastBuy: round1(stockAtLastBuy),
    carryInUnits: round1(carryIn),
    dailyUseUnits: round1(daily) === 0 ? daily : Math.round(daily * 10000) / 10000,
    sampleIntervals,
    alreadyEmpty,
  };
}

/** Live remaining + empty clock from the slip list. */
export function estimateKplcLive(
  tokens: KplcSlip[] | null | undefined,
  nowMs = Date.now(),
): KplcLiveEstimate | null {
  const dated = datedSlips(tokens);
  if (dated.length < 2) return null;

  const cycleRates: number[] = [];
  const anyRates: number[] = [];
  for (let i = 0; i < dated.length - 1; i++) {
    const gap = dated[i + 1].at - dated[i].at;
    if (gap < MIN_INTERVAL_MS) continue;
    const days = gap / 86_400_000;
    if (days <= 0) continue;
    const rate = dated[i].kwh / days;
    if (!(rate > 0)) continue;
    anyRates.push(rate);
    if (gap >= MIN_CYCLE_MS) cycleRates.push(rate);
  }
  let rates = cycleRates.length > 0 ? cycleRates : anyRates;
  if (rates.length === 0) {
    const span = dated[dated.length - 1].at - dated[0].at;
    if (span < MIN_INTERVAL_MS) return null;
    let consumed = 0;
    for (let i = 0; i < dated.length - 1; i++) consumed += dated[i].kwh;
    if (consumed <= 0) return null;
    rates = [consumed / (span / 86_400_000)];
  }
  const daily = median(rates);
  if (daily == null || daily <= 0) return null;

  let stock = 0;
  for (let i = 0; i < dated.length; i++) {
    stock += dated[i].kwh;
    if (i < dated.length - 1) {
      stock = consume(dated[i].at, dated[i + 1].at, stock, daily);
    }
  }
  const latest = dated[dated.length - 1];
  return finishEstimate(latest.at, latest.kwh, stock, daily, rates.length, nowMs);
}

/** Fallback when we only have the API snapshot, not the full slip list. */
export function estimateKplcFromHint(
  depletion: KplcDepletionHint | null | undefined,
  latest?: KplcSlip | null,
  nowMs = Date.now(),
): KplcLiveEstimate | null {
  const daily = units(depletion?.dailyUseUnits);
  const bought = units(latest?.units ?? depletion?.lastPurchaseUnits);
  const startMs = latest?.purchasedAt ? new Date(latest.purchasedAt).getTime() : Number.NaN;
  if (daily > 0 && bought > 0 && Number.isFinite(startMs)) {
    return finishEstimate(startMs, bought, bought, daily, depletion?.sampleIntervals ?? 0, nowMs);
  }
  const remaining = units(depletion?.remainingUnits);
  if (daily > 0 && remaining > 0) {
    const emptyAt = whenEmpty(nowMs, remaining, daily);
    return {
      emptyAt,
      remainingUnits: round1(remaining),
      lastPurchaseUnits: bought,
      stockAtLastBuy: bought,
      carryInUnits: 0,
      dailyUseUnits: daily,
      sampleIntervals: depletion?.sampleIntervals ?? 0,
      alreadyEmpty: false,
    };
  }
  if (depletion?.alreadyEmpty) {
    const stamped = depletion.estimatedEmptyAt ? new Date(depletion.estimatedEmptyAt) : new Date(nowMs);
    return {
      emptyAt: Number.isNaN(stamped.getTime()) ? new Date(nowMs) : stamped,
      remainingUnits: 0,
      lastPurchaseUnits: bought,
      stockAtLastBuy: bought,
      carryInUnits: 0,
      dailyUseUnits: daily,
      sampleIntervals: depletion.sampleIntervals ?? 0,
      alreadyEmpty: true,
    };
  }
  if (depletion?.estimatedEmptyAt) {
    const stamped = new Date(depletion.estimatedEmptyAt);
    if (!Number.isNaN(stamped.getTime())) {
      return {
        emptyAt: stamped,
        remainingUnits: remaining,
        lastPurchaseUnits: bought,
        stockAtLastBuy: bought,
        carryInUnits: 0,
        dailyUseUnits: daily,
        sampleIntervals: depletion.sampleIntervals ?? 0,
        alreadyEmpty: stamped.getTime() <= nowMs,
      };
    }
  }
  return null;
}

export function resolveKplcEstimate(
  tokens: KplcSlip[] | null | undefined,
  depletion?: KplcDepletionHint | null,
  latest?: KplcSlip | null,
  nowMs = Date.now(),
): KplcLiveEstimate | null {
  return estimateKplcLive(tokens, nowMs) ?? estimateKplcFromHint(depletion, latest, nowMs);
}

/** @deprecated prefer resolveKplcEstimate — kept for call sites that only have the snapshot. */
export function resolveKplcEmptyAt(
  depletion: KplcDepletionHint | null | undefined,
  latest?: KplcSlip | null,
  nowMs = Date.now(),
): Date | null {
  return estimateKplcFromHint(depletion, latest, nowMs)?.emptyAt ?? null;
}

export function formatKplcClock(empty: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: NAIROBI,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(empty);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toLowerCase();
  return `${ordinalDay(day)} ${month}, ${hour}:${minute}${period ? ` ${period}` : ""}`;
}

export function formatKplcTimeLeft(empty: Date, nowMs = Date.now()): string {
  const diffMs = empty.getTime() - nowMs;
  if (diffMs <= 0) return "already out";
  if (diffMs < 90 * 60_000) {
    const mins = Math.max(1, Math.round(diffMs / 60_000));
    return mins === 1 ? "1 minute remaining" : `${mins} minutes remaining`;
  }
  const hours = Math.max(1, Math.round(diffMs / 3_600_000));
  if (hours < 24) return hours === 1 ? "1 hour remaining" : `${hours} hours remaining`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  const dayBit = days === 1 ? "1 day remaining" : `${days} days remaining`;
  if (remH === 0) return dayBit;
  const hourBit = remH === 1 ? "1 hour" : `${remH} hours`;
  return `${dayBit}, ${hourBit}`;
}

export function estimateRemainingUnits(
  depletion: KplcDepletionHint | null | undefined,
  latest?: KplcSlip | null,
  nowMs = Date.now(),
): number | null {
  const live = estimateKplcFromHint(depletion, latest, nowMs);
  if (!live) return null;
  return live.alreadyEmpty ? 0 : live.remainingUnits;
}

export function kplcEstimateCopy(live: KplcLiveEstimate): string {
  const slips = live.sampleIntervals;
  const slipBit = `From ${slips} slip${slips === 1 ? "" : "s"}`;
  const dayBit = live.dailyUseUnits > 0 ? ` · ~${live.dailyUseUnits.toFixed(1)} kWh a day` : "";
  const carryBit =
    live.carryInUnits >= 0.5 ? ` · ~${live.carryInUnits.toFixed(1)} kWh still on the meter when you last bought` : "";
  return `${slipBit}${dayBit}${carryBit}. Evenings heavier. Not a live meter read.`;
}
