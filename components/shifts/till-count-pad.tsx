"use client";

/**
 * Till Count Pad — collapsible on-screen keyboard for cash denomination counting.
 *
 * Metaphor: a till drawer that pulls open from a notched pull-bar. Cashiers on
 * tablets/tills get digit entry + stack quick-adds without fighting the OS keyboard.
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Delete,
  Keyboard,
  Layers,
  SkipForward,
} from "lucide-react";

import { cn } from "@/lib/utils";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const STACK_ADDS = [1, 5, 10, 20] as const;

export type TillCountPadMode = "quantity" | "decimal";

export type TillCountPadProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display label for the active field (e.g. "KES 1,000"). */
  activeLabel?: string | null;
  /** Current numeric value being edited. */
  value: number;
  onChange: (next: number) => void;
  /** quantity = whole counts; decimal = cash totals. */
  mode?: TillCountPadMode;
  /** Advance to the next denomination after a count. */
  onNext?: () => void;
  /** Optional subtitle under the active label (e.g. line total). */
  hint?: string | null;
  className?: string;
  /** When true, hide the collapsed pull (pad always visible). */
  forceOpen?: boolean;
};

function formatDisplay(value: number, mode: TillCountPadMode): string {
  if (mode === "decimal") {
    if (!Number.isFinite(value) || value === 0) return "0";
    // Keep trailing decimals while typing via string buffer — display falls back to number.
    return String(value);
  }
  return String(Math.max(0, Math.floor(value || 0)));
}

/**
 * Apply a digit / control to a numeric buffer.
 * `fresh` means the next digit replaces the value (after focusing a new field).
 */
export function applyTillPadKey(
  current: number,
  key: string,
  opts: {
    mode: TillCountPadMode;
    fresh: boolean;
    /** Raw decimal buffer when mode is decimal (preserves "12."). */
    buffer?: string;
  },
): { value: number; buffer: string; fresh: boolean } {
  const mode = opts.mode;
  let buffer =
    opts.buffer ??
    (mode === "decimal"
      ? formatDisplay(current, mode)
      : String(Math.max(0, Math.floor(current || 0))));
  let fresh = opts.fresh;

  if (key === "clear") {
    return { value: 0, buffer: "0", fresh: true };
  }
  if (key === "backspace") {
    if (fresh || buffer.length <= 1) {
      return { value: 0, buffer: "0", fresh: true };
    }
    buffer = buffer.slice(0, -1);
    if (buffer === "" || buffer === "-" || buffer === ".") {
      return { value: 0, buffer: "0", fresh: true };
    }
    const n = Number(buffer);
    return {
      value: Number.isFinite(n) ? Math.max(0, n) : 0,
      buffer,
      fresh: false,
    };
  }
  if (key === ".") {
    if (mode !== "decimal") {
      return { value: current, buffer, fresh };
    }
    if (fresh) {
      return { value: 0, buffer: "0.", fresh: false };
    }
    if (buffer.includes(".")) {
      return { value: current, buffer, fresh: false };
    }
    buffer = `${buffer}.`;
    return { value: Number(buffer) || 0, buffer, fresh: false };
  }
  if (/^\d$/.test(key)) {
    if (fresh || buffer === "0") {
      buffer = key;
    } else if (mode === "decimal") {
      const [, frac = ""] = buffer.split(".");
      if (buffer.includes(".") && frac.length >= 2) {
        return { value: current, buffer, fresh: false };
      }
      buffer = `${buffer}${key}`;
    } else {
      // Cap quantity length so fat-finger taps don't create absurd counts.
      if (buffer.length >= 5) {
        return { value: current, buffer, fresh: false };
      }
      buffer = `${buffer}${key}`;
    }
    const n = Number(buffer);
    return {
      value: Number.isFinite(n) ? Math.max(0, n) : 0,
      buffer,
      fresh: false,
    };
  }
  return { value: current, buffer, fresh };
}

