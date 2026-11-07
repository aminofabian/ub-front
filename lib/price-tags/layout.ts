import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  type SheetGeometry,
  type TagLayout,
} from "@/lib/price-tags/types";

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function roundMm(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * How many tags of the given size fit on one A4 sheet.
 * Columns and rows are derived from millimetres so the preview and the
 * printed page describe the same paper.
 */
export function resolveSheet(layout: TagLayout): SheetGeometry {
  const marginTopMm = clamp(layout.marginTopMm, 0, 40);
  const marginRightMm = clamp(layout.marginRightMm, 0, 40);
  const marginBottomMm = clamp(layout.marginBottomMm, 0, 40);
  const marginLeftMm = clamp(layout.marginLeftMm, 0, 40);
  const gapXMm = clamp(layout.gapXMm, 0, 20);
  const gapYMm = clamp(layout.gapYMm, 0, 20);
  const usableWidthMm = roundMm(A4_WIDTH_MM - marginLeftMm - marginRightMm);
  const usableHeightMm = roundMm(A4_HEIGHT_MM - marginTopMm - marginBottomMm);
  const tagWidthMm = clamp(layout.tagWidthMm, 18, Math.max(18, usableWidthMm));
  const tagHeightMm = clamp(layout.tagHeightMm, 12, Math.max(12, usableHeightMm));

  let columns = Math.floor((usableWidthMm + gapXMm) / (tagWidthMm + gapXMm));
  let rows = Math.floor((usableHeightMm + gapYMm) / (tagHeightMm + gapYMm));
  if (columns < 1) columns = 1;
  if (rows < 1) rows = 1;

  const usedWidthMm = roundMm(columns * tagWidthMm + (columns - 1) * gapXMm);
  const usedHeightMm = roundMm(rows * tagHeightMm + (rows - 1) * gapYMm);

  return {
    columns,
    rows,
    perPage: columns * rows,
    tagWidthMm,
    tagHeightMm,
    gapXMm,
    gapYMm,
    marginTopMm,
    marginRightMm,
    marginBottomMm,
    marginLeftMm,
    usedWidthMm,
    usedHeightMm,
    usableWidthMm,
    usableHeightMm,
  };
}

/** Tag width that fills the sheet with exactly `columns` columns. */
export function tagWidthForColumns(layout: TagLayout, columns: number): number {
  const cols = clamp(Math.round(columns), 1, 8);
  const marginRightMm = clamp(layout.marginRightMm, 0, 40);
  const marginLeftMm = clamp(layout.marginLeftMm, 0, 40);
  const gapXMm = clamp(layout.gapXMm, 0, 20);
  const usable = A4_WIDTH_MM - marginLeftMm - marginRightMm;
  return roundMm((usable - gapXMm * (cols - 1)) / cols);
}

/** Tag height that fills the sheet with exactly `rows` rows. */
export function tagHeightForRows(layout: TagLayout, rows: number): number {
  const count = clamp(Math.round(rows), 1, 14);
  const marginTopMm = clamp(layout.marginTopMm, 0, 40);
  const marginBottomMm = clamp(layout.marginBottomMm, 0, 40);
  const gapYMm = clamp(layout.gapYMm, 0, 20);
  const usable = A4_HEIGHT_MM - marginTopMm - marginBottomMm;
  return roundMm((usable - gapYMm * (count - 1)) / count);
}

export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const size = Math.max(1, Math.floor(perPage));
  if (items.length === 0) return [];
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function pageCount(tagCount: number, perPage: number): number {
  if (tagCount <= 0) return 1;
  return Math.ceil(tagCount / Math.max(1, perPage));
}
