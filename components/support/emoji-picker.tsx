"use client";

import * as React from "react";
import { Search } from "lucide-react";

import {
  EMOJI,
  QUICK_REACTIONS,
  searchEmoji,
  type EmojiEntry,
} from "@/lib/emoji/emoji-data";
import { getRecentEmoji, pushRecentEmoji } from "@/lib/emoji/recent-emoji";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<EmojiEntry["group"], string> = {
  smileys: "Smileys",
  gestures: "Gestures",
  hearts: "Hearts",
  objects: "Objects & commerce",
  symbols: "Symbols",
};

const GROUP_ORDER: EmojiEntry["group"][] = [
  "smileys",
  "gestures",
  "hearts",
  "objects",
  "symbols",
];

/**
 * Searchable emoji picker shared by the composer (insert into the draft) and the
 * message reaction shelf (react to a message). Vendored dataset — no dependency.
 */
export function EmojiPicker({
  onPick,
  className,
  autoFocus = false,
  compact = false,
}: {
  onPick: (emoji: string) => void;
  className?: string;
  autoFocus?: boolean;
  /** Reaction mode: narrower, no category headers, recents on top. */
  compact?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setRecent(getRecentEmoji());
  }, []);

  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const pick = (emoji: string) => {
    setRecent(pushRecentEmoji(emoji));
    onPick(emoji);
  };

  const results = React.useMemo(() => searchEmoji(query), [query]);
  const searching = query.trim().length > 0;

  const grouped = React.useMemo(() => {
    const byGroup = new Map<EmojiEntry["group"], EmojiEntry[]>();
    for (const entry of EMOJI) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return byGroup;
  }, []);

  return (
    <div
      className={cn(
        "flex w-64 flex-col overflow-hidden rounded-2xl border support-rule support-panel shadow-[0_16px_40px_-24px_rgba(18,26,22,0.45)]",
        className,
      )}
      role="dialog"
      aria-label="Choose an emoji"
    >
      <div className="relative shrink-0 border-b support-rule p-2">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji"
          aria-label="Search emoji"
          className="w-full rounded-lg bg-muted/40 py-1.5 pl-9 pr-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className={cn("overflow-y-auto p-2", compact ? "max-h-56" : "max-h-72")}>
        {searching ? (
          results.length > 0 ? (
            <EmojiGrid emojis={results.map((e) => e.emoji)} onPick={pick} />
          ) : (
            <p className="px-1 py-6 text-center text-[12px] text-muted-foreground">
              No emoji for “{query.trim()}”
            </p>
          )
        ) : (
          <>
            {recent.length > 0 ? (
              <Section label="Recent">
                <EmojiGrid emojis={recent} onPick={pick} />
              </Section>
            ) : (
              <Section label="Frequently used">
                <EmojiGrid emojis={QUICK_REACTIONS} onPick={pick} />
              </Section>
            )}
            {GROUP_ORDER.map((group) => {
              const list = grouped.get(group);
              if (!list || list.length === 0) return null;
              return (
                <Section key={group} label={GROUP_LABELS[group]}>
                  <EmojiGrid emojis={list.map((e) => e.emoji)} onPick={pick} />
                </Section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-1 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function EmojiGrid({
  emojis,
  onPick,
}: {
  emojis: string[];
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-0.5">
      {emojis.map((emoji, i) => (
        <button
          key={`${emoji}-${i}`}
          type="button"
          onClick={() => onPick(emoji)}
          aria-label={emoji}
          className="flex aspect-square items-center justify-center rounded-lg text-[20px] leading-none transition-transform hover:bg-[color-mix(in_srgb,var(--conversation-ink,#121a16)_6%,transparent)] hover:scale-110 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
