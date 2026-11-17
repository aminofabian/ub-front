"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A drawn table token: a tabletop with chairs around it. The chairs read the state of the real
 * table — how many are taken, which one a new line is going to. In the Kiosk world: ink on ivory,
 * forest for taken, one terracotta accent for the chosen seat, 2px radius, hairline strokes.
 *
 * Two modes:
 *  - interactive (the order sheet's "For" picker): each chair is a radio; the tabletop is "everyone".
 *  - display (a floor card): read-only, the taken chairs filled by the guest count.
 */

const EASE = "cubic-bezier(0.22,1,0.36,1)";

type Seat = { x: number; y: number };
type Layout = { seats: Seat[]; top: { x: number; y: number; w: number; h: number } };

/**
 * The tabletop and the chairs around it for a party of this size (clamped 1–10). The table shape
 * follows the party: a 1–2-top is a small square with chairs on the ends, a 3–4-top a square with
 * chairs top and bottom, and a larger party a long board with chairs packed along the long edges.
 * All on a fixed 96×56 canvas so every token lines up on a shelf of tables.
 */
function seatLayout(capacity: number): Layout {
  const n = Math.max(1, Math.min(10, capacity));
  const CW = 96;
  const CH = 56;
  const cy = CH / 2;

  // The board grows with the party: narrow for two, wide for a banquet. Height is steady so the
  // chairs above and below always clear it.
  const longEach = Math.ceil(Math.min(n, 8) / 2); // chairs per long edge
  const tableW = Math.round(Math.min(74, 26 + (longEach - 1) * 14));
  const tableH = 24;
  const top = { x: (CW - tableW) / 2, y: cy - tableH / 2, w: tableW, h: tableH };

  const left = top.x;
  const right = top.x + tableW;
  const aboveY = top.y - 8;
  const belowY = top.y + tableH + 8;
  const endX = (edge: "l" | "r") => (edge === "l" ? left - 8 : right + 8);

  const seats: Seat[] = [];

  if (n <= 2) {
    // A two-top: one chair each short end.
    if (n >= 1) seats.push({ x: endX("l"), y: cy });
    if (n >= 2) seats.push({ x: endX("r"), y: cy });
    return { seats, top };
  }

  // 3+: share along the long edges, remainder on the ends.
  const along = (count: number, y: number): Seat[] =>
    count <= 0
      ? []
      : count === 1
        ? [{ x: top.x + tableW / 2, y }]
        : Array.from({ length: count }, (_, i) => ({
            x: top.x + 6 + ((tableW - 12) * i) / (count - 1),
            y,
          }));

  const ends = n > 8 ? n - 8 : 0;
  const forLongEdges = n - ends;
  const topCount = Math.ceil(forLongEdges / 2);
  const bottomCount = forLongEdges - topCount;
  seats.push(...along(topCount, aboveY));
  seats.push(...along(bottomCount, belowY));
  if (ends >= 1) seats.push({ x: endX("l"), y: cy });
  if (ends >= 2) seats.push({ x: endX("r"), y: cy });

  return { seats: seats.slice(0, n), top };
}

const CANVAS_W = 96;
const CANVAS_H = 56;

type TableSeatsProps = {
  capacity: number;
  /** How many chairs read as taken (a floor card: the guest count). */
  taken?: number;
  /** Interactive: the chosen seat (0 = the whole table), and a setter. */
  selected?: number;
  onSelect?: (seat: number) => void;
  /** A quiet terracotta pulse on the table: someone is waiting (a bill, a ready plate). */
  attention?: boolean;
  /** The table is booked for later: its chairs read as held, not empty, so it is not mistaken for free. */
  booked?: boolean;
  className?: string;
  /** Visual size. "sm" for a floor card, "md" for the picker. */
  size?: "sm" | "md";
};

export function TableSeats({
  capacity,
  taken = 0,
  selected,
  onSelect,
  attention = false,
  booked = false,
  className,
  size = "md",
}: TableSeatsProps) {
  const { seats, top } = useMemo(() => seatLayout(capacity), [capacity]);
  const interactive = typeof onSelect === "function";
  const vb = `0 0 ${CANVAS_W} ${CANVAS_H}`;
  const chairR = 4.6;
  // In the picker, "taken" is really "chosen so far"; only the chosen chair lights up. On a floor
  // card, taken = guests, and the first N chairs fill in.
  const litCount = interactive ? 0 : Math.max(0, Math.min(taken, seats.length));

  // When more chairs fill than last time (a guest was just seated on the poll), pop only the ones
  // that newly lit — so the table visibly reacts, without re-animating the whole token.
  const prevLit = useRef(litCount);
  const [freshFrom, setFreshFrom] = useState<number>(Number.POSITIVE_INFINITY);
  useEffect(() => {
    if (!interactive && litCount > prevLit.current) {
      setFreshFrom(prevLit.current);
      const t = setTimeout(() => setFreshFrom(Number.POSITIVE_INFINITY), 320);
      prevLit.current = litCount;
      return () => clearTimeout(t);
    }
    prevLit.current = litCount;
  }, [litCount, interactive]);

  const forest = "var(--pos-primary,#1D4B3B)";
  // The attention hue. A CSS var so it lightens on the dark surface (where a deep terracotta would
  // vanish), falling back to the light-mode terracotta.
  const terra = "var(--kiosk-highlight,#8f3f2f)";
  const hair = "color-mix(in srgb, var(--op-ink,#121A16) 22%, transparent)";
  const faint = "color-mix(in srgb, var(--op-ink,#121A16) 10%, transparent)";
  // An empty chair still has to read "a seat is here" from across the room, so it is not as faint
  // as the tabletop seam.
  const chairEmpty = "color-mix(in srgb, var(--op-ink,#121A16) 30%, transparent)";

  const tableChosen = interactive && selected === 0;
  const dim = size === "sm" ? "h-9 w-[3.75rem]" : "h-16 w-28";

  function chairFill(i: number): { fill: string; stroke: string; lit: boolean } {
    const seatNo = i + 1;
    if (interactive) {
      const chosen = selected === seatNo;
      return chosen
        ? { fill: forest, stroke: forest, lit: true }
        : { fill: "transparent", stroke: chairEmpty, lit: false };
    }
    const lit = i < litCount;
    if (lit) return { fill: forest, stroke: forest, lit: true };
    // A booked table's chairs are held: terracotta outline, so the table reads reserved, not free.
    if (booked) return { fill: "transparent", stroke: terra, lit: false };
    return { fill: "transparent", stroke: chairEmpty, lit: false };
  }

  // A table that needs someone — wants the bill, has a plate ready — turns its top terracotta, so it
  // stands out from a floor full of forest tables at a glance. This is the floor's first read.
  const wants = !interactive && attention;
  const topStroke = wants ? terra : tableChosen || litCount > 0 ? forest : hair;
  const topFill = wants
    ? "color-mix(in srgb, var(--kiosk-highlight,#8f3f2f) 14%, var(--op-surface,#FCFAF5))"
    : tableChosen
      ? "color-mix(in srgb, var(--pos-primary,#1D4B3B) 12%, var(--op-surface,#FCFAF5))"
      : litCount > 0
        ? "color-mix(in srgb, var(--pos-primary,#1D4B3B) 7%, var(--op-surface,#FCFAF5))"
        : "var(--op-surface,#FCFAF5)";
  const seamColor = wants ? terra : tableChosen || litCount > 0 ? forest : faint;

  const body = (
    <svg viewBox={vb} className={cn("seat-token", dim, className)} role={interactive ? undefined : "img"} aria-hidden={interactive}>
      {/* Tabletop */}
      <rect
        x={top.x}
        y={top.y}
        width={top.w}
        height={top.h}
        rx={3}
        style={{
          fill: topFill,
          stroke: topStroke,
          strokeWidth: wants ? 1.8 : 1.4,
          transition: `fill 220ms ${EASE}, stroke 220ms ${EASE}, x 220ms ${EASE}, width 220ms ${EASE}`,
        }}
      />
      {/* The board seam: one hairline down the middle, like a real tabletop. */}
      <line
        x1={top.x + top.w / 2}
        y1={top.y + 3}
        x2={top.x + top.w / 2}
        y2={top.y + top.h - 3}
        style={{ stroke: seamColor, strokeWidth: 0.75, opacity: 0.5 }}
      />

      {/* Chairs */}
      {seats.map((s, i) => {
        const { fill, stroke, lit } = chairFill(i);
        // A chair pops only when it is the one that just filled (or on the picker, just chosen),
        // not on every poll. The key change remounts it so the one-shot animation retriggers.
        const fresh = interactive ? lit : lit && i >= freshFrom;
        return (
          <circle
            key={fresh ? `pop-${i}` : i}
            cx={s.x}
            cy={s.y}
            r={chairR}
            style={{
              fill,
              stroke,
              strokeWidth: 1.3,
              transition: `fill 200ms ${EASE}, stroke 200ms ${EASE}, transform 200ms ${EASE}`,
              transformOrigin: `${s.x}px ${s.y}px`,
              transform: lit ? "scale(1.1)" : "scale(1)",
            }}
            className={fresh ? "motion-safe:[animation:seat-pop_260ms_var(--seat-ease)_1]" : undefined}
          />
        );
      })}

      {/* Attention: a soft terracotta dot breathing just off the tabletop's top-right corner. */}
      {attention ? (
        <circle
          cx={top.x + top.w + 2.5}
          cy={top.y - 1}
          r={2.6}
          style={{ fill: terra }}
          className="motion-safe:[animation:seat-attention_1600ms_ease-in-out_infinite]"
        />
      ) : null}
    </svg>
  );

  if (!interactive) {
    return (
      <span className="inline-flex" style={{ ["--seat-ease" as string]: EASE }}>
        {body}
      </span>
    );
  }

  // Interactive: an accessible radiogroup. The tabletop is one option ("everyone"), each chair one.
  return (
    <div
      role="radiogroup"
      aria-label="Who is this round for"
      className={cn("relative inline-block", className)}
      style={{ ["--seat-ease" as string]: EASE }}
    >
      {body}
      {/* Clickable overlays over the SVG, positioned by percentage so they track the viewBox. */}
      <button
        type="button"
        role="radio"
        aria-checked={selected === 0}
        aria-label="Everyone at the table"
        title="Everyone"
        onClick={() => onSelect?.(0)}
        className="absolute rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
        style={{
          left: `${(top.x / CANVAS_W) * 100}%`,
          top: `${(top.y / CANVAS_H) * 100}%`,
          width: `${(top.w / CANVAS_W) * 100}%`,
          height: `${(top.h / CANVAS_H) * 100}%`,
        }}
      />
      {seats.map((s, i) => {
        const seatNo = i + 1;
        // Place the hit target over the chair, in viewBox percentages of the fixed canvas.
        const leftPct = (s.x / CANVAS_W) * 100;
        const topPct = (s.y / CANVAS_H) * 100;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === seatNo}
            aria-label={`Seat ${seatNo}`}
            title={`Seat ${seatNo}`}
            onClick={() => onSelect?.(seatNo)}
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)]"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          />
        );
      })}
    </div>
  );
}
