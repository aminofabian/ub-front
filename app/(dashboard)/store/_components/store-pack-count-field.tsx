"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { WholesalePackStamp } from "@/components/pack/wholesale-pack-stamp";
import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";
import { formatSupplyQty, type SupplyPackMode } from "@/lib/supply-pack-math";
import { SupplyPackQtyModal } from "@/app/(dashboard)/supplies/_components/supply-pack-qty-modal";

import {
  isPacked,
  packBreakdownLabel,
  packCountPreview,
  packOffersFromOptions,
  splitPacksAndSingles,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { parseStoreCount } from "../_lib/store-item-count";

export function StorePackCountField({
  value,
  onChange,
  packMode,
  onPackModeChange,
  catalog,
  followsInventory,
  onHandEach = null,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  packMode: SupplyPackMode | null;
  onPackModeChange: (next: SupplyPackMode | null) => void;
  catalog: StorePackCatalog | null;
  followsInventory: boolean;
  /** Absolute each on hand — used so 56 @ 30 shows remainder singles. */
  onHandEach?: number | null;
  disabled?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const packed = isPacked(packMode);
  const parsed = parseStoreCount(value, !followsInventory && !packed);
  const typedPreview = packCountPreview(parsed, packMode);
  const stockBreakdown =
    packed && packMode && onHandEach != null && onHandEach >= 0
      ? packBreakdownLabel(onHandEach, packMode)
      : null;
  const floorPacks =
    packed && packMode && onHandEach != null
      ? splitPacksAndSingles(onHandEach, packMode.unitsPerPack).packs
      : null;
  const typedMatchesStock =
    floorPacks != null &&
    parsed != null &&
    Math.abs(parsed - floorPacks) < 0.0001;
  const preview =
    stockBreakdown && (typedMatchesStock || parsed == null)
      ? `${stockBreakdown} · ${formatSupplyQty(onHandEach!)} each`
      : typedPreview;
  const offers = catalog ? packOffersFromOptions(catalog.options) : [];
  const stampPackCount =
    stockBreakdown && typedMatchesStock && floorPacks != null && floorPacks > 0
      ? floorPacks
      : parsed != null && parsed > 0
        ? parsed
        : 1;

  const togglePack = () => {
    if (packed) {
      onPackModeChange(null);
      return;
    }
    if (catalog && catalog.displayToHolderFactor > 1) {
      onPackModeChange({
        unitsPerPack: catalog.displayToHolderFactor,
        packUnit: catalog.catalogPackUnit,
      });
      return;
    }
    if (catalog?.options[0]) {
      const option = catalog.options[0];
      onPackModeChange({
        unitsPerPack: option.unitsPerPack,
        packUnit: option.packUnit,
      });
      return;
    }
    setSheetOpen(true);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {packed ? "Packs" : "Number"}
        </span>
        {followsInventory ? (
          <button
            type="button"
            className={cn(
              "inline-flex h-6 items-center gap-1 px-1.5 text-[10px] font-bold uppercase tracking-[0.05em]",
              packed
                ? "bg-amber-200/90 text-amber-950"
                : "text-muted-foreground hover:bg-amber-100 hover:text-amber-950",
            )}
            disabled={disabled}
            onClick={togglePack}
          >
            <Package className="size-3" aria-hidden />
            {packed ? "Packs" : "Pack"}
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "flex items-stretch gap-1",
          packed && "bg-amber-50/90 ring-1 ring-amber-800/25",
        )}
      >
        {packed && packMode ? (
          <WholesalePackStamp
            units={packMode.unitsPerPack}
            packCount={stampPackCount}
            packUnit={packMode.packUnit}
            className="shrink-0 px-1 py-1"
          />
        ) : null}
        <input
          className={cn(
            dashboardInputClass(),
            "h-8 min-w-0 flex-1 text-[13px]",
            packed && "border-0 bg-transparent shadow-none",
          )}
          type="number"
          min={0}
          step={followsInventory || packed ? "any" : 1}
          inputMode={followsInventory || packed ? "decimal" : "numeric"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
        />
        {packed && packMode ? (
          <button
            type="button"
            className="shrink-0 px-2 font-mono text-[11px] font-black tabular-nums text-amber-950"
            disabled={disabled}
            onClick={() => setSheetOpen(true)}
            aria-label={`Pack of ${packMode.unitsPerPack}, click to change size`}
          >
            ×{formatSupplyQty(packMode.unitsPerPack)}
          </button>
        ) : null}
      </div>
      {preview ? (
        <span className={cn(dashboardHintClass(), "block")}>{preview}</span>
      ) : followsInventory ? (
        <span className={cn(dashboardHintClass(), "block")}>
          Saving number updates inventory on-hand.
        </span>
      ) : null}

      {followsInventory ? (
        <SupplyPackQtyModal
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          defaults={{
            packUnit: packMode?.packUnit || catalog?.catalogPackUnit || "pack",
            packSize:
              packMode?.unitsPerPack || catalog?.displayToHolderFactor || 12,
            productLabel: null,
          }}
          initialUnitsPerPack={packMode?.unitsPerPack ?? null}
          savedOptions={offers}
          onApply={(result) => {
            onPackModeChange({
              unitsPerPack: result.unitsPerPack,
              packUnit: result.packUnit,
            });
          }}
        />
      ) : null}
    </div>
  );
}
