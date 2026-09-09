"use client";

import { PackagePlus, PencilLine, ShoppingBasket, Trash2 } from "lucide-react";

import type { GroceryCounterMode } from "@/lib/grocery-counter-access";
import { cn } from "@/lib/utils";

const MODE_META: Record<
  GroceryCounterMode,
  { label: string; icon: typeof ShoppingBasket; hint: string }
> = {
  sell: {
    label: "Sell",
    icon: ShoppingBasket,
    hint: "Invoice → cashier",
  },
  spoils: {
    label: "Spoils",
    icon: Trash2,
    hint: "Write off stock",
  },
  stockIn: {
    label: "Stock in",
    icon: PackagePlus,
    hint: "Receive delivery",
  },
  stockEdit: {
    label: "Edit stock",
    icon: PencilLine,
    hint: "Set on-hand quantity",
  },
};

type GroceryModeSwitcherProps = {
  mode: GroceryCounterMode;
  modes: GroceryCounterMode[];
  onChange: (mode: GroceryCounterMode) => void;
  className?: string;
};

/** Segmented Sell / Spoils / Stock in control for the grocery counter. */
export function GroceryModeSwitcher({
  mode,
  modes,
  onChange,
  className,
}: GroceryModeSwitcherProps) {
  if (modes.length <= 1) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Counter mode"
      className={cn(
        "inline-flex max-w-full items-stretch divide-x divide-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
        className,
      )}
    >
      {modes.map((id) => {
        const meta = MODE_META[id];
        const Icon = meta.icon;
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            title={meta.hint}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-8 min-w-0 items-center gap-1 rounded-none px-2.5 text-[12px] font-semibold tracking-[-0.02em] transition-colors",
              active
                ? "bg-white text-[var(--pos-primary,#0f766e)]"
                : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]",
            )}
          >
            <Icon className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="truncate">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function groceryModeTitle(mode: GroceryCounterMode): string {
  switch (mode) {
    case "spoils":
      return "Spoils";
    case "stockIn":
      return "Stock in";
    case "stockEdit":
      return "Edit stock";
    default:
      return "Counter";
  }
}
