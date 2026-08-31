"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { Popover } from "radix-ui";

import { cn } from "@/lib/utils";
import {
  shouldOfferCreate,
  type SearchableSelectOption,
} from "./searchable-select-create";

export type { SearchableSelectOption } from "./searchable-select-create";
export { shouldOfferCreate } from "./searchable-select-create";

export type SearchableSelectHandle = {
  openForCreate: () => void;
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

type ListItem =
  | { kind: "option"; option: SearchableSelectOption }
  | { kind: "create"; name: string };

export const SearchableSelect = forwardRef<
  SearchableSelectHandle,
  {
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
    /** When set, typing a new name (or the footer action) can create it. */
    onCreate?: (name: string) => void | Promise<void>;
    createBusy?: boolean;
    createError?: string;
    createNoun?: string;
  }
>(function SearchableSelect(
  {
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
    onCreate,
    createBusy = false,
    createError,
    createNoun = "category",
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [awaitingName, setAwaitingName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const canCreate = Boolean(onCreate);
  const offerCreate = canCreate && shouldOfferCreate(query, options);
  const searchPlaceholder = canCreate
    ? awaitingName
      ? `Name the ${createNoun}`
      : "Find or create…"
    : placeholder;

  const filtered = useMemo(() => {
    const rows = options.filter((o) => matchesQuery(o, query));
    if (noneLabel && matchesQuery({ value: "", label: noneLabel }, query)) {
      return [{ value: "", label: noneLabel }, ...rows];
    }
    return rows;
  }, [noneLabel, options, query]);

  const items: ListItem[] = useMemo(() => {
    const rows: ListItem[] = filtered.map((option) => ({
      kind: "option",
      option,
    }));
    if (offerCreate) {
      rows.push({ kind: "create", name: query.trim() });
    }
    return rows;
  }, [filtered, offerCreate, query]);

  useImperativeHandle(
    ref,
    () => ({
      openForCreate() {
        if (disabled || !onCreate) return;
        setOpen(true);
        setAwaitingName(true);
        setQuery("");
      },
    }),
    [disabled, onCreate],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
      setAwaitingName(false);
      return;
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function pick(next: string) {
    if (createBusy) return;
    onChange(next);
    setOpen(false);
  }

  async function commitCreate(nameToCreate: string) {
    if (!onCreate || createBusy) return;
    const trimmed = nameToCreate.trim();
    if (!trimmed) {
      setAwaitingName(true);
      inputRef.current?.focus();
      return;
    }
    const existing = options.find(
      (o) => o.label.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      pick(existing.value);
      return;
    }
    try {
      await onCreate(trimmed);
      setOpen(false);
      setQuery("");
      setAwaitingName(false);
    } catch {
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = items[highlight];
      if (row?.kind === "create") {
        void commitCreate(row.name);
        return;
      }
      if (row?.kind === "option") {
        pick(row.option.value);
        return;
      }
      if (offerCreate) {
        void commitCreate(query);
      }
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

  const emptyCopy = canCreate
    ? awaitingName || !query.trim()
      ? `Type a name to add a ${createNoun}`
      : `No ${createNoun} matches`
    : "Nothing matches";

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
            style={{
              zIndex: POPOVER_Z,
              width: "var(--radix-popover-trigger-width)",
            }}
            className="overflow-hidden rounded-lg border border-border bg-background shadow-lg"
          >
            <div className="border-b border-border px-2 py-1.5">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                disabled={createBusy}
                aria-label={ariaLabel ? `${ariaLabel} search` : "Search"}
                className="h-7 w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/35 disabled:opacity-60"
              />
            </div>
            <div
              ref={listRef}
              role="listbox"
              aria-busy={createBusy}
              className="max-h-52 overflow-y-auto py-0.5"
            >
              {items.length === 0 ? (
                <p className="px-2.5 py-2 text-[12px] text-foreground/45">
                  {emptyCopy}
                </p>
              ) : (
                items.map((item, index) => {
                  if (item.kind === "create") {
                    const hi = index === highlight;
                    return (
                      <button
                        key="__create"
                        type="button"
                        role="option"
                        data-index={index}
                        aria-selected={false}
                        disabled={createBusy}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => void commitCreate(item.name)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] font-medium",
                          hi ? "bg-muted/60" : "bg-transparent",
                          "text-foreground",
                        )}
                      >
                        {createBusy ? (
                          <Loader2
                            className="size-3.5 shrink-0 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Plus className="size-3.5 shrink-0" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          Create "{item.name}"
                        </span>
                      </button>
                    );
                  }

                  const option = item.option;
                  const active = option.value === value;
                  const hi = index === highlight;
                  return (
                    <button
                      key={option.value || "__none"}
                      type="button"
                      role="option"
                      data-index={index}
                      aria-selected={active}
                      disabled={createBusy}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pick(option.value)}
                      className={cn(
                        "flex w-full items-baseline gap-2 px-2.5 py-1.5 text-left text-[13px]",
                        hi ? "bg-muted/60" : "bg-transparent",
                        active ? "text-foreground" : "text-foreground/80",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
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
            {canCreate ? (
              <div className="border-t border-border">
                {createError ? (
                  <p className="px-2.5 pt-1.5 text-[12px] text-destructive">
                    {createError}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={createBusy}
                  onClick={() => void commitCreate(query)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-2 text-left text-[13px] font-medium text-foreground",
                    "hover:bg-muted/60 disabled:opacity-60",
                  )}
                >
                  {createBusy ? (
                    <Loader2
                      className="size-3.5 shrink-0 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                  )}
                  New {createNoun}
                </button>
              </div>
            ) : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
});

SearchableSelect.displayName = "SearchableSelect";
