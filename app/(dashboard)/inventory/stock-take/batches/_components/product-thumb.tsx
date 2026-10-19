import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

/** Small product photo so counters can match the shelf by eye; initial when there's none. */
export function ProductThumb({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static export, remote catalog photos
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="size-12 shrink-0 rounded-[2px] bg-[var(--op-surface,#fcfaf5)] object-contain ring-1 ring-[var(--op-rule,rgba(18,26,22,0.1))]"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--op-ink,#121a16)_5%,var(--op-surface,#fcfaf5))] text-[18px] font-semibold uppercase",
        COUNT_TONE.mute,
        COUNT_TONE.display,
      )}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
