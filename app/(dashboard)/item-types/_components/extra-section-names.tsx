"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { supInput } from "../../suppliers/_components/supplier-ui-tokens";

type Props = {
  names: string[];
  onChange: (names: string[]) => void;
};

export function ExtraSectionNames({ names, onChange }: Props) {
  const update = (index: number, value: string) => {
    onChange(names.map((n, i) => (i === index ? value : n)));
  };

  const addRow = () => {
    onChange([...names, ""]);
  };

  const removeRow = (index: number) => {
    if (names.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(names.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-[-0.02em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
        Other departments (optional)
      </p>
      <ul className="space-y-1">
        {names.map((name, index) => {
          const isLast = index === names.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              <input
                className={cn(supInput, "min-w-0 flex-1")}
                value={name}
                onChange={(e) => update(index, e.target.value)}
                placeholder="e.g. Retail shop"
                aria-label={`Department name ${index + 1}`}
              />
              {!isLast ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)] hover:text-destructive"
                  onClick={() => removeRow(index)}
                  aria-label={`Remove department name ${index + 1}`}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              ) : null}
              {isLast ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0 rounded-none"
                  onClick={addRow}
                  aria-label="Add another department name"
                >
                  <Plus className="size-4" aria-hidden />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
