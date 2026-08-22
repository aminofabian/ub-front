"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function remainingUnits(endsAt: string): {
  done: boolean;
  days: number;
  hours: number;
  mins: number;
  secs: number;
} {
  const target = Date.parse(endsAt);
  if (Number.isNaN(target)) {
    return { done: true, days: 0, hours: 0, mins: 0, secs: 0 };
  }
  const diff = Math.max(0, target - Date.now());
  if (diff <= 0) {
    return { done: true, days: 0, hours: 0, mins: 0, secs: 0 };
  }
  return {
    done: false,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1000),
  };
}

/** Ticking countdown for the promo section. Hides itself once the offer ends. */
export function PromoCountdown({ endsAt }: { endsAt: string }) {
  const [units, setUnits] = useState(() => remainingUnits(endsAt));

  useEffect(() => {
    setUnits(remainingUnits(endsAt));
    const timer = setInterval(() => {
      setUnits(remainingUnits(endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (units.done) {
    return null;
  }

  const cells = [
    { value: units.days, label: "days" },
    { value: units.hours, label: "hrs" },
    { value: units.mins, label: "min" },
    { value: units.secs, label: "sec" },
  ];

  return (
    <div className="flex items-center gap-1.5" aria-label="Offer ends in">
      {cells.map((cell, i) => (
        <div key={cell.label} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span className="text-sm font-bold text-white/70" aria-hidden>
              :
            </span>
          ) : null}
          <span className="min-w-9 rounded-md bg-black/35 px-1.5 py-1 text-center font-mono text-sm font-bold tabular-nums text-white backdrop-blur-sm">
            {pad(cell.value)}
          </span>
          <span className="sr-only">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}
