"use client";

import { useEffect, useRef, useState } from "react";

import { TAG_SCREEN_CSS, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import { moveSlot } from "@/lib/price-tags/slots";
import type { TagInstance } from "@/lib/price-tags/types";

const A4_WIDTH_PX = (210 * 96) / 25.4;

export function PriceTagPreview({
  pages,
  pageIndex,
  context,
  onPageIndex,
  onReorder,
  onRemove,
  onDuplicate,
}: {
  pages: TagInstance[][];
  pageIndex: number;
  context: TagRenderContext;
  onPageIndex: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (key: string) => void;
  onDuplicate: (key: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.62);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      if (width > 0) setScale(Math.min(1, (width - 8) / A4_WIDTH_PX));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const visible = pages.length > 0 ? pages : [[]];
  const safeIndex = Math.min(pageIndex, visible.length - 1);
  const page = visible[safeIndex] ?? [];
  const html = sheetHtml(page, context, safeIndex + 1, visible.length);
  const sheetHeight = ((297 * 96) / 25.4) * scale;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]">
          {context.geometry.columns} × {context.geometry.rows}
          <span className="px-1.5">·</span>
          {context.geometry.perPage} per sheet
          <span className="px-1.5">·</span>
          {visible.length === 1 ? "1 page" : `${visible.length} pages`}
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
          <span className="min-w-14 text-center text-[12px] tabular-nums">
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

      <div
        ref={frameRef}
        className="min-h-0 flex-1 overflow-auto bg-[var(--catalog-panel,#EFEBE2)] p-3"
      >
        <div className="mx-auto" style={{ height: sheetHeight, width: A4_WIDTH_PX * scale }}>
          <div
            className="relative origin-top-left bg-white shadow-[0_18px_40px_rgba(18,26,22,0.12)]"
            style={{
              width: "210mm",
              height: "297mm",
              transform: `scale(${scale})`,
            }}
          >
            <style>{TAG_SCREEN_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            <div className="pointer-events-none absolute inset-0">
              {page.map((slot, index) => {
                const geo = context.geometry;
                const col = index % geo.columns;
                const row = Math.floor(index / geo.columns);
                const left = geo.marginLeftMm + col * (geo.tagWidthMm + geo.gapXMm);
                const top = geo.marginTopMm + row * (geo.tagHeightMm + geo.gapYMm);
                const globalIndex = safeIndex * geo.perPage + index;
                return (
                  <div
                    key={slot.key}
                    className="group pointer-events-auto absolute"
                    style={{
                      left: `${left}mm`,
                      top: `${top}mm`,
                      width: `${geo.tagWidthMm}mm`,
                      height: `${geo.tagHeightMm}mm`,
                    }}
                    draggable
                    onDragStart={() => {
                      dragFrom.current = globalIndex;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const from = dragFrom.current;
                      dragFrom.current = null;
                      if (from == null || from === globalIndex) return;
                      onReorder(from, globalIndex);
                    }}
                  >
                    <div
                      className="absolute right-0 top-0 flex gap-0.5 bg-white/95 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="px-1 text-[10px] text-[#1D4B3B]"
                        onClick={() => onDuplicate(slot.key)}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="px-1 text-[10px] text-[#A55237]"
                        onClick={() => onRemove(slot.key)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {page.length === 0 ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-center font-[family-name:var(--font-cormorant)] text-[1.7rem] text-[#556159]">
                Select products to fill this sheet.
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_58%,transparent)]">
        Drag a tag to move it. In the print dialog, turn off headers and footers so the sheet lines up with the paper.
      </p>
    </div>
  );
}

export function reorderInstances(instances: readonly TagInstance[], from: number, to: number) {
  return moveSlot(instances, from, to);
}
