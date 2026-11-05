"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/components/storefront/templates/store/zetu.module.css";
import { cn } from "@/lib/utils";

export type ZetuCountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function zetuCountdownParts(
  endsAt: Date,
  now = new Date(),
): ZetuCountdownParts {
  const ms = Math.max(0, endsAt.getTime() - now.getTime());
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: ms <= 0,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type Props = {
  endsAt?: string | Date | null;
  /** Prefix before the units — shopzetu uses "ENDS IN". */
  lead?: string;
  dark?: boolean;
  className?: string;
};

/**
 * Shopzetu-style sale countdown: ENDS IN 28D 00H 30M 21S.
 * Ticks once a second; falls back to end-of-month when no date is set.
 */
export function ZetuCountdown({
  endsAt,
  lead = "Ends in",
  dark = false,
  className,
}: Props) {
  const target = useMemo(() => {
    if (endsAt instanceof Date) {
      return Number.isNaN(endsAt.getTime()) ? null : endsAt;
    }
    const raw = typeof endsAt === "string" ? endsAt.trim() : "";
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [endsAt]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!target) return null;
  const parts = zetuCountdownParts(target, now);
  if (parts.done) return null;

  const units = [
    { value: parts.days, label: "D" },
    { value: parts.hours, label: "H" },
    { value: parts.minutes, label: "M" },
    { value: parts.seconds, label: "S" },
  ] as const;

  return (
    <span
      className={cn(styles.countdown, dark && styles.countdownDark, className)}
      suppressHydrationWarning
      aria-live="off"
      aria-label={`${lead} ${parts.days} days ${parts.hours} hours ${parts.minutes} minutes ${parts.seconds} seconds`}
    >
      <span className={styles.countdownLead}>{lead}</span>
      {units.map((unit) => (
        <span key={unit.label} className={styles.countdownUnit}>
          <span className={styles.countdownValue} suppressHydrationWarning>
            {unit.label === "D" ? unit.value : pad(unit.value)}
          </span>
          <span className={styles.countdownLabel}>{unit.label}</span>
        </span>
      ))}
    </span>
  );
}