function PadKey({
  label,
  ariaLabel,
  onPress,
  variant = "digit",
  wide,
  className,
}: {
  label: ReactNode;
  ariaLabel: string;
  onPress: () => void;
  variant?: "digit" | "action" | "accent" | "ghost";
  wide?: boolean;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setPressed(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 120);
  }, []);

  useEffect(
    () => () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
    },
    [],
  );

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        e.preventDefault();
        flash();
        onPress();
      }}
      className={cn(
        "relative select-none rounded-none border text-base font-semibold tabular-nums",
        "transition-[transform,box-shadow,background-color,border-color] duration-150",
        "ease-[cubic-bezier(0.16,1,0.3,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/40",
        "active:translate-y-px",
        wide ? "col-span-2" : null,
        variant === "digit" &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#fff_88%,transparent)] text-[var(--pos-ink,#1c1915)] shadow-[1px_1px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
        variant === "action" &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_80%,transparent)] text-[var(--pos-ink,#1c1915)]",
        variant === "accent" &&
          "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-muted-foreground shadow-none",
        pressed && "translate-y-0.5 shadow-none brightness-[0.97]",
        className,
      )}
    >
      <span className="relative z-[1] flex h-11 items-center justify-center sm:h-12">
        {label}
      </span>
    </button>
  );
}

