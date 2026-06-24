"use client";

import { PlatformLogoMarkSvg } from "@/components/brand/platform-logo-mark-svg";
import { cn } from "@/lib/utils";

const SIZE_PX = { sm: 36, md: 44, lg: 52 } as const;

export type KioskLogoMarkProps = {
  size?: keyof typeof SIZE_PX | number;
  variant?: "landing" | "default" | "auth";
  /** Nav-style mark: green tile, no ring or heavy chrome. */
  plain?: boolean;
  className?: string;
};

/**
 * Kiosk platform logomark — same SVG as favicon, OG image, and PWA icons.
 */
export function KioskLogoMark({
  size = "md",
  variant = "default",
  plain = false,
  className,
}: KioskLogoMarkProps) {
  const px = typeof size === "number" ? size : SIZE_PX[size];

  const shellClass = plain
    ? variant === "landing"
      ? "shadow-[0_2px_12px_color-mix(in_srgb,var(--kiosk-gold)_22%,transparent),0_1px_3px_rgba(20,20,18,0.06)]"
      : "shadow-sm"
    : variant === "landing"
      ? "kiosk-logo-mark-premium shadow-[0_4px_20px_color-mix(in_srgb,var(--kiosk-gold)_32%,transparent),0_2px_6px_rgba(20,20,18,0.1),inset_0_1px_0_rgba(255,255,255,0.35)]"
      : variant === "auth"
        ? "shadow-[0_4px_22px_color-mix(in_srgb,var(--auth-primary)_35%,transparent),inset_0_1px_0_rgba(255,255,255,0.3)]"
        : "shadow-[0_3px_16px_color-mix(in_srgb,var(--primary)_28%,transparent),inset_0_1px_0_rgba(255,255,255,0.25)]";

  return (
    <span
      className={cn(
        "kiosk-logo-mark relative inline-flex shrink-0 overflow-hidden rounded-[0.32em]",
        !plain &&
          "ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-translate-y-px",
        shellClass,
        className,
      )}
      style={{ width: px, height: px }}
    >
      <PlatformLogoMarkSvg
        className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
        label=""
      />
    </span>
  );
}
