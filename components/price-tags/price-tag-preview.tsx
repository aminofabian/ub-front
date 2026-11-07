"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { TAG_SCREEN_CSS, sheetHtml, type TagRenderContext } from "@/lib/price-tags/markup";
import { cellPosition } from "@/lib/price-tags/layout";
import type { SheetCell } from "@/lib/price-tags/types";
import { cn } from "@/lib/utils";

const MM_TO_PX = 96 / 25.4;
const A4_SHORT_EDGE_PX = 210 * MM_TO_PX;
/** How many roll rows appear before the next ones have to be scrolled into view. */
const ROLL_BATCH = 8;
const ROLL_BATCH_NARROW = 4;
const NARROW_FRAME_PX = 600;
const REVEAL_MS = 240;

export function PriceTagPreview({
  pages,
  skip,
  context,
  onReorder,
  onRemove,
  onDuplicate,
}: {
  pages: SheetCell[][];
  /** Blank labels at the start of page one. */
  skip: number;
  context: TagRenderContext;
  onReorder: (from: number, to: number) => void;
  onRemove: (key: string) => void;
  onDuplicate: (key: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(0);
  const loadingRef = useRef(false);
  const settledRef = useRef(false);
  const mediaRef = useRef<boolean | null>(null);
  const timerRef = useRef(0);
  const dragFrom = useRef<number | null>(null);
  const [scale, setScale] = useState(0.62);
  const [narrow, setNarrow] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [skeletons, setSkeletons] = useState(0);

  const geo = context.geometry;
  const roll = context.layout.media === "label-roll";
  const batch = roll ? (narrow ? ROLL_BATCH_NARROW : ROLL_BATCH) : 1;
  const rowGapMm = roll ? context.layout.rollRowGapMm : 0;
  const pageWidthPx = geo.pageWidthMm * MM_TO_PX;

  const visible = pages.length > 0 ? pages : [[]];
  const shownCount = Math.min(revealed, visible.length);
  const shown = visible.slice(0, shownCount);
  const stripBlocks = shown.length + skeletons;
  const stripHeightMm = stripBlocks * geo.pageHeightMm + Math.max(0, stripBlocks - 1) * rowGapMm;
  const hasTags = visible.some((page) => page.some((cell) => cell != null));
  revealedRef.current = shownCount;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      if (width <= 0) return;
      const isNarrow = width < NARROW_FRAME_PX;
      // A roll row is small; let it grow (up to 3×) so it can be read and dragged.
      const maxScale = pageWidthPx < A4_SHORT_EDGE_PX ? 3 : 1;
      setScale(Math.min(maxScale, (width - 8) / pageWidthPx));
      setNarrow(isNarrow);
      if (!settledRef.current || mediaRef.current !== roll) {
        settledRef.current = true;
        mediaRef.current = roll;
        setRevealed(roll ? (isNarrow ? ROLL_BATCH_NARROW : ROLL_BATCH) : 1);
        setSkeletons(0);
        loadingRef.current = false;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pageWidthPx, roll]);

  useEffect(() => {
    setRevealed((current) => Math.min(current, visible.length));
  }, [visible.length]);

  useEffect(() => {
    const root = frameRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || shownCount >= visible.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealMore = () => {
      if (loadingRef.current) return;
      const have = revealedRef.current;
      const total = visible.length;
      if (have >= total) return;
      const add = Math.min(batch, total - have);
      if (reduced) {
        setRevealed(have + add);
        return;
      }
      loadingRef.current = true;
      setSkeletons(add);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        loadingRef.current = false;
        setSkeletons(0);
        setRevealed((current) => Math.min(total, current + add));
      }, REVEAL_MS);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) revealMore();
      },
      { root, rootMargin: "160px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [batch, shownCount, visible.length]);

  const summary = roll
    ? `Label ${geo.tagWidthMm} × ${geo.tagHeightMm} mm${geo.perPage > 1 ? ` · ${geo.perPage} across` : ""} · ${
        geo.perPage > 1
          ? `${plural(visible.length, "row")} (${plural(visible.length * geo.perPage, "label")})`
          : plural(visible.length, "label")
      }`
    : `${geo.columns} × ${geo.rows} · ${geo.pageWidthMm} × ${geo.pageHeightMm} mm · ${plural(visible.length, "page")}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:min-h-[24rem]">
      <p className="text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_62%,transparent)]">{summary}</p>

      <div
        ref={frameRef}
        className="min-h-[16rem] flex-1 overflow-auto overscroll-contain bg-[var(--catalog-panel,#EFEBE2)] p-3 lg:min-h-0"
        aria-busy={skeletons > 0}
      >
        <div className="mx-auto" style={{ height: stripHeightMm * MM_TO_PX * scale, width: pageWidthPx * scale }}>
          <div
            className="relative origin-top-left"
            style={{ width: `${geo.pageWidthMm}mm`, height: `${stripHeightMm}mm`, transform: `scale(${scale})` }}
          >
            <style>{TAG_SCREEN_CSS}</style>
            {shown.map((page, offset) => {
              const leading = offset === 0 ? skip : 0;
              const top = offset * (geo.pageHeightMm + rowGapMm);
              return (
                <div
                  key={offset}
                  className={cn(
                    "absolute left-0 bg-white shadow-[0_18px_40px_rgba(18,26,22,0.12)]",
                    offset >= batch && "ptag-sheet-in",
                  )}
                  style={{ top: `${top}mm`, width: `${geo.pageWidthMm}mm`, height: `${geo.pageHeightMm}mm` }}
                >
                  <div dangerouslySetInnerHTML={{ __html: sheetHtml(page, context, offset + 1, visible.length, { skipped: leading }) }} />
                  <div className="pointer-events-none absolute inset-0">
                    {page.map((slot, index) => {
                      if (!slot) return null;
                      const { x, y } = cellPosition(geo, index);
                      // Position in the whole job, not on this sheet: page one starts after the blanks.
                      const jobIndex = offset * geo.perPage + index - skip;
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
            {Array.from({ length: skeletons }, (_, index) => {
              const top = (shown.length + index) * (geo.pageHeightMm + rowGapMm);
              return (
                <div
                  key={`skeleton-${shown.length + index}`}
                  aria-hidden
                  className="absolute left-0 bg-white shadow-[0_18px_40px_rgba(18,26,22,0.12)]"
                  style={{ top: `${top}mm`, width: `${geo.pageWidthMm}mm`, height: `${geo.pageHeightMm}mm` }}
                >
                  <TagSkeleton roll={roll} />
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
        <div ref={sentinelRef} className="h-px" aria-hidden />
        <style>{`
          @keyframes ptag-sheet-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .ptag-sheet-in { animation: ptag-sheet-in 220ms cubic-bezier(0.22, 1, 0.36, 1); }
          @media (prefers-reduced-motion: reduce) {
            .ptag-sheet-in { animation: none; }
          }
        `}</style>
      </div>
      <p className="text-[11.5px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_58%,transparent)]">
        {roll
          ? `Drag to reorder. Print labels needs no paper size. Browser Print: ${geo.pageWidthMm}×${geo.pageHeightMm} mm, scale 100%, no headers.`
          : "Drag to reorder. Print at 100% scale, with headers and footers off."}
      </p>
    </div>
  );
}

/** A quiet stand-in for the next label while it is drawn. */
function TagSkeleton({ roll }: { roll: boolean }) {
  return (
    <div className="flex h-full flex-col justify-between" style={{ padding: roll ? "2.2mm" : "8mm" }} aria-hidden>
      <div className="ml-auto bg-[#E7E1D6]" style={{ height: roll ? "7mm" : "14mm", width: "46%" }} />
      <div
        className="w-full bg-[#E7E1D6]"
        style={{
          height: roll ? "8mm" : "16mm",
          backgroundImage:
            "repeating-linear-gradient(90deg, #C9C2B4 0 0.35mm, transparent 0.35mm 1.05mm)",
        }}
      />
    </div>
  );
}

function plural(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}
