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
  const isLanding = variant === "landing";

  const shellClass = plain
    ? isLanding
      ? null
      : "shadow-sm"
    : isLanding
      ? "shadow-[0_2px_10px_rgba(20,20,18,0.12)]"
      : variant === "auth"
        ? "shadow-[0_4px_22px_color-mix(in_srgb,var(--auth-primary)_35%,transparent)]"
        : "shadow-[0_3px_16px_color-mix(in_srgb,var(--primary)_28%,transparent)]";

  return (
    <span
      className={cn(
        "kiosk-logo-mark relative inline-flex shrink-0 overflow-hidden rounded-none",
        !plain && !isLanding && "ring-1 ring-inset ring-white/20",
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
