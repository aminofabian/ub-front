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
        className="size-11 shrink-0 rounded-lg bg-white object-contain ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)] font-heading text-[18px] font-semibold uppercase",
        COUNT_TONE.mute,
      )}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
