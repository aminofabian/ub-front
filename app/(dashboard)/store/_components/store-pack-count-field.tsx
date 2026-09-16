"use client";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import { formatSupplyQty, type SupplyPackMode } from "@/lib/supply-pack-math";

import {
  countSaveHint,
  defaultPackMode,
  isPacked,
  packSizeChoices,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { parseStoreCount } from "../_lib/store-item-count";

/**
 * Count in pieces, or in packs. One number, one sentence for what Save does.
 */
export function StorePackCountField({
  value,
  onChange,
  packMode,
  onPackModeChange,
  catalog,
  followsInventory,
  disabled = false,
  intent = "set",
}: {
  value: string;
  onChange: (value: string) => void;
  packMode: SupplyPackMode | null;
  onPackModeChange: (next: SupplyPackMode | null) => void;
  catalog: StorePackCatalog | null;
  followsInventory: boolean;
  disabled?: boolean;
  intent?: "set" | "move";
}) {
  const packed = isPacked(packMode);
  const parsed = parseStoreCount(value, !followsInventory && !packed);
  const hint = followsInventory
    ? countSaveHint(parsed, packMode, intent)
    : null;
  const sizes = packSizeChoices(catalog);
  const sizeValue = packed && packMode ? packMode.unitsPerPack : 0;

  const setPieces = () => {
    if (!packed) return;
    onPackModeChange(null);
  };

  const setPacks = () => {
    if (packed) return;
    onPackModeChange(defaultPackMode(catalog));
  };

  const setSize = (units: number) => {
    if (!(units > 1)) return;
    const unit =
      sizes.find((choice) => choice.units === units)?.label ||
      packMode?.packUnit ||
      catalog?.catalogPackUnit ||
      "pack";
    onPackModeChange({ unitsPerPack: units, packUnit: unit });
  };

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Count
      </span>

      {followsInventory ? (
        <div className="grid grid-cols-2 gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]">
          <button
            type="button"
            disabled={disabled}
            onClick={setPieces}
            className={cn(
              "h-8 text-[12px] font-semibold",
              packed
                ? "bg-white text-muted-foreground hover:text-foreground"
                : "bg-[var(--pos-primary,#0f766e)] text-white",
            )}
          >
            Pieces
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={setPacks}
            className={cn(
              "h-8 text-[12px] font-semibold",
              packed
                ? "bg-[var(--pos-primary,#0f766e)] text-white"
                : "bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            Packs
          </button>
        </div>
      ) : null}

      {followsInventory && packed ? (
        <label className="block space-y-1">
          <span className="text-[11px] text-muted-foreground">
            Pieces in one pack
          </span>
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            type="number"
            min={2}
            step={1}
            inputMode="numeric"
            value={sizeValue || ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 1) setSize(n);
            }}
            disabled={disabled}
          />
          {sizes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {sizes.map((choice) => (
                <button
                  key={choice.units}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSize(choice.units)}
                  className={cn(
                    "h-7 px-2 text-[11px] font-semibold tabular-nums",
                    choice.units === sizeValue
                      ? "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,white)] text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
                  )}
                >
                  {formatSupplyQty(choice.units)}
                </button>
              ))}
            </div>
          ) : null}
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-[11px] text-muted-foreground">
          {packed ? "How many packs" : "How many pieces"}
        </span>
        <input
          className={cn(dashboardInputClass(), "h-8 text-[13px]")}
          type="number"
          min={0}
          step={followsInventory || packed ? "any" : 1}
          inputMode={followsInventory || packed ? "decimal" : "numeric"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
        />
      </label>

      {hint ? (
        <p className={cn(dashboardHintClass(), "leading-snug")}>{hint}</p>
      ) : null}
    </div>
  );
}
