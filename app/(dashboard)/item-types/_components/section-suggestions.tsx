"use client";

import {
  labelToItemTypeKey,
  STORE_SECTION_STARTER_KITS,
  SUGGESTED_STORE_SECTIONS,
} from "@/lib/item-type-suggestions";
import { ONBOARDING_EMPHASIS } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

type Props = {
  existingKeySet: Set<string>;
  existingLabelSet: Set<string>;
  pickedLabels: string[];
  onTogglePick: (label: string) => void;
  onSetPicks: (labels: string[]) => void;
  onboardingHighlight?: boolean;
};

function taken(
  label: string,
  existingKeySet: Set<string>,
  existingLabelSet: Set<string>,
): boolean {
  const lower = label.trim().toLowerCase();
  const key = labelToItemTypeKey(label);
  return (
    existingLabelSet.has(lower) || (key.length > 0 && existingKeySet.has(key))
  );
}

export function SectionSuggestions({
  existingKeySet,
  existingLabelSet,
  pickedLabels,
  onTogglePick,
  onSetPicks,
  onboardingHighlight = false,
}: Props) {
  const picked = new Set(pickedLabels.map((l) => l.trim().toLowerCase()));

  const addKit = (sections: readonly string[]) => {
    const next = new Set(picked);
    const merged = [...pickedLabels];
    for (const name of sections) {
      if (taken(name, existingKeySet, existingLabelSet)) continue;
      const k = name.trim().toLowerCase();
      if (next.has(k)) continue;
      next.add(k);
      merged.push(name);
    }
    onSetPicks(merged);
  };

  return (
    <div
      className={cn(
        "space-y-3",
        onboardingHighlight &&
          "rounded-xl ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
      )}
      data-onboarding-emphasis={ONBOARDING_EMPHASIS.itemTypesSuggestions}
    >
      <div className="flex flex-wrap gap-2">
        {STORE_SECTION_STARTER_KITS.map((kit) => (
          <button
            key={kit.id}
            type="button"
            onClick={() => addKit(kit.sections)}
            className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
          >
            + {kit.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_STORE_SECTIONS.map((name) => {
          const exists = taken(name, existingKeySet, existingLabelSet);
          const on = picked.has(name.trim().toLowerCase());
          return (
            <button
              key={name}
              type="button"
              disabled={exists}
              onClick={() => onTogglePick(name)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : exists
                    ? "cursor-not-allowed border-border/50 text-muted-foreground opacity-50"
                    : "border-border bg-background hover:border-primary/40",
              )}
            >
              {name}
              {exists ? (
                <span className="ml-1 text-[10px] font-normal opacity-80">· Added</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
