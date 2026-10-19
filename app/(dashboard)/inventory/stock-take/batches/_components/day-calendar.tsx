"use client";

import { Check } from "lucide-react";

import type { DayTile } from "@/lib/count-cycle/build-day-tiles";
import { formatCountDay } from "@/lib/count-cycle/format-count-day";
import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

const MAX_VISIBLE_DAYS = 28;
const STATE_LABEL: Record<DayTile["state"], string> = {
  done: "counted",
  current: "today",
  upcoming: "to count",
};

/** One square per counting day; today's square fills as the batch is counted. */
export function DayCalendar({ tiles, caption }: { tiles: DayTile[]; caption: string }) {
  const visible = tiles.slice(0, MAX_VISIBLE_DAYS);
  const hiddenDays = tiles.length - visible.length;
  return (
    <figure className="m-0">
      <ol className="grid grid-cols-7 gap-1.5" aria-label={caption}>
        {visible.map((tile) => (
          <DaySquare key={tile.key} tile={tile} />
        ))}
      </ol>
      <figcaption className={cn("mt-2 text-[12.5px] leading-relaxed", COUNT_TONE.mute)}>
        {caption}
        {hiddenDays > 0 ? ` · ${hiddenDays} more days not shown` : ""}
      </figcaption>
    </figure>
  );
}

function DaySquare({ tile }: { tile: DayTile }) {
  const weekday = formatCountDay(tile.date).slice(0, 1);
  return (
    <li
      aria-label={`${formatCountDay(tile.date)}, ${STATE_LABEL[tile.state]}`}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[2px] border tabular-nums",
        tile.state === "done" &&
          "border-transparent bg-[var(--op-accent,#1d4b3b)] text-[var(--op-surface,#fcfaf5)]",
        tile.state === "current" &&
          cn("border-2 border-[var(--op-accent,#1d4b3b)]", COUNT_TONE.surface),
        tile.state === "upcoming" && cn(COUNT_TONE.surface, COUNT_TONE.hair, COUNT_TONE.faint),
      )}
    >
      {tile.state === "current" ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-[color-mix(in_srgb,var(--op-accent,#1d4b3b)_18%,var(--op-surface,#fcfaf5))] transition-[height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ height: `${Math.round(tile.fill * 100)}%` }}
        />
      ) : null}
      <span className="relative text-[9px] font-semibold uppercase leading-none opacity-70">
        {weekday}
      </span>
      <span
        className={cn(
          "relative text-[17px] font-semibold leading-tight",
          tile.state === "current" && COUNT_TONE.ink,
        )}
      >
        {tile.date.getDate()}
      </span>
      {tile.state === "done" ? (
        <Check className="absolute right-1 top-1 size-2.5 stroke-[3]" aria-hidden />
      ) : null}
    </li>
  );
}
