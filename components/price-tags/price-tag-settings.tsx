"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  TAG_CHIP,
  TAG_CHIP_IDLE,
  TAG_CHIP_ON,
  TAG_HAIRLINE,
  TAG_LABEL,
  TAG_NOTE,
  TAG_PANEL,
  TAG_STRIP,
} from "@/components/price-tags/price-tag-chrome";
import { FIELD_CLASS, NumberField } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_GHOST, CATALOG_BTN_OUTLINE } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { tagHeightForRows, tagWidthForColumns } from "@/lib/price-tags/layout";
import { printAlignmentTest } from "@/lib/price-tags/print";
import { CALIBRATION_LIMIT_MM } from "@/lib/price-tags/storage";
import { ALL_TAG_FIELDS, LABEL_PRESETS, applyPreset, fieldLabel } from "@/lib/price-tags/templates";
import type {
  LabelPresetId,
  PrinterCalibration,
  SavedTagLayout,
  SheetGeometry,
  TagBorder,
  TagField,
  TagLayout,
} from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const PRESETS = Object.keys(LABEL_PRESETS) as Exclude<LabelPresetId, "custom">[];
const BORDERS: { value: TagBorder; label: string }[] = [
  { value: "none", label: "None" },
  { value: "hairline", label: "Hairline" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "ticket", label: "Ticket" },
];

function toggleField(fields: TagField[], field: TagField): TagField[] {
  return fields.includes(field) ? fields.filter((item) => item !== field) : fields.concat(field);
}