export function TillCountPad({
  open,
  onOpenChange,
  activeLabel,
  value,
  onChange,
  mode = "quantity",
  onNext,
  hint,
  className,
  forceOpen = false,
}: TillCountPadProps) {
  const panelId = useId();
  const [fresh, setFresh] = useState(true);
  const [buffer, setBuffer] = useState(() => formatDisplay(value, mode));
  const [stamp, setStamp] = useState<number | null>(null);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expanded = forceOpen || open;

  // Sync buffer when the parent switches fields (label/value jump while fresh).
  useEffect(() => {
    setBuffer(formatDisplay(value, mode));
    setFresh(true);
  }, [activeLabel, mode]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: field switch, not every keystroke

  // Keep the readout honest if the value is edited outside the pad (native input).
  useEffect(() => {
    setBuffer((prev) => {
      const n = Number(prev);
      const matches =
        (Number.isFinite(n) && n === value) ||
        (mode === "decimal" &&
          prev.endsWith(".") &&
          Number(prev.slice(0, -1)) === value);
      if (matches) return prev;
      return formatDisplay(value, mode);
    });
  }, [value, mode]);

  useEffect(
    () => () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    },
    [],
  );

  const commit = useCallback(
    (next: { value: number; buffer: string; fresh: boolean }) => {
      setBuffer(next.buffer);
      setFresh(next.fresh);
      onChange(next.value);
    },
    [onChange],
  );

  const pressKey = useCallback(
    (key: string) => {
      commit(applyTillPadKey(value, key, { mode, fresh, buffer }));
    },
    [buffer, commit, fresh, mode, value],
  );

  const addStack = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.floor((value || 0) + n));
      setBuffer(String(next));
      setFresh(true);
      onChange(next);
      setStamp(n);
      if (stampTimer.current) clearTimeout(stampTimer.current);
      stampTimer.current = setTimeout(() => setStamp(null), 420);
    },
    [onChange, value],
  );

  return (
    <div
      className={cn(
        "relative mt-2 overflow-hidden rounded-none border",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_92%,#f7f3eb)]",
        "shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)]",
        className,
      )}
    >
      {/* Drawer pull */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onOpenChange(!expanded)}
        className={cn(
          "group flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
          "transition-colors hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]/40",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-none",
            "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
            "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)]",
            expanded &&
              "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]",
          )}
        >
          <Keyboard className="size-3.5" />
          <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-none bg-current opacity-40" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
            {expanded ? "Count pad" : "Tap to use count pad"}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {activeLabel
              ? `Editing ${activeLabel} — use the keys below`
              : "On-screen number pad for till counting"}
          </span>
        </span>
        {!expanded ? (
          <span
            aria-hidden
            className="mr-1 hidden items-end gap-0.5 opacity-70 sm:flex"
          >
            {["7", "8", "9"].map((d) => (
              <span
                key={d}
                className="flex h-5 w-4 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#fff_82%,transparent)] text-[9px] font-semibold tabular-nums text-muted-foreground"
              >
                {d}
              </span>
            ))}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Collapsible body — grid 0fr/1fr keeps height animation smooth */}
      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2.5 border-t border-border/45 px-3 pb-3 pt-2.5">
            {/* Active field readout */}
            <div className="relative flex items-stretch gap-2 overflow-hidden rounded-lg border border-border/50 bg-muted/20">
              <div
                aria-hidden
                className={cn(
                  "w-1.5 shrink-0 bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-800",
                  "shadow-[2px_0_8px_-2px_rgba(16,185,129,0.45)]",
                )}
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {activeLabel ?? "Amount"}
                  </p>
                  {hint ? (
                    <p className="truncate text-[10px] text-muted-foreground/90">
                      {hint}
                    </p>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground",
                    "transition-[filter,opacity] duration-150",
                    stamp != null && "opacity-90 blur-[0.3px]",
                  )}
                >
                  {buffer}
                </p>
              </div>
              {/* Stack stamp flash */}
              {stamp != null ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-live="polite"
                >
                  <span className="animate-in fade-in zoom-in-95 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-sm font-bold tabular-nums text-emerald-800 duration-300 dark:text-emerald-200">
                    +{stamp}
                  </span>
                </span>
              ) : null}
            </div>

            {mode === "quantity" ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Layers className="size-3" />
                  Stack
                </span>
                {STACK_ADDS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Add ${n}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      addStack(n);
                    }}
                    className={cn(
                      "h-8 min-w-10 rounded-lg border border-border/55 bg-background px-2",
                      "text-[12px] font-semibold tabular-nums text-foreground shadow-sm",
                      "transition-[transform,background-color,border-color] duration-150",
                      "hover:border-emerald-500/40 hover:bg-emerald-500/10",
                      "active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
                  >
                    +{n}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              className="grid grid-cols-3 gap-1.5"
              role="group"
              aria-label="On-screen number pad"
            >
              {DIGITS.map((d) => (
                <PadKey
                  key={d}
                  label={d}
                  ariaLabel={`Digit ${d}`}
                  onPress={() => pressKey(d)}
                />
              ))}
              {mode === "decimal" ? (
                <PadKey
                  label="."
                  ariaLabel="Decimal point"
                  variant="action"
                  onPress={() => pressKey(".")}
                />
              ) : (
                <PadKey
                  label="C"
                  ariaLabel="Clear"
                  variant="action"
                  onPress={() => pressKey("clear")}
                />
              )}
              <PadKey
                label="0"
                ariaLabel="Digit 0"
                onPress={() => pressKey("0")}
              />
              <PadKey
                label={<Delete className="size-4" />}
                ariaLabel="Backspace"
                variant="action"
                onPress={() => pressKey("backspace")}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {mode === "decimal" ? (
                <PadKey
                  label="Clear"
                  ariaLabel="Clear"
                  variant="action"
                  onPress={() => pressKey("clear")}
                />
              ) : (
                <PadKey
                  label={
                    <span className="inline-flex items-center gap-1.5 text-[13px]">
                      Next note
                      <SkipForward className="size-3.5 opacity-80" />
                    </span>
                  }
                  ariaLabel="Next denomination"
                  variant="action"
                  onPress={() => {
                    if (!onNext) return;
                    setFresh(true);
                    onNext();
                  }}
                  className={!onNext ? "pointer-events-none opacity-40" : undefined}
                />
              )}
              <PadKey
                label="Done"
                ariaLabel="Done"
                variant="accent"
                onPress={() => {
                  setFresh(true);
                  onOpenChange(false);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
