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
          "rounded-none ring-2 ring-[var(--pos-primary,#0f766e)] ring-offset-2 ring-offset-white",
      )}
      data-onboarding-emphasis={ONBOARDING_EMPHASIS.itemTypesSuggestions}
    >
      <div className="flex flex-wrap gap-1">
        {STORE_SECTION_STARTER_KITS.map((kit) => (
          <button
            key={kit.id}
            type="button"
            onClick={() => addKit(kit.sections)}
            className="h-8 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 text-[12px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]"
          >
            + {kit.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
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
                "h-8 rounded-none border bg-white px-2.5 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
                on
                  ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                  : exists
                    ? "cursor-not-allowed border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] opacity-50"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
              )}
            >
              {name}
              {exists ? (
                <span className="ml-1 text-[11px] font-medium opacity-80">
                  · Added
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
