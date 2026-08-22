"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";

const QUICK_POSITIONS: { label: string; focalX: number; focalY: number }[] = [
  { label: "Top left", focalX: 15, focalY: 15 },
  { label: "Top", focalX: 50, focalY: 15 },
  { label: "Top right", focalX: 85, focalY: 15 },
  { label: "Left", focalX: 15, focalY: 50 },
  { label: "Center", focalX: 50, focalY: 50 },
  { label: "Right", focalX: 85, focalY: 50 },
  { label: "Bottom left", focalX: 15, focalY: 85 },
  { label: "Bottom", focalX: 50, focalY: 85 },
  { label: "Bottom right", focalX: 85, focalY: 85 },
];

/**
 * "Keep this part visible" — lets the merchant drag a dot over the photo to
 * choose the focal point. Renders as `object-position` on the storefront.
 */
export function ImageFocalPointPicker({
  src,
  alt,
  focalX,
  focalY,
  onChange,
  className,
}: {
  src: string;
  alt?: string;
  focalX: number;
  focalY: number;
  onChange: (focalX: number, focalY: number) => void;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onChange(Math.round(x * 100), Math.round(y * 100));
    },
    [onChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={frameRef}
        className="relative aspect-[16/9] w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl border border-border/70 bg-muted"
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) {
            setFromPointer(e.clientX, e.clientY);
          }
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- unoptimized merchant photo */}
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          draggable={false}
        />
        {/* Guide lines + focal dot */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
          <div
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/35 shadow-[0_1px_6px_rgba(0,0,0,0.45)] ring-1 ring-white/60"
            style={{ left: `${focalX}%`, top: `${focalY}%` }}
            aria-hidden
          />
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/90">
          {focalX}% · {focalY}%
        </div>
      </div>

      <div className="grid grid-cols-9 gap-1" aria-label="Quick focal positions">
        {QUICK_POSITIONS.map((pos) => (
          <button
            key={pos.label}
            type="button"
            title={pos.label}
            aria-label={`Focus on ${pos.label.toLowerCase()}`}
            className={cn(
              "aspect-square rounded-[4px] border transition-colors",
              focalX === pos.focalX && focalY === pos.focalY
                ? "border-foreground bg-foreground/10"
                : "border-border/80 bg-muted/50 hover:border-foreground/40 hover:bg-muted",
            )}
            onClick={() => onChange(pos.focalX, pos.focalY)}
          />
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Drag the dot to the part of the photo that matters — the theme keeps
        that area visible on every screen size.
      </p>
    </div>
  );
}
