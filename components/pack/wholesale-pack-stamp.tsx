"use client";

import { cn } from "@/lib/utils";

export type WholesalePackStampProps = {
  units: number;
  packCount?: number;
  packUnit?: string | null;
  /** Overlay on a product photo (stall tiles). */
  overlay?: boolean;
  className?: string;
};

function formatUnits(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function packNoun(unit: string | null | undefined, count: number): string {
  const u = (unit ?? "pack").trim() || "pack";
  if (count === 1) return u;
  if (/s$/i.test(u)) return u;
  return `${u}s`;
}

/**
 * Carton stencil: the count of sell-units in one wholesale pack.
 * Used on New supply lines and marketplace stall tiles.
 */
export function WholesalePackStamp({
  units,
  packCount = 1,
  packUnit = "pack",
  overlay = false,
  className,
}: WholesalePackStampProps) {
  const unitLabel = packNoun(packUnit, 1);
  const many = packCount > 1;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        overlay &&
          "pointer-events-none absolute right-0.5 top-0.5 z-[1] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        className,
      )}
      title={
        many
          ? `${formatUnits(packCount)} ${packNoun(packUnit, packCount)} · ${formatUnits(units)} in each`
          : `Sold as a ${unitLabel} of ${formatUnits(units)}`
      }
    >
      <span
        className={cn(
          "relative grid shrink-0 place-items-center border font-mono font-black tabular-nums leading-none",
          overlay
            ? "size-8 border-amber-950/70 bg-amber-100 text-amber-950"
            : "size-7 border-amber-900/40 bg-[color-mix(in_srgb,oklch(0.86_0.08_85)_88%,var(--card))] text-amber-950 dark:border-amber-200/35 dark:bg-amber-950/55 dark:text-amber-100",
        )}
        aria-hidden
      >
        <span
          className="absolute inset-[2px] border border-dashed border-current/25"
          aria-hidden
        />
        <span className={cn(overlay ? "text-[11px]" : "text-[10px]")}>
          {formatUnits(units)}
        </span>
      </span>
      <span
        className={cn(
          "min-w-0 leading-tight",
          overlay
            ? "hidden"
            : "text-[9px] font-bold uppercase tracking-[0.08em] text-amber-950/80 dark:text-amber-100/85",
        )}
      >
        {many ? (
          <>
            {formatUnits(packCount)} {packNoun(packUnit, packCount)}
            <span className="block font-semibold normal-case tracking-normal text-muted-foreground">
              {formatUnits(units)} / {unitLabel}
            </span>
          </>
        ) : (
          <>
            Pack of {formatUnits(units)}
            <span className="block font-medium normal-case tracking-normal text-muted-foreground">
              {unitLabel}
            </span>
          </>
        )}
      </span>
    </span>
  );
}

export function wholesalePackCaption(args: {
  units: number;
  packCount?: number;
  packUnit?: string | null;
}): string {
  const units = formatUnits(args.units);
  const count = args.packCount ?? 1;
  const unit = packNoun(args.packUnit, 1);
  if (count > 1) {
    return `${formatUnits(count)} ${packNoun(args.packUnit, count)} · ${units} / ${unit}`;
  }
  return `Pack of ${units}`;
}
