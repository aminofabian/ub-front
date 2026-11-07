"use client";

import { useEffect, useRef, useState } from "react";

import { CATALOG_BTN_GHOST } from "@/app/(dashboard)/products/_components/catalog-chrome";
import { TAG_SCREEN_CSS, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import { cellPosition } from "@/lib/price-tags/layout";
import type { SheetCell } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const MM_TO_PX = 96 / 25.4;
const A4_SHORT_EDGE_PX = 210 * MM_TO_PX;
/** A roll is previewed as a strip of rows, the way it comes out of the printer: fewer on a phone, where each row is blown up to be readable. */
const ROLL_ROWS_PER_VIEW = 8;
const ROLL_ROWS_PER_VIEW_NARROW = 4;
const NARROW_FRAME_PX = 600;

export function PriceTagPreview({
  pages,
  pageIndex,
  skip,
  context,
  onPageIndex,
  onReorder,
  onRemove,
  onDuplicate,
}: {
  pages: SheetCell[][];
  /** First page (or roll row) shown. */
  pageIndex: number;
  /** Blank labels at the start of page one. */
  skip: number;
  context: TagRenderContext;
  onPageIndex: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (key: string) => void;
  onDuplicate: (key: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.62);
  const [narrow, setNarrow] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const geo = context.geometry;
  const roll = context.layout.media === "label-roll";
  const perView = roll ? (narrow ? ROLL_ROWS_PER_VIEW_NARROW : ROLL_ROWS_PER_VIEW) : 1;
  const rowGapMm = roll ? context.layout.rollRowGapMm : 0;
  const pageWidthPx = geo.pageWidthMm * MM_TO_PX;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      // A roll row is small; let it grow (up to 3×) so it can be read and dragged.
      const maxScale = pageWidthPx < A4_SHORT_EDGE_PX ? 3 : 1;
      if (width > 0) setScale(Math.min(maxScale, (width - 8) / pageWidthPx));
      setNarrow(width > 0 && width < NARROW_FRAME_PX);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pageWidthPx]);

  const visible = pages.length > 0 ? pages : [[]];
  const first = Math.min(Math.max(0, pageIndex), visible.length - 1);
  const shown = visible.slice(first, first + perView);
  const last = first + shown.length - 1;
  const stripHeightMm = shown.length * geo.pageHeightMm + (shown.length - 1) * rowGapMm;
  const hasTags = shown.some((page) => page.some((cell) => cell != null));

  const summary = roll
    ? `Label ${geo.tagWidthMm} × ${geo.tagHeightMm} mm${geo.perPage > 1 ? ` · ${geo.perPage} across` : ""} · ${
        geo.perPage > 1
          ? `${plural(visible.length, "row")} (${plural(visible.length * geo.perPage, "label")})`
          : plural(visible.length, "label")
      }`
    : `${geo.columns} × ${geo.rows} · ${geo.pageWidthMm} × ${geo.pageHeightMm} mm · ${plural(visible.length, "page")}`;
  const position = roll
    ? shown.length > 1
      ? `${first + 1}–${last + 1} / ${visible.length}`
      : `${first + 1} / ${visible.length}`
    : `${first + 1} / ${visible.length}`;

  return (
    // On a phone the page column scrolls and the preview is as tall as its strip;
    // on a laptop the preview takes the column's remaining height and scrolls inside.
    <div className="flex flex-col gap-2 lg:min-h-[24rem] lg:flex-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]">{summary}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(CATALOG_BTN_GHOST, "pointer-coarse:h-10 pointer-coarse:px-3")}
            disabled={first <= 0}
            onClick={() => onPageIndex(Math.max(0, first - perView))}
          >
            Previous
          </button>
          <span className="min-w-14 text-center text-[12px] tabular-nums" aria-live="polite">
            {position}
          </span>
          <button
            type="button"
            className={cn(CATALOG_BTN_GHOST, "pointer-coarse:h-10 pointer-coarse:px-3")}
            disabled={last >= visible.length - 1}
            onClick={() => onPageIndex(first + perView)}
          >
            Next
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="overflow-x-auto bg-[var(--catalog-panel,#EFEBE2)] p-3 lg:min-h-0 lg:flex-1 lg:overflow-auto"
      >
        <div className="mx-auto" style={{ height: stripHeightMm * MM_TO_PX * scale, width: pageWidthPx * scale }}>
          <div
            className="relative origin-top-left"
            style={{ width: `${geo.pageWidthMm}mm`, height: `${stripHeightMm}mm`, transform: `scale(${scale})` }}
          >
            <style>{TAG_SCREEN_CSS}</style>
            {shown.map((page, offset) => {
              const pageNumber = first + offset;
              const leading = pageNumber === 0 ? skip : 0;
              const top = offset * (geo.pageHeightMm + rowGapMm);
              return (
                <div
                  key={pageNumber}
                  className="absolute left-0 bg-white shadow-[0_18px_40px_rgba(18,26,22,0.12)]"
                  style={{ top: `${top}mm`, width: `${geo.pageWidthMm}mm`, height: `${geo.pageHeightMm}mm` }}
                >
                  <div dangerouslySetInnerHTML={{ __html: sheetHtml(page, context, pageNumber + 1, visible.length, { skipped: leading }) }} />
                  <div className="pointer-events-none absolute inset-0">
                    {page.map((slot, index) => {
                      if (!slot) return null;
                      const { x, y } = cellPosition(geo, index);
                      // Position in the whole job, not on this sheet: page one starts after the blanks.
                      const jobIndex = pageNumber * geo.perPage + index - skip;
                      return (
                        <div
                          key={slot.key}
                          className="group pointer-events-auto absolute"
                          style={{ left: `${x}mm`, top: `${y}mm`, width: `${geo.tagWidthMm}mm`, height: `${geo.tagHeightMm}mm` }}
                          draggable
                          onDragStart={() => {
                            dragFrom.current = jobIndex;
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const from = dragFrom.current;
                            dragFrom.current = null;
                            if (from == null || from === jobIndex) return;
                            onReorder(from, jobIndex);
                          }}
                        >
                          <div
                            className="absolute right-0 top-0 flex gap-0.5 bg-white/95 p-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <button type="button" className="px-1 text-[10px] text-[#1D4B3B]" onClick={() => onDuplicate(slot.key)}>
                              Copy
                            </button>
                            <button type="button" className="px-1 text-[10px] text-[#A55237]" onClick={() => onRemove(slot.key)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!hasTags ? (
              <p
                className={cn(
                  "pointer-events-none absolute inset-0 flex items-center justify-center text-center font-[family-name:var(--font-cormorant)] text-[#556159]",
                  roll ? "px-2 text-[3.5mm]" : "px-16 text-[1.7rem]",
                )}
              >
                {roll ? "Select or scan products." : "Select or scan products to fill this sheet."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_58%,transparent)]">
        {roll
          ? `Drag to reorder. Print labels needs no paper size. Browser Print: ${geo.pageWidthMm}×${geo.pageHeightMm} mm, scale 100%, no headers.`
          : "Drag to reorder. Print at 100% scale, with headers and footers off."}
      </p>
    </div>
  );
}

function plural(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}
