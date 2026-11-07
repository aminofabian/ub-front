"use client";

import { useEffect, useRef, useState } from "react";

import { TAG_SCREEN_CSS, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import { cellPosition } from "@/lib/price-tags/layout";
import type { SheetCell } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const MM_TO_PX = 96 / 25.4;
const A4_SHORT_EDGE_PX = 210 * MM_TO_PX;

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
  const dragFrom = useRef<number | null>(null);

  const geo = context.geometry;
  const roll = context.layout.media === "label-roll";
  const pageWidthPx = geo.pageWidthMm * MM_TO_PX;
  const pageHeightPx = geo.pageHeightMm * MM_TO_PX;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      // A single roll label is small; let it grow (up to 3×) so it can be read and dragged.
      const maxScale = pageWidthPx < A4_SHORT_EDGE_PX ? 3 : 1;
      if (width > 0) setScale(Math.min(maxScale, (width - 8) / pageWidthPx));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pageWidthPx]);
  const visible = pages.length > 0 ? pages : [[]];
  const safeIndex = Math.min(pageIndex, visible.length - 1);
  const page = visible[safeIndex] ?? [];
  const leading = safeIndex === 0 ? skip : 0;
  const html = sheetHtml(page, context, safeIndex + 1, visible.length, { skipped: leading });
  const hasTags = page.some((cell) => cell != null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]">
          {roll ? (
            <>
              Label {geo.tagWidthMm} × {geo.tagHeightMm} mm
              {geo.perPage > 1 ? ` · ${geo.perPage} across` : ""}
              <span className="px-1.5">·</span>
              {geo.perPage > 1
                ? `${visible.length === 1 ? "1 row" : `${visible.length} rows`} (${visible.length * geo.perPage} labels)`
                : visible.length === 1
                  ? "1 label"
                  : `${visible.length} labels`}
            </>
          ) : (
            <>
              {geo.columns} × {geo.rows}
              <span className="px-1.5">·</span>
              {geo.pageWidthMm} × {geo.pageHeightMm} mm
              <span className="px-1.5">·</span>
              {visible.length === 1 ? "1 page" : `${visible.length} pages`}
            </>
          )}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-8 px-2 text-[12px] text-[var(--catalog-ink,#121A16)] disabled:opacity-40"
            disabled={safeIndex <= 0}
            onClick={() => onPageIndex(safeIndex - 1)}
          >
            Previous
          </button>
          <span className="min-w-14 text-center text-[12px] tabular-nums" aria-live="polite">
            {safeIndex + 1} / {visible.length}
          </span>
          <button
            type="button"
            className="h-8 px-2 text-[12px] text-[var(--catalog-ink,#121A16)] disabled:opacity-40"
            disabled={safeIndex >= visible.length - 1}
            onClick={() => onPageIndex(safeIndex + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div ref={frameRef} className="min-h-0 flex-1 overflow-auto bg-[var(--catalog-panel,#EFEBE2)] p-3">
        <div className="mx-auto" style={{ height: pageHeightPx * scale, width: pageWidthPx * scale }}>
          <div
            className="relative origin-top-left bg-white shadow-[0_18px_40px_rgba(18,26,22,0.12)]"
            style={{
              width: `${geo.pageWidthMm}mm`,
              height: `${geo.pageHeightMm}mm`,
              transform: `scale(${scale})`,
            }}
          >
            <style>{TAG_SCREEN_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            <div className="pointer-events-none absolute inset-0">
              {page.map((slot, index) => {
                if (!slot) return null;
                const { x, y } = cellPosition(geo, index);
                // Position in the whole job, not on this sheet: page one starts after the blanks.
                const jobIndex = safeIndex * geo.perPage + index - skip;
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
          ? `Drag a tag to move it. Each tag prints on its own label. In the print dialog, choose the label printer, a paper size of ${geo.pageWidthMm} × ${geo.pageHeightMm} mm${geo.perPage > 1 ? ` (one row of ${geo.perPage})` : ""}, scale 100%, and no headers or footers.`
          : "Drag a tag to move it. In the print dialog, set scale to 100% (not “Fit to page”) and turn off headers and footers so the sheet lines up with the paper."}
      </p>
    </div>
  );
}
