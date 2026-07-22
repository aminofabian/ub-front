"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Package } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GlobalCatalogAdoptProgress } from "@/lib/api";

type GlobalCatalogImportProgressProps = {
  progress: GlobalCatalogAdoptProgress;
  productNames: string[];
  className?: string;
};

const PHASE_COPY: Record<GlobalCatalogAdoptProgress["phase"], string> = {
  queued: "Lining up your shelves…",
  importing: "Stocking your catalog…",
  finishing: "Almost there — locking it in…",
};

export function GlobalCatalogImportProgress({
  progress,
  productNames,
  className,
}: GlobalCatalogImportProgressProps) {
  const [displayPercent, setDisplayPercent] = useState(progress.percent);
  const done = progress.percent >= 100 || progress.phase === "finishing";

  useEffect(() => {
    if (displayPercent === progress.percent) return;
    const timer = window.setInterval(() => {
      setDisplayPercent((current) => {
        if (current === progress.percent) return current;
        const delta = progress.percent - current;
        const step =
          Math.sign(delta) * Math.max(1, Math.ceil(Math.abs(delta) / 5));
        const next = current + step;
        return delta > 0
          ? Math.min(next, progress.percent)
          : Math.max(next, progress.percent);
      });
    }, 24);
    return () => window.clearInterval(timer);
  }, [displayPercent, progress.percent]);

  const spotlightName = useMemo(() => {
    if (productNames.length === 0) return null;
    const index = Math.min(
      Math.max(progress.processed - 1, 0),
      productNames.length - 1,
    );
    return productNames[index] ?? null;
  }, [productNames, progress.processed]);

  const shelfSlots = useMemo(() => {
    const slots = Math.min(12, Math.max(6, Math.min(progress.total, 12)));
    const filled = Math.round((displayPercent / 100) * slots);
    return Array.from({ length: slots }, (_, i) => i < filled);
  }, [displayPercent, progress.total]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 p-4",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayPercent}
      aria-label="Import progress"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-emerald-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-6 size-40 rounded-full bg-sky-400/15 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-800/80 dark:text-emerald-200/80">
            {done ? "Import complete" : PHASE_COPY[progress.phase]}
          </p>
          <p className="mt-1 truncate text-sm text-foreground">
            {done
              ? `${progress.total} products ready in your catalog`
              : spotlightName
                ? `Adding ${spotlightName}`
                : progress.message || "Working through your selection…"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-3xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
            {displayPercent}
            <span className="ml-0.5 text-lg text-muted-foreground">%</span>
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
            {Math.min(progress.processed, progress.total)} / {progress.total}
          </p>
        </div>
      </div>

      <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-foreground/5 ring-1 ring-inset ring-foreground/10">
        <div
          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-[width] duration-300 ease-out"
          style={{ width: `${displayPercent}%` }}
        >
          {!done ? (
            <div className="animate-shimmer absolute inset-0" aria-hidden />
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-1.5" aria-hidden>
        {shelfSlots.map((filled, index) => (
          <div
            key={index}
            className={cn(
              "flex h-8 flex-1 items-end justify-center rounded-md border transition-all duration-300",
              filled
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                : "border-dashed border-border/70 bg-muted/30 text-muted-foreground/40",
            )}
            style={{ transitionDelay: `${index * 18}ms` }}
          >
            {filled ? (
              <Package className="mb-1 size-3.5" />
            ) : (
              <span className="mb-1 block size-1 rounded-full bg-current/50" />
            )}
          </div>
        ))}
      </div>

      {done ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
          <Check className="size-3.5" />
          Catalog updated
        </p>
      ) : null}
    </div>
  );
}