export function PriceTagSettings({
  layout,
  geometry,
  calibration,
  saved,
  onLayout,
  onCalibration,
  onSaved,
  onPrintAlignment,
}: {
  layout: TagLayout;
  geometry: SheetGeometry;
  calibration: PrinterCalibration;
  saved: SavedTagLayout[];
  onLayout: (update: (current: TagLayout) => TagLayout) => void;
  onCalibration: (next: PrinterCalibration) => void;
  onSaved: (update: (current: SavedTagLayout[]) => SavedTagLayout[]) => void;
  /** Set when tags go straight to a label printer; the test page goes there too. */
  onPrintAlignment?: () => void;
}) {
  const roll = layout.media === "label-roll";
  const [saveName, setSaveName] = useState("");
  const [savedId, setSavedId] = useState("");

  /** Any manual size change leaves the named preset. */
  const patch = (partial: Partial<TagLayout>, customPreset = false) =>
    onLayout((current) => ({
      ...current,
      ...partial,
      presetId: customPreset ? "custom" : partial.presetId ?? current.presetId,
      sheetCount: customPreset ? null : partial.sheetCount !== undefined ? partial.sheetCount : current.sheetCount,
    }));

  const mm = (label: string, key: keyof TagLayout, min: number, max: number) => (
    <NumberField
      label={label}
      value={layout[key] as number}
      min={min}
      max={max}
      step={0.5}
      onChange={(value) => patch({ [key]: value } as Partial<TagLayout>, true)}
    />
  );

  return (
    <details className={cn(TAG_PANEL, "group")}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[13px] text-[var(--catalog-ink,#121A16)] pointer-coarse:py-3 [&::-webkit-details-marker]:hidden">
        <span>{roll ? "Printer alignment and what each tag shows" : "Sheet size, spacing, printer alignment, and what each tag shows"}</span>
        <span className="text-[12px] text-[#556159] group-open:hidden">Show</span>
        <span className="hidden text-[12px] text-[#556159] group-open:inline">Hide</span>
      </summary>
      <div className={cn("grid gap-5 border-t px-3 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", TAG_HAIRLINE)}>
        <div className="flex flex-col gap-2">
          {/* A4 sizing only: on a roll the label size is the tag size. */}
          {roll ? null : (
          <div className={TAG_STRIP} role="group" aria-label="Sheet layout">
            {PRESETS.map((presetId) => (
              <button
                key={presetId}
                type="button"
                title={LABEL_PRESETS[presetId].detail}
                aria-pressed={layout.presetId === presetId}
                className={cn(TAG_CHIP, layout.presetId === presetId ? TAG_CHIP_ON : TAG_CHIP_IDLE)}
                onClick={() => onLayout((current) => applyPreset(current, presetId))}
              >
                {LABEL_PRESETS[presetId].label}
              </button>
            ))}
            {layout.presetId === "custom" ? <span className={cn(TAG_CHIP, TAG_CHIP_ON, "pointer-events-none")}>Custom</span> : null}
          </div>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            {roll ? null : (
              <>
            <NumberField
              label="Columns"
              value={geometry.columns}
              min={1}
              max={12}
              onChange={(columns) => patch({ tagWidthMm: tagWidthForColumns(layout, columns) }, true)}
            />
            <NumberField
              label="Rows"
              value={geometry.rows}
              min={1}
              max={16}
              onChange={(rows) => patch({ tagHeightMm: tagHeightForRows(layout, rows) }, true)}
            />
            {mm("Width mm", "tagWidthMm", 18, 190)}
            {mm("Height mm", "tagHeightMm", 12, 270)}
            {mm("Gap across", "gapXMm", 0, 20)}
            {mm("Gap down", "gapYMm", 0, 20)}
            {mm("Top mm", "marginTopMm", 0, 30)}
            {mm("Right mm", "marginRightMm", 0, 30)}
            {mm("Bottom mm", "marginBottomMm", 0, 30)}
            {mm("Left mm", "marginLeftMm", 0, 30)}
              </>
            )}
            <label className={cn("flex flex-col gap-1.5", TAG_LABEL)}>
              Tag
              <select
                value={layout.orientation}
                className={FIELD_CLASS}
                onChange={(event) =>
                  patch({ orientation: event.target.value === "vertical" ? "vertical" : "horizontal" })
                }
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </label>
            <label className={cn("flex flex-col gap-1.5", TAG_LABEL)}>
              Border
              <select
                value={layout.border}
                className={FIELD_CLASS}
                onChange={(event) =>
                  patch({
                    border: BORDERS.find((row) => row.value === event.target.value)?.value ?? "hairline",
                  })
                }
              >
                {BORDERS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={cn("flex flex-col gap-1.5", TAG_LABEL)}>
              Alignment
              <select
                value={layout.align}
                className={FIELD_CLASS}
                onChange={(event) => patch({ align: event.target.value === "center" ? "center" : "left" })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </label>
          </div>
          <fieldset className="mt-2 flex flex-col gap-2">
            <legend className={cn("mb-1.5", TAG_LABEL)}>Printer alignment</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
              <NumberField
                label="Move right mm"
                value={calibration.offsetXMm}
                min={-CALIBRATION_LIMIT_MM}
                max={CALIBRATION_LIMIT_MM}
                step={0.5}
                onChange={(offsetXMm) => onCalibration({ ...calibration, offsetXMm })}
              />
              <NumberField
                label="Move down mm"
                value={calibration.offsetYMm}
                min={-CALIBRATION_LIMIT_MM}
                max={CALIBRATION_LIMIT_MM}
                step={0.5}
                onChange={(offsetYMm) => onCalibration({ ...calibration, offsetYMm })}
              />
            </div>
            <p className={cn(TAG_NOTE, "max-w-prose")}>
              Print the alignment test{roll ? " on the label roll" : " on plain paper and hold it against a label sheet"}.
              Each outline should sit on a label&apos;s edge, with its cross in the middle. If not, move the tags here;
              negative numbers move left or up. This applies to this device only.
            </p>
            <button
              type="button"
              className={cn(CATALOG_BTN_OUTLINE, "self-start pointer-coarse:h-10")}
              onClick={() => {
                if (onPrintAlignment) {
                  onPrintAlignment();
                  return;
                }
                if (!printAlignmentTest(geometry, calibration)) toast.error("Could not open the print dialog");
              }}
            >
              Print alignment test
            </button>
          </fieldset>
        </div>
        <div className="flex flex-col gap-2">
          <fieldset className="grid grid-cols-2 gap-x-3 gap-y-1 pointer-coarse:gap-y-2">
            <legend className={cn("mb-1.5", TAG_LABEL)}>On each tag</legend>
            {ALL_TAG_FIELDS.map((field) => (
              <label key={field} className="flex min-h-7 items-center gap-2 text-[12.5px] pointer-coarse:min-h-9">
                <input
                  type="checkbox"
                  className="size-4 accent-[#1D4B3B]"
                  checked={layout.fields.includes(field)}
                  onChange={() => patch({ fields: toggleField(layout.fields, field) })}
                />
                {fieldLabel(field)}
              </label>
            ))}
          </fieldset>
          <label className={cn("flex flex-col gap-1.5", TAG_LABEL)}>
            Promotional line
            <input
              value={layout.promoMessage}
              maxLength={40}
              placeholder="Fresh deal"
              className={cn(FIELD_CLASS, "normal-case tracking-normal")}
              onChange={(event) => patch({ promoMessage: event.target.value })}
            />
          </label>
          <label className="flex min-h-7 items-center gap-2 text-[12.5px] pointer-coarse:min-h-9">
            <input
              type="checkbox"
              className="size-4 accent-[#1D4B3B]"
              checked={layout.generateBarcodeFromSku}
              onChange={(event) => patch({ generateBarcodeFromSku: event.target.checked })}
            />
            Barcode from SKU when the product has none
          </label>
          <p className={cn(TAG_NOTE, "max-w-prose")}>
            Selling prices are read again from this branch when you print or download. Saved layouts keep the
            sheet, not the prices. Weighed products show their price per unit. A previous price appears when
            the catalog price is higher than the selling price, or when you type one.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={saveName}
              maxLength={48}
              placeholder="Layout name"
              aria-label="Layout name"
              className={cn(FIELD_CLASS, "min-w-0 flex-1")}
              onChange={(event) => setSaveName(event.target.value)}
            />
            <button
              type="button"
              className={cn(CATALOG_BTN_OUTLINE, "pointer-coarse:h-10")}
              disabled={!saveName.trim()}
              onClick={() => {
                const name = saveName.trim();
                if (!name) return;
                const entry: SavedTagLayout = {
                  id: `layout-${Date.now()}`,
                  name,
                  layout: { ...layout, fields: layout.fields.slice() },
                };
                onSaved((current) => [entry, ...current.filter((row) => row.name !== name)].slice(0, 24));
                setSaveName("");
                setSavedId(entry.id);
              }}
            >
              Save layout
            </button>
          </div>
          {saved.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Saved layouts"
                value={savedId}
                className={FIELD_CLASS}
                onChange={(event) => {
                  setSavedId(event.target.value);
                  const entry = saved.find((row) => row.id === event.target.value);
                  if (entry) onLayout(() => ({ ...entry.layout, fields: entry.layout.fields.slice() }));
                }}
              >
                <option value="">Use a saved layout</option>
                {saved.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              {savedId ? (
                <button
                  type="button"
                  className={cn(CATALOG_BTN_GHOST, "text-[#A55237]")}
                  onClick={() => {
                    onSaved((current) => current.filter((row) => row.id !== savedId));
                    setSavedId("");
                  }}
                >
                  Delete saved layout
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}
