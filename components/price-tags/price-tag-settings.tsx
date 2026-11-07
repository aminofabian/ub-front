"use client";

import { useState } from "react";

import { FIELD_CLASS, NumberField } from "@/components/price-tags/price-tag-inputs";
import { CATALOG_BTN_GHOST, CATALOG_BTN_OUTLINE } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { tagHeightForRows, tagWidthForColumns } from "@/lib/price-tags/layout";
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
}: {
  layout: TagLayout;
  geometry: SheetGeometry;
  calibration: PrinterCalibration;
  saved: SavedTagLayout[];
  onLayout: (update: (current: TagLayout) => TagLayout) => void;
  onCalibration: (next: PrinterCalibration) => void;
  onSaved: (update: (current: SavedTagLayout[]) => SavedTagLayout[]) => void;
}) {
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
    <details className="border border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] bg-[var(--catalog-shelf,#FCFAF5)]">
      <summary className="cursor-pointer px-3 py-2 text-[13px] text-[var(--catalog-ink,#121A16)]">
        Sheet size, spacing, printer alignment, and what each tag shows
      </summary>
      <div className="grid gap-4 px-3 pb-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((presetId) => (
              <button
                key={presetId}
                type="button"
                title={LABEL_PRESETS[presetId].detail}
                aria-pressed={layout.presetId === presetId}
                className={cn(
                  "h-7 border px-2 text-[11.5px]",
                  layout.presetId === presetId
                    ? "border-[#1D4B3B] text-[#1D4B3B]"
                    : "border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_14%,transparent)]",
                )}
                onClick={() => onLayout((current) => applyPreset(current, presetId))}
              >
                {LABEL_PRESETS[presetId].label}
              </button>
            ))}
            {layout.presetId === "custom" ? (
              <span className="self-center px-1 text-[11.5px] text-[#556159]">Custom size</span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
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
            <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
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
            <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
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
          <fieldset className="mt-1 flex flex-col gap-1.5">
            <legend className="mb-1 text-[11px] text-[#556159]">Printer alignment</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <p className="text-[11.5px] leading-relaxed text-[#556159]">
              Print one sheet on plain paper and hold it against a label sheet. If the tags sit off the labels,
              move them here; negative numbers move left or up. This applies to this device only.
            </p>
          </fieldset>
        </div>
        <div className="flex flex-col gap-2">
          <fieldset className="grid grid-cols-2 gap-x-3 gap-y-1">
            <legend className="mb-1 text-[11px] text-[#556159]">On each tag</legend>
            {ALL_TAG_FIELDS.map((field) => (
              <label key={field} className="flex items-center gap-1.5 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={layout.fields.includes(field)}
                  onChange={() => patch({ fields: toggleField(layout.fields, field) })}
                />
                {fieldLabel(field)}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-[11px] text-[#556159]">
            Promotional line
            <input
              value={layout.promoMessage}
              maxLength={40}
              placeholder="Fresh deal"
              className={cn(FIELD_CLASS, "px-2 text-[13px]")}
              onChange={(event) => patch({ promoMessage: event.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={layout.generateBarcodeFromSku}
              onChange={(event) => patch({ generateBarcodeFromSku: event.target.checked })}
            />
            Barcode from SKU when the product has none
          </label>
          <p className="text-[11.5px] leading-relaxed text-[#556159]">
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
              className={cn(FIELD_CLASS, "min-w-0 flex-1 px-2 text-[12.5px]")}
              onChange={(event) => setSaveName(event.target.value)}
            />
            <button
              type="button"
              className={CATALOG_BTN_OUTLINE}
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
