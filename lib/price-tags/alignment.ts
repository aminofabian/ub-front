import { cellPosition } from "@/lib/price-tags/layout";
import type { PrinterCalibration, SheetGeometry } from "@/lib/price-tags/types";

/**
 * The alignment page: each label's outline, its number, its size and a centre
 * cross, plus a short ruler on the first label. If the outlines sit on the
 * die-cut edges, real tags will too; if not, the gap shows how far to nudge.
 */
export function alignmentTestHtml(geometry: SheetGeometry, offset: PrinterCalibration): string {
  const cells: string[] = [];
  const size = `${geometry.tagWidthMm} × ${geometry.tagHeightMm} mm`;
  for (let index = 0; index < geometry.perPage; index += 1) {
    const { x, y } = cellPosition(geometry, index);
    const ruler = index === 0 ? rulerHtml(geometry.tagWidthMm) : "";
    cells.push(
      `<div class="palign-cell" style="left:${x + offset.offsetXMm}mm;top:${y + offset.offsetYMm}mm;width:${geometry.tagWidthMm}mm;height:${geometry.tagHeightMm}mm">` +
        `<span class="palign-cross-h"></span><span class="palign-cross-v"></span>` +
        `<span class="palign-number">${index + 1}</span><span class="palign-size">${size}</span>${ruler}</div>`,
    );
  }
  return (
    `<section class="ptag-sheet palign-sheet" style="width:${geometry.pageWidthMm}mm;height:${geometry.pageHeightMm}mm" aria-label="Alignment test">` +
    `${cells.join("")}</section>`
  );
}

/** Ticks every millimetre along the top edge, longer every 5 and 10. */
function rulerHtml(widthMm: number): string {
  const ticks: string[] = [];
  for (let mm = 0; mm <= Math.floor(widthMm); mm += 1) {
    const length = mm % 10 === 0 ? 2.4 : mm % 5 === 0 ? 1.6 : 0.9;
    ticks.push(`<span class="palign-tick" style="left:${mm}mm;height:${length}mm"></span>`);
  }
  return ticks.join("");
}

export const ALIGNMENT_TEST_CSS = `
  .palign-cell {
    position: absolute;
    box-sizing: border-box;
    border: 0.25mm dashed #121A16;
    overflow: hidden;
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #121A16;
  }
  .palign-cross-h, .palign-cross-v { position: absolute; background: #121A16; }
  .palign-cross-h { left: calc(50% - 2mm); top: 50%; width: 4mm; height: 0.2mm; }
  .palign-cross-v { top: calc(50% - 2mm); left: 50%; height: 4mm; width: 0.2mm; }
  .palign-number { position: absolute; left: 1.2mm; bottom: 0.8mm; font-size: 4mm; font-weight: 700; }
  .palign-size { position: absolute; right: 1.2mm; bottom: 1mm; font-size: 2mm; }
  .palign-tick { position: absolute; top: 0; width: 0.15mm; background: #121A16; }
`;
