"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover } from "radix-ui";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

const POPOVER_Z = 400;

function matchesQuery(option: SearchableSelectOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    (option.hint?.toLowerCase().includes(q) ?? false)
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Type to find…",
  noneLabel,
  required = false,
  disabled = false,
  className,
  name,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  /** Shown as a clearable empty choice. Omit to require a pick. */
  noneLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const rows = options.filter((o) => matchesQuery(o, query));
    if (noneLabel && matchesQuery({ value: "", label: noneLabel }, query)) {
      return [{ value: "", label: noneLabel }, ...rows];
    }
    return rows;
  }, [noneLabel, options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
      return;
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = filtered[highlight];
      if (row) pick(row.value);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const display = selected
    ? selected.hint
      ? `${selected.label} · ${selected.hint}`
      : selected.label
    : noneLabel ?? placeholder;

  return (
    <div className="relative min-w-0">
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          required
          value={value}
          onChange={() => {}}
        />
      ) : null}

      <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-haspopup="listbox"
            className={cn(
              "flex w-full items-center gap-1.5 text-left",
              className,
              !selected && "text-foreground/35",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{display}</span>
            <ChevronDown
              className="size-3.5 shrink-0 text-foreground/40"
              aria-hidden
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            side="bottom"
            sideOffset={4}
            collisionPadding={12}
            onOpenAutoFocus={(event) => event.preventDefault()}
            style={{ zIndex: POPOVER_Z, width: "var(--radix-popover-trigger-width)" }}
            className="overflow-hidden border border-border bg-background shadow-lg"
          >
            <div className="border-b border-border px-2 py-1.5">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                aria-label={ariaLabel ? `${ariaLabel} search` : "Search"}
                className="h-7 w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/35"
              />
            </div>
            <div
              ref={listRef}
              role="listbox"
              className="max-h-52 overflow-y-auto py-0.5"
            >
              {filtered.length === 0 ? (
                <p className="px-2.5 py-2 text-[12px] text-foreground/45">
                  Nothing matches
                </p>
              ) : (
                filtered.map((option, index) => {
                  const active = option.value === value;
                  const hi = index === highlight;
                  return (
                    <button
                      key={option.value || "__none"}
                      type="button"
                      role="option"
                      data-index={index}
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pick(option.value)}
                      className={cn(
                        "flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left text-[13px]",
                        hi ? "bg-muted/60" : "bg-transparent",
                        active ? "text-foreground" : "text-foreground/80",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.hint ? (
                        <span className="shrink-0 text-[11px] text-foreground/40">
                          {option.hint}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
