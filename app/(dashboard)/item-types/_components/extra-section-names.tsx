"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";

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
      <p className="text-xs font-medium text-muted-foreground">Other departments (optional)</p>
      <ul className="space-y-2">
        {names.map((name, index) => {
          const isLast = index === names.length - 1;
          return (
            <li key={index} className="flex items-center gap-2">
              <input
                className={cn(dashboardInputClass(), "min-w-0 flex-1")}
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
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
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
                  className="size-9 shrink-0"
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
