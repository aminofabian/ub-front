"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Minus,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CATEGORY_STARTER_KITS,
  SUGGESTED_CATALOG_CATEGORIES,
  SUGGESTED_DEPARTMENT_EMOJI,
  keysForSuggestedGroups,
  suggestionSubKey,
  suggestionTopKey,
} from "@/lib/category-suggestions";
import { ONBOARDING_EMPHASIS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickKeys: string[];
  onTogglePickKey: (key: string) => void;
  onSetPickKeys: (keys: string[]) => void;
  onClearPicks: () => void;
  onAddPicksToQueue: () => void;
  catalogNameLowerSet: Set<string>;
  onboardingHighlight?: boolean;
};

function departmentKeys(parent: string, children: readonly string[]): string[] {
  return [suggestionTopKey(parent), ...children.map((c) => suggestionSubKey(parent, c))];
}

function selectionSummary(
  keys: string[],
  pickKeys: string[],
): { selected: number; total: number; all: boolean; some: boolean } {
  const selected = keys.filter((k) => pickKeys.includes(k)).length;
  return {
    selected,
    total: keys.length,
    all: selected === keys.length && keys.length > 0,
    some: selected > 0 && selected < keys.length,
  };
}

export function CategoryBulkSuggestions({
  open,
  onOpenChange,
  pickKeys,
  onTogglePickKey,
  onSetPickKeys,
  onClearPicks,
  onAddPicksToQueue,
  catalogNameLowerSet,
  onboardingHighlight = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const departments = useMemo(
    () => Object.entries(SUGGESTED_CATALOG_CATEGORIES),
    [],
  );

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return departments;
    }
    return departments.filter(([parent, children]) => {
      if (parent.toLowerCase().includes(q)) {
        return true;
      }
      return children.some((c) => c.toLowerCase().includes(q));
    });
  }, [departments, query]);

  const pickCount = pickKeys.length;

  const applyKit = (groupNames: readonly string[]) => {
    const keys = keysForSuggestedGroups(groupNames);
    onSetPickKeys([...new Set([...pickKeys, ...keys])]);
    const nextExpanded: Record<string, boolean> = { ...expanded };
    for (const name of groupNames) {
      nextExpanded[name] = true;
    }
    setExpanded(nextExpanded);
  };

  const toggleDepartment = (parent: string, children: readonly string[]) => {
    const keys = departmentKeys(parent, children);
    const { all } = selectionSummary(keys, pickKeys);
    if (all) {
      onSetPickKeys(pickKeys.filter((k) => !keys.includes(k)));
    } else {
      onSetPickKeys([...new Set([...pickKeys, ...keys])]);
    }
  };

  const toggleExpanded = (parent: string) => {
    setExpanded((prev) => ({ ...prev, [parent]: !prev[parent] }));
  };

  const isExpanded = (parent: string) => {
    if (query.trim()) {
      return true;
    }
    return expanded[parent] ?? false;
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-fit gap-2 shadow-sm"
        onClick={() => onOpenChange(true)}
      >
        <Sparkles className="size-4 text-primary" aria-hidden />
        Quick pick categories
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-b from-primary/[0.06] to-muted/20 shadow-sm",
        onboardingHighlight &&
          "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
      )}
      data-onboarding-emphasis={ONBOARDING_EMPHASIS.categoriesSuggestions}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-background/80 px-3 py-3 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
            Quick pick categories
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Tap a starter kit, then fine-tune. Selected items count when you hit
            Create.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1 px-2 text-xs"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-3.5" aria-hidden />
          Hide
        </Button>
      </div>

      <div className="space-y-3 px-3 pt-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_STARTER_KITS.map((kit) => (
            <button
              key={kit.id}
              type="button"
              onClick={() => applyKit(kit.groups)}
              className={cn(
                "flex min-w-[7.5rem] flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
                "border-border/80 bg-background hover:border-primary/40 hover:bg-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {kit.emoji}
              </span>
              <span className="mt-1 text-xs font-semibold text-foreground">
                {kit.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{kit.hint}</span>
            </button>
          ))}
        </div>

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments or items…"
            className="h-9 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm"
            aria-label="Search suggested categories"
          />
        </label>
      </div>

      <div className="mt-3 max-h-[min(22rem,45vh)] space-y-2 overflow-y-auto px-3 pb-2">
        {filteredDepartments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No matches. Try another search or pick a starter kit above.
          </p>
        ) : (
          filteredDepartments.map(([parent, children]) => {
            const keys = departmentKeys(parent, children);
            const { selected, total, all, some } = selectionSummary(
              keys,
              pickKeys,
            );
            const parentInCatalog = catalogNameLowerSet.has(
              parent.trim().toLowerCase(),
            );
            const expandedRow = isExpanded(parent);
            const emoji = SUGGESTED_DEPARTMENT_EMOJI[parent] ?? "📦";

            return (
              <div
                key={parent}
                className={cn(
                  "overflow-hidden rounded-lg border bg-background shadow-sm transition-colors",
                  all
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : some
                      ? "border-primary/30"
                      : "border-border/80",
                )}
              >
                <div className="flex items-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={() => toggleDepartment(parent, children)}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md border text-sm transition-colors",
                      all
                        ? "border-primary bg-primary text-primary-foreground"
                        : some
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
                    )}
                    aria-label={
                      all
                        ? `Deselect all in ${parent}`
                        : `Select all in ${parent}`
                    }
                  >
                    {all ? (
                      <Check className="size-4" aria-hidden />
                    ) : some ? (
                      <Minus className="size-4" aria-hidden />
                    ) : (
                      <span className="text-base leading-none">{emoji}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => toggleExpanded(parent)}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {parent}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {selected}/{total} selected
                      {parentInCatalog ? " · already in catalog" : ""}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => toggleExpanded(parent)}
                    aria-expanded={expandedRow}
                    aria-label={expandedRow ? "Collapse" : "Expand"}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        expandedRow && "rotate-180",
                      )}
                    />
                  </Button>
                </div>

                {expandedRow ? (
                  <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-muted/15 px-2 py-2">
                    {children
                      .filter((child) => {
                        const q = query.trim().toLowerCase();
                        if (!q) {
                          return true;
                        }
                        return (
                          child.toLowerCase().includes(q) ||
                          parent.toLowerCase().includes(q)
                        );
                      })
                      .map((child) => {
                        const subKey = suggestionSubKey(parent, child);
                        const checked = pickKeys.includes(subKey);
                        const inCatalog = catalogNameLowerSet.has(
                          child.trim().toLowerCase(),
                        );
                        return (
                          <button
                            key={child}
                            type="button"
                            onClick={() => onTogglePickKey(subKey)}
                            className={cn(
                              "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-left text-xs transition-colors",
                              checked
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border/80 bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
                              inCatalog && !checked && "opacity-60",
                            )}
                          >
                            {checked ? (
                              <Check className="size-3 shrink-0" aria-hidden />
                            ) : null}
                            <span className="truncate">{child}</span>
                          </button>
                        );
                      })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-background/95 px-3 py-2.5 backdrop-blur-sm">
        <p className="text-xs font-medium text-foreground">
          {pickCount === 0 ? (
            <span className="text-muted-foreground">Nothing selected yet</span>
          ) : (
            <>
              <span className="tabular-nums text-primary">{pickCount}</span>{" "}
              {pickCount === 1 ? "category" : "categories"} ready
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pickCount === 0}
            onClick={onClearPicks}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={pickCount === 0}
            onClick={onAddPicksToQueue}
          >
            Pin to list
          </Button>
        </div>
      </div>
    </div>
  );
}
