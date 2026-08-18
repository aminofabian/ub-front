const NAIROBI = "Africa/Nairobi";

function units(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
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

type DepletionBits = {
  estimatedEmptyAt?: string | null;
  remainingUnits?: number | string | null;
  lastPurchaseUnits?: number | string | null;
  dailyUseUnits?: number | string | null;
  alreadyEmpty?: boolean;
};

type SlipBits = {
  purchasedAt?: string | null;
  units?: number | string | null;
};

/** Empty clock from this slip’s kWh ÷ daily use, starting at purchase time. */
export function resolveKplcEmptyAt(
  depletion: DepletionBits | null | undefined,
  latest?: SlipBits | null,
  nowMs = Date.now(),
): Date | null {
  const daily = units(depletion?.dailyUseUnits);
  const bought = units(latest?.units ?? depletion?.lastPurchaseUnits);
  const startMs = latest?.purchasedAt
    ? new Date(latest.purchasedAt).getTime()
    : Number.NaN;
  if (daily > 0 && bought > 0 && Number.isFinite(startMs)) {
    return new Date(startMs + (bought / daily) * 86_400_000);
  }
  if (daily > 0) {
    const remaining = units(depletion?.remainingUnits);
    if (remaining > 0) {
      return new Date(nowMs + (remaining / daily) * 86_400_000);
    }
  }
  if (depletion?.estimatedEmptyAt) {
    const stamped = new Date(depletion.estimatedEmptyAt);
    if (!Number.isNaN(stamped.getTime())) return stamped;
  }
  return null;
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
  depletion: DepletionBits | null | undefined,
  latest?: SlipBits | null,
  nowMs = Date.now(),
): number | null {
  const reported = units(depletion?.remainingUnits);
  if (reported > 0) return reported;
  const daily = units(depletion?.dailyUseUnits);
  const bought = units(latest?.units ?? depletion?.lastPurchaseUnits);
  const startMs = latest?.purchasedAt
    ? new Date(latest.purchasedAt).getTime()
    : Number.NaN;
  if (daily > 0 && bought > 0 && Number.isFinite(startMs)) {
    const used = daily * Math.max(0, (nowMs - startMs) / 86_400_000);
    return Math.max(0, Math.round((bought - used) * 10) / 10);
  }
  return reported > 0 ? reported : null;
}
