import { ALIGNMENT_TEST_CSS, alignmentTestHtml } from "@/lib/price-tags/alignment";
import { tagPrintCssForPage, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import type { PrinterCalibration, SheetCell, SheetGeometry } from "@/lib/price-tags/types";

const FRAME_ATTR = "data-price-tag-print";
/** Removes the frame if the browser never fires `afterprint` (some iPadOS builds). */
const FALLBACK_CLEANUP_MS = 120_000;

export function printPriceTagPages(
  pages: SheetCell[][],
  ctx: TagRenderContext,
  pageFrom: number,
  pageTo: number,
  options: { offset: PrinterCalibration; skip: number; whenClosed?: () => void },
): boolean {
  const start = Math.max(1, pageFrom);
  const end = Math.min(pages.length, pageTo);
  const chosen = pages.slice(start - 1, end);
  if (chosen.length === 0 || typeof document === "undefined") return false;

  const html = chosen
    .map((cells, index) =>
      sheetHtml(cells, ctx, start + index, pages.length, {
        offset: options.offset,
        skipped: start + index === 1 ? options.skip : 0,
      }),
    )
    .join("");

  return printDocument(html, tagPrintCssForPage(ctx.geometry.pageWidthMm, ctx.geometry.pageHeightMm), options.whenClosed);
}

/**
 * One page that outlines every label position, numbered, with a centre cross.
 * Printed on the real labels (or held against them) it shows at a glance
 * whether the printer nudge needs to move.
 */
export function printAlignmentTest(geometry: SheetGeometry, offset: PrinterCalibration): boolean {
  if (typeof document === "undefined") return false;
  const css = tagPrintCssForPage(geometry.pageWidthMm, geometry.pageHeightMm) + ALIGNMENT_TEST_CSS;
  return printDocument(alignmentTestHtml(geometry, offset), css);
}

function printDocument(html: string, css: string, whenClosed?: () => void): boolean {
  // A frame left by an earlier job would print its sheets again on some browsers.
  for (const stale of Array.from(document.querySelectorAll(`iframe[${FRAME_ATTR}]`))) {
    stale.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Price tag print");
  iframe.setAttribute(FRAME_ATTR, "");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const frame = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!frame || !win) {
    iframe.remove();
    return false;
  }
  frame.open();
  frame.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Price tags</title><style>${css}</style></head><body>${html}</body></html>`,
  );
  frame.close();

  let removed = false;
  const cleanup = (delay: number) => {
    window.setTimeout(() => {
      if (removed) return;
      removed = true;
      iframe.remove();
    }, delay);
  };
  win.addEventListener("afterprint", () => cleanup(400), { once: true });
  cleanup(FALLBACK_CLEANUP_MS);
  window.setTimeout(() => {
    win.focus();
    win.print();
    // print() returns when the dialog closes. The sheet is finished either way.
    whenClosed?.();
  }, 60);
  return true;
}
