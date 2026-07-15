"use client";

import { useMemo } from "react";

import type { ItemSummaryRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  CATALOG_LETTER_KEYS,
  catalogLettersPresent,
  type CatalogLetterKey,
} from "./catalog-letter-index";

type Props = {
  rows: readonly ItemSummaryRecord[];
  /** True when the catalog has finished loading every page. */
  listComplete: boolean;
  busy?: boolean;
  activeLetter?: CatalogLetterKey | null;
  onJump: (letter: CatalogLetterKey) => void;
  className?: string;
};

/**
 * Slim A–Z scrubber (Contacts-style) for the catalog list.
 * Non-intrusive: sits on the trailing edge, tiny type, no card chrome.
 */
export function CatalogLetterJumpRail({
  rows,
  listComplete,
  busy = false,
  activeLetter = null,
  onJump,
  className,
}: Props) {
  const present = useMemo(() => catalogLettersPresent(rows), [rows]);

  return (
    <nav
      aria-label="Jump to letter"
      className={cn(
        "pointer-events-none absolute inset-y-2 right-0 z-20 flex w-5 flex-col items-center justify-center",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex max-h-full flex-col items-center gap-px overflow-y-auto overscroll-contain py-1",
          // Solid fill — stays readable on legacy Chromium without color-mix/blur.
          "rounded-l-md border border-r-0 border-border bg-background shadow-sm",
          busy && "opacity-80",
        )}
      >
        {CATALOG_LETTER_KEYS.map((letter) => {
          const hasMatch = present.has(letter);
          // Once the full list is loaded, dim letters with zero hits.
          const exhaustedMiss = listComplete && !hasMatch;
          const isActive = activeLetter === letter;

          return (
            <button
              key={letter}
              type="button"
              disabled={busy || exhaustedMiss}
              title={
                exhaustedMiss
                  ? `No products under ${letter}`
                  : `Jump to ${letter}`
              }
              aria-label={
                exhaustedMiss
                  ? `No products under ${letter}`
                  : `Jump to products starting with ${letter}`
              }
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex h-[1.05rem] w-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-semibold leading-none tracking-tight transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                exhaustedMiss && "cursor-default text-muted-foreground/30",
                !exhaustedMiss &&
                  hasMatch &&
                  "text-foreground/80 hover:bg-muted hover:text-foreground",
                !exhaustedMiss &&
                  !hasMatch &&
                  "text-muted-foreground/55 hover:bg-muted/70 hover:text-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary",
              )}
              onClick={() => {
                if (!busy && !exhaustedMiss) onJump(letter);
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
