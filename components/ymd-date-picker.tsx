"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Sparkles,
  X,
} from "lucide-react";
import { Popover } from "radix-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addYmdDays,
  addYmdMonths,
  expiryTone,
  expiryToneLabel,
  formatYmd,
  formatYmdCompact,
  parseYmd,
  todayYmdLocal,
  toYmd,
  type ExpiryTone,
} from "@/lib/ymd-date";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const TONE_TRIGGER: Record<ExpiryTone, string> = {
  empty:
    "border-border bg-background hover:border-primary/30 hover:bg-primary/[0.03]",
  past: "border-red-500/35 bg-red-500/[0.06] hover:bg-red-500/[0.09]",
  urgent:
    "border-amber-500/40 bg-amber-500/[0.08] hover:bg-amber-500/[0.12]",
  soon: "border-yellow-500/35 bg-yellow-500/[0.06] hover:bg-yellow-500/[0.1]",
  fresh:
    "border-primary/35 bg-primary/[0.06] hover:bg-primary/[0.1]",
};

const TONE_ACCENT: Record<ExpiryTone, string> = {
  empty: "bg-muted-foreground/25",
  past: "bg-red-500",
  urgent: "bg-amber-500",
  soon: "bg-yellow-500",
  fresh: "bg-primary",
};

const TONE_BADGE: Record<Exclude<ExpiryTone, "empty">, string> = {
  past: "bg-red-500/15 text-red-700 dark:text-red-300",
  urgent: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  soon: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200",
  fresh: "bg-primary/15 text-primary",
};

const PRESETS = [
  { id: "30d", label: "+30 days", hint: "1 month", apply: () => addYmdDays(todayYmdLocal(), 30) },
  { id: "90d", label: "+90 days", hint: "Quarter", apply: () => addYmdDays(todayYmdLocal(), 90) },
  { id: "6m", label: "+6 months", hint: "Half year", apply: () => addYmdMonths(todayYmdLocal(), 6) },
  { id: "1y", label: "+1 year", hint: "Annual", apply: () => addYmdMonths(todayYmdLocal(), 12) },
  { id: "2y", label: "+2 years", hint: "Long shelf", apply: () => addYmdMonths(todayYmdLocal(), 24) },
] as const;

const POPOVER_Z = 400;

