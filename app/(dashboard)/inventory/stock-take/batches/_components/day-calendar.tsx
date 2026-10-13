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
      <figcaption className={cn("mt-2 text-[13px]", COUNT_TONE.mute)}>
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
        "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[10px] border tabular-nums",
        tile.state === "done" && "border-transparent bg-[var(--pos-primary,#0f766e)] text-white",
        tile.state === "current" && "border-2 border-[var(--pos-primary,#0f766e)] bg-white",
        tile.state === "upcoming" && cn("bg-white", COUNT_TONE.hair, COUNT_TONE.faint),
      )}
    >
      {tile.state === "current" ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,white)] transition-[height] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ height: `${Math.round(tile.fill * 100)}%` }}
        />
      ) : null}
      <span className="relative text-[9px] font-semibold uppercase leading-none opacity-70">
        {weekday}
      </span>
      <span
        className={cn(
          "relative font-heading text-[17px] font-semibold leading-tight",
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
