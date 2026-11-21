"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  shelfAnnouncement,
  shelfBaysFilled,
  shelfLoadCopy,
  type ShelfAisle,
} from "@/lib/catalog-shelf-load";
import { cn } from "@/lib/utils";

import styles from "./catalog-shelf-loader.module.css";

const BAYS = 20;

/**
 * Counts up to `target` instead of jumping, so a slice of 500 arriving reads as progress.
 * Dynamic and interruptible, so it is driven from script; with reduced motion it simply shows
 * the number.
 */
function useRolledNumber(target: number): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame === "undefined") {
      fromRef.current = target;
      setShown(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const duration = 450;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out: fast at first, settling on the number.
      const eased = 1 - Math.pow(1 - t, 4);
      const value = Math.round(from + (target - from) * eased);
      fromRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

/** Re-renders once a second while a load runs, so "about a minute left" keeps up. */
function useElapsed(startedAt: number, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, startedAt]);
  return Math.max(0, now - startedAt);
}

export type CatalogShelfLoaderProps = {
  loaded: number;
  total: number;
  done: boolean;
  /** `Date.now()` when the load began. */
  startedAt: number;
  /** "medicines" in a pharmacy, "products" elsewhere. */
  noun: string;
  /** Products ticked to import, and how many could be. Shown once choosing has started. */
  selectedCount: number;
  selectableCount: number;
  aisles: ShelfAisle[];
  /** Tick every product in the aisle, or untick them all when they are all ticked. */
  onToggleAisle?: (aisle: ShelfAisle) => void;
  className?: string;
};

/**
 * Shown while a big starter pack arrives in slices: a count that climbs, a shelf whose bays
 * fill as each twentieth lands, how long is left at the measured pace, and the aisles as
 * buttons so a shop can drop "Veterinary" in one tap instead of four hundred.
 */
export function CatalogShelfLoader({
  loaded,
  total,
  done,
  startedAt,
  noun,
  selectedCount,
  selectableCount,
  aisles,
  onToggleAisle,
  className,
}: CatalogShelfLoaderProps) {
  const elapsedMs = useElapsed(startedAt, !done);
  const state = { loaded, total, done, elapsedMs };
  const copy = shelfLoadCopy(state, noun);
  const shownLoaded = useRolledNumber(loaded);
  const shownSelected = useRolledNumber(selectedCount);
  const filled = done ? BAYS : shelfBaysFilled(loaded, total, BAYS);
  const percent = total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  const skipped = Math.max(0, selectableCount - selectedCount);

  return (
    <section className={cn(styles.root, className)} aria-label={`Loading ${noun}`}>
      <div className={styles.top}>
        {loaded > 0 && !done ? <span className={styles.count}>{shownLoaded.toLocaleString("en-KE")}</span> : null}
        <span className={styles.headline}>{copy.headline}</span>
        {done ? (
          <span className={styles.stamp}>
            <Check size={14} strokeWidth={3} aria-hidden />
            All unpacked
          </span>
        ) : total > 0 ? (
          <span className={styles.percent}>{percent}%</span>
        ) : null}
      </div>

      <div
        className={styles.shelf}
        role="progressbar"
        aria-label={`${noun} loaded`}
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={Math.min(loaded, Math.max(total, 1))}
      >
        {Array.from({ length: BAYS }, (_, i) => (
          <span
            key={i}
            className={cn(styles.bay, i < filled && styles.bayFull, !done && i === filled && styles.bayActive)}
          >
            <span className={styles.box} />
            <span className={styles.box} />
            <span className={styles.box} />
          </span>
        ))}
      </div>

      <p className={styles.detail}>
        {/* The key restarts the settle-in only when the sentence itself changes. */}
        <span key={copy.detail} className={styles.detailLine}>
          {copy.detail}
        </span>
      </p>

      {aisles.length > 0 && onToggleAisle ? (
        <>
          <div className={styles.aisles}>
            <span className={styles.aislesLabel}>Keep or skip a whole aisle:</span>
            {aisles.map((aisle, i) => {
              const all = aisle.selected >= aisle.total;
              const none = aisle.selected === 0;
              return (
                <button
                  key={aisle.key}
                  type="button"
                  aria-pressed={all ? true : none ? false : "mixed"}
                  className={cn(styles.aisle, none && styles.aisleSkipped, !all && !none && styles.aislePart)}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  onClick={() => onToggleAisle(aisle)}
                >
                  {aisle.name}
                  <span className={styles.aisleCount}>
                    {all
                      ? aisle.total.toLocaleString("en-KE")
                      : none
                        ? "skipped"
                        : `${aisle.selected.toLocaleString("en-KE")} of ${aisle.total.toLocaleString("en-KE")}`}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={styles.tally}>
            <strong>{shownSelected.toLocaleString("en-KE")}</strong> ticked to sell
            {skipped > 0 ? `, ${skipped.toLocaleString("en-KE")} left out` : ""}.
          </p>
        </>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {shelfAnnouncement({ loaded, total, done, elapsedMs: 0 }, noun)}
      </span>
    </section>
  );
}
