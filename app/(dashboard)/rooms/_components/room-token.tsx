"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A drawn room token: four walls with a doorway and a bed inside. The bed reads the room's state —
 * made and faint when free, filled forest when a guest is in, a terracotta key-dot when someone
 * arrives or leaves today. Kiosk world: ink on ivory, forest for taken, one terracotta accent,
 * 2px radius, hairline strokes. A 96×56 canvas so it lines up with the floor's table token.
 */

const EASE = "cubic-bezier(0.22,1,0.36,1)";
const CANVAS_W = 96;
const CANVAS_H = 56;

export type RoomState = "free" | "occupied" | "arriving" | "leaving" | "blocked";

export function RoomToken({
  state,
  className,
  size = "sm",
}: {
  state: RoomState;
  className?: string;
  size?: "sm" | "md";
}) {
  const occupied = state === "occupied" || state === "leaving";
  const flag = state === "arriving" || state === "leaving";

  // Pop the bed only when a room just became occupied (a check-in on the poll), not on every render.
  const wasOccupied = useRef(occupied);
  const [justFilled, setJustFilled] = useState(false);
  useEffect(() => {
    if (occupied && !wasOccupied.current) {
      setJustFilled(true);
      const t = setTimeout(() => setJustFilled(false), 320);
      wasOccupied.current = occupied;
      return () => clearTimeout(t);
    }
    wasOccupied.current = occupied;
  }, [occupied]);

  const forest = "var(--pos-primary,#1D4B3B)";
  // A CSS var so the attention hue lightens on the dark surface; light-mode terracotta as fallback.
  const terra = "var(--kiosk-highlight,#8f3f2f)";
  const hair = "color-mix(in srgb, var(--op-ink,#121A16) 22%, transparent)";
  const faint = "color-mix(in srgb, var(--op-ink,#121A16) 12%, transparent)";

  // Room walls, inset from the canvas; a doorway gap on the left wall.
  const rx = 14;
  const ry = 8;
  const rw = CANVAS_W - 28;
  const rh = CANVAS_H - 16;
  const roomStroke = occupied ? forest : state === "blocked" ? faint : hair;

  // The bed: a headboard strip and a mattress, in the room's lower-right.
  const bedX = rx + 10;
  const bedY = ry + 10;
  const bedW = rw - 20;
  const bedH = rh - 20;
  const bedFill = occupied
    ? forest
    : "transparent";
  const bedStroke = occupied ? forest : state === "blocked" ? faint : "color-mix(in srgb, var(--op-ink,#121A16) 28%, transparent)";

  const dim = size === "sm" ? "h-9 w-[3.75rem]" : "h-16 w-28";

  const roomFill = occupied
    ? "color-mix(in srgb, var(--pos-primary,#1D4B3B) 8%, var(--op-surface,#FCFAF5))"
    : "var(--op-surface,#FCFAF5)";

  return (
    <span className="inline-flex" style={{ ["--seat-ease" as string]: EASE }}>
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className={cn("seat-token", dim, className)}
        role="img"
        aria-label={
          state === "occupied"
            ? "Room occupied"
            : state === "leaving"
              ? "Room, guest leaving today"
              : state === "arriving"
                ? "Room, guest arriving today"
                : state === "blocked"
                  ? "Room out of use"
                  : "Room free"
        }
      >
        {/* Room walls */}
        <path
          d={`M ${rx} ${ry + 16}
              L ${rx} ${ry}
              L ${rx + rw} ${ry}
              L ${rx + rw} ${ry + rh}
              L ${rx} ${ry + rh}
              L ${rx} ${ry + rh - 16}`}
          style={{
            fill: "none",
            stroke: roomStroke,
            strokeWidth: 1.4,
            strokeLinejoin: "round",
            strokeLinecap: "round",
            transition: `stroke 220ms ${EASE}`,
          }}
        />
        {/* The room floor tint (behind the bed), so an occupied room reads warm forest. */}
        <rect
          x={rx + 0.7}
          y={ry + 0.7}
          width={rw - 1.4}
          height={rh - 1.4}
          rx={2}
          style={{ fill: roomFill, transition: `fill 220ms ${EASE}`, opacity: 0.9 }}
        />

        {/* Bed: headboard strip on the left edge of the bed, then the mattress. */}
        <g style={{ transition: `opacity 200ms ${EASE}` }}>
          <rect
            x={bedX}
            y={bedY}
            width={4}
            height={bedH}
            rx={1.5}
            style={{ fill: bedStroke, transition: `fill 200ms ${EASE}` }}
          />
          <rect
            // Remount on check-in so the one-shot settle retriggers; steady otherwise.
            key={justFilled ? "bed-fresh" : "bed"}
            x={bedX + 5}
            y={bedY}
            width={bedW - 5}
            height={bedH}
            rx={2.5}
            style={{
              fill: bedFill,
              stroke: bedStroke,
              strokeWidth: 1.3,
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: `fill 220ms ${EASE}, stroke 220ms ${EASE}`,
            }}
            className={justFilled ? "motion-safe:[animation:seat-pop_260ms_var(--seat-ease)_1]" : undefined}
          />
          {/* A pillow line near the headboard, faint, for the "made bed" read. */}
          <line
            x1={bedX + 11}
            y1={bedY + 3}
            x2={bedX + 11}
            y2={bedY + bedH - 3}
            style={{ stroke: occupied ? "var(--op-surface,#FCFAF5)" : faint, strokeWidth: 1, opacity: 0.6 }}
          />
        </g>

        {/* Out of use: a single diagonal hairline across the room. */}
        {state === "blocked" ? (
          <line
            x1={rx + 3}
            y1={ry + 3}
            x2={rx + rw - 3}
            y2={ry + rh - 3}
            style={{ stroke: hair, strokeWidth: 1.2 }}
          />
        ) : null}

        {/* Arriving / leaving today: a terracotta key-dot just off the top-right corner. */}
        {flag ? (
          <circle
            cx={rx + rw + 2.5}
            cy={ry - 1}
            r={2.6}
            style={{ fill: terra }}
            className="motion-safe:[animation:seat-attention_1600ms_ease-in-out_infinite]"
          />
        ) : null}
      </svg>
    </span>
  );
}
