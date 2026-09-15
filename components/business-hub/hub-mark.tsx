"use client";

import { monogramLetter } from "@/components/brand/tenant-monogram";
import { cn } from "@/lib/utils";

/**
 * The shop's mark on the hub: a real asset when the shop has one, otherwise the
 * monogram letter. Deliberately not the full `TenantLogo` lockup — a wordmark
 * shrunk into a 28px square loses its own proportions.
 */
export function HubMark({
  name,
  logoUrl,
  faviconUrl,
  className,
  letterClassName = "text-[11px]",
}: {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  /** Sizing and rounding live with the caller. */
  className?: string;
  letterClassName?: string;
}) {
  const mark = faviconUrl?.trim() || logoUrl?.trim() || "";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        mark
          ? "border border-[color-mix(in_srgb,var(--hub-ink)_12%,transparent)] bg-white"
          : "bg-[var(--hub-ink)]",
        className,
      )}
    >
      {mark ? (
        // eslint-disable-next-line @next/next/no-img-element -- tenant CDN asset
        <img src={mark} alt="" className="size-full object-contain" />
      ) : (
        <span
          className={cn(
            "font-mono font-bold uppercase leading-none text-[var(--hub-paper)]",
            letterClassName,
          )}
        >
          {monogramLetter(name)}
        </span>
      )}
    </span>
  );
}