export type YmdDatePickerProps = {
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

export function YmdDatePicker({
  value,
  onValueChange,
  disabled,
  className,
  compact = false,
  placeholder = "Pick date",
  "aria-label": ariaLabel = "Pick date",
}: YmdDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const tone = expiryTone(value);
  const toneLabel = expiryToneLabel(tone);

  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (open && selected) {
      setViewMonth(selected);
    }
  }, [open, selected]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  function pick(day: Date) {
    onValueChange(toYmd(day));
    setOpen(false);
  }

  function applyPreset(ymd: string) {
    onValueChange(ymd);
    setOpen(false);
  }

  const display = value
    ? compact
      ? formatYmdCompact(value)
      : formatYmd(value)
    : null;

  return (
    <div className={cn("flex min-w-0 items-center gap-0.5", className)}>
      <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "group relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-sm border text-left shadow-none transition-[border-color,background-color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1",
              compact ? "h-7 px-1.5 text-xs" : "h-8 px-2 text-sm",
              TONE_TRIGGER[tone],
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-0.5",
                TONE_ACCENT[tone],
              )}
              aria-hidden
            />
            <span
              className={cn(
                "ml-1 flex shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/80 text-primary",
                compact ? "size-5" : "size-6",
              )}
            >
              <CalendarDays
                className={cn(compact ? "size-3" : "size-3.5")}
                aria-hidden
              />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium tabular-nums">
              {display ?? (
                <span className="font-normal text-muted-foreground">
                  {placeholder}
                </span>
              )}
            </span>
            {toneLabel ? (
              <span
                className={cn(
                  "hidden shrink-0 rounded-sm px-1 py-px text-[9px] font-bold uppercase tracking-wide sm:inline",
                  tone !== "empty" && TONE_BADGE[tone],
                )}
              >
                {toneLabel}
              </span>
            ) : null}
            <ChevronRight
              className={cn(
                "size-3 shrink-0 text-muted-foreground/50 transition-transform group-data-[state=open]:rotate-90",
                compact && "size-2.5",
              )}
              aria-hidden
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal container={typeof document !== "undefined" ? document.body : undefined}>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={16}
          avoidCollisions
          onOpenAutoFocus={(event) => event.preventDefault()}
          style={{ zIndex: POPOVER_Z }}
          className={cn(
            "w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-border bg-popover shadow-xl",
            "opacity-100",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
          )}
        >
          <div className="border-b border-border bg-gradient-to-r from-primary/[0.07] via-background to-background px-3 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Expiry date
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Tap a day or use a quick shelf-life shortcut
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-0 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <div className="border-b border-border bg-muted/20 p-2 sm:border-b-0 sm:border-r">
              <p className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <Clock3 className="size-3" aria-hidden />
                Shortcuts
              </p>
              <div className="flex flex-wrap gap-1 sm:flex-col">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={cn(
                      "rounded-sm border border-border/70 bg-background px-2 py-1 text-left transition-colors",
                      "hover:border-primary/35 hover:bg-primary/[0.06]",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                    onClick={() => applyPreset(preset.apply())}
                  >
                    <span className="block text-[11px] font-semibold text-foreground">
                      {preset.label}
                    </span>
                    <span className="block text-[9px] text-muted-foreground">
                      {preset.hint}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-sm border border-dashed border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive sm:mt-0.5"
                  onClick={() => applyPreset("")}
                >
                  No expiry
                </button>
              </div>
            </div>

            <div className="p-2">
              <div className="mb-2 flex items-center justify-between gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-sm"
                  aria-label="Previous month"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <p className="text-xs font-semibold tabular-nums text-foreground">
                  {format(viewMonth, "MMMM yyyy")}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded-sm"
                  aria-label="Next month"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-muted-foreground/80"
                  >
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const selectedDay = selected != null && isSameDay(day, selected);
                  const today = isToday(day);
                  const dayTone = expiryTone(toYmd(day));

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={!inMonth}
                      aria-label={format(day, "EEEE, d MMMM yyyy")}
                      aria-pressed={selectedDay}
                      onClick={() => pick(day)}
                      className={cn(
                        "relative flex aspect-square items-center justify-center rounded-sm text-[11px] font-medium tabular-nums transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        !inMonth && "pointer-events-none opacity-0",
                        inMonth &&
                          !selectedDay &&
                          "text-foreground hover:bg-primary/10",
                        selectedDay &&
                          "bg-primary text-primary-foreground shadow-sm hover:bg-primary",
                        today && !selectedDay && "ring-1 ring-primary/35",
                        inMonth &&
                          !selectedDay &&
                          dayTone === "past" &&
                          "text-red-600/70 dark:text-red-400/80",
                      )}
                    >
                      {format(day, "d")}
                      {today ? (
                        <span
                          className={cn(
                            "absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                            selectedDay ? "bg-primary-foreground" : "bg-primary",
                          )}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                <button
                  type="button"
                  className="text-[10px] font-medium text-primary hover:underline"
                  onClick={() => pick(new Date())}
                >
                  Today
                </button>
                {value ? (
                  <p className="truncate text-[10px] text-muted-foreground">
                    Selected: {formatYmd(value, "EEE, d MMM yyyy")}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Optional</p>
                )}
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
      {value && !disabled ? (
        <button
          type="button"
          aria-label="Clear date"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground",
            compact ? "size-7" : "size-8",
          )}
          onClick={() => onValueChange("")}
        >
          <X className={compact ? "size-3" : "size-3.5"} />
        </button>
      ) : null}
    </div>
  );
}
