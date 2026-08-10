"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Delete, Keyboard } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Counter QWERTY — on-screen letter keyboard for the grocery counter on a
 * flipped touch laptop. Docks as a real layout band (never overlays the
 * product shelf) and types into the search field. Marketplace paper/ink/teal
 * grammar: sharp keys with ink hairlines, teal pressed flash, block shadows,
 * a teal shelf-edge rail and a live "Searching…" echo.
 */

const DIGIT_ROW = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

/** Real QWERTY stagger: Q flush, A indented one, Z indented two. */
const LETTER_ROWS = [
  { keys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], start: 1 },
  { keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"], start: 2 },
  { keys: ["Z", "X", "C", "V", "B", "N", "M"], start: 3 },
] as const;

// Literal classes so Tailwind's JIT can see them.
const ROW_START_CLASS: Record<number, string | undefined> = {
  1: undefined,
  2: "col-start-2",
  3: "col-start-3",
};

const MAX_SEARCH_LENGTH = 60;

type CounterKeyboardProps = {
  /** Current search text (kept in sync with the search input). */
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
  className?: string;
};

function QKey({
  label,
  ariaLabel,
  onPress,
  wide = false,
  variant = "letter",
  className,
}: {
  label: ReactNode;
  ariaLabel: string;
  onPress: () => void;
  wide?: boolean;
  variant?: "letter" | "action" | "accent";
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setPressed(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 110);
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
        // preventDefault keeps the search input focused so the caret stays put.
        e.preventDefault();
        flash();
        onPress();
      }}
      className={cn(
        "relative select-none rounded-none border text-sm font-semibold tabular-nums",
        "transition-[transform,background-color,border-color] duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/40",
        "touch-manipulation active:translate-y-px",
        wide ? "col-span-2" : null,
        variant === "letter" &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,#fff_86%,var(--pos-paper,#f1ece3))] text-[var(--pos-ink,#1c1915)] shadow-[1px_1px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
        variant === "action" &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_80%,transparent)] text-[var(--pos-ink,#1c1915)]",
        variant === "accent" &&
          "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] shadow-[2px_2px_0_0_color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]",
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

export function CounterKeyboard({
  value,
  onChange,
  onClose,
  className,
}: CounterKeyboardProps) {
  const press = useCallback(
    (ch: string) => {
      onChange((value + ch).slice(0, MAX_SEARCH_LENGTH));
    },
    [onChange, value],
  );

  const trimmed = value.trim();

  return (
    <div
      className={cn(
        "relative z-20 shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)] px-2 pb-[var(--grocery-tab-clearance)] pt-1.5 sm:px-3",
        className,
      )}
    >
      {/* Shelf-edge rail + live search echo */}
      <div className="mx-auto mb-1.5 flex w-full max-w-3xl items-center gap-2.5 px-0.5">
        <span
          aria-hidden
          className="h-1.5 w-10 shrink-0 bg-[var(--pos-primary,#0f766e)]"
        />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          On-screen keyboard
        </span>
        <span
          aria-live="polite"
          className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground/80"
        >
          <Keyboard className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            {trimmed
              ? `Searching “${trimmed}”`
              : "Type a product name or barcode"}
          </span>
        </span>
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-1">
        {/* Digit row */}
        <div className="grid grid-cols-10 gap-1">
          {DIGIT_ROW.map((d) => (
            <QKey
              key={d}
              label={d}
              ariaLabel={`Digit ${d}`}
              onPress={() => press(d)}
            />
          ))}
        </div>

        {/* Letter rows with real keyboard stagger */}
        {LETTER_ROWS.map((row) => (
          <div key={row.keys.join("")} className="grid grid-cols-10 gap-1">
            {row.keys.map((letter) => (
              <QKey
                key={letter}
                label={letter}
                ariaLabel={letter}
                onPress={() => press(letter.toLowerCase())}
                className={ROW_START_CLASS[row.start]}
              />
            ))}
          </div>
        ))}

        {/* Controls */}
        <div className="grid grid-cols-5 gap-1">
          <QKey
            label="Clear"
            ariaLabel="Clear search"
            variant="action"
            onPress={() => onChange("")}
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          />
          <QKey
            label="Space"
            ariaLabel="Space"
            wide
            variant="action"
            onPress={() => press(" ")}
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          />
          <QKey
            label={<Delete className="size-4" />}
            ariaLabel="Backspace"
            variant="action"
            onPress={() => onChange(value.slice(0, -1))}
          />
          <QKey
            label="Done"
            ariaLabel="Done"
            variant="accent"
            onPress={onClose}
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          />
        </div>
      </div>
    </div>
  );
}
