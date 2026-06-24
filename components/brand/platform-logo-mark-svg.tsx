"use client";

import { useId } from "react";

import { platformLogoMarkSvg } from "@/lib/platform-logo-mark";
import { cn } from "@/lib/utils";

type PlatformLogoMarkSvgProps = {
  className?: string;
  /** Accessible label; set empty to inherit from parent. */
  label?: string;
};

/** Inline SVG logomark — same artwork as favicon and OG images. */
export function PlatformLogoMarkSvg({
  className,
  label = "Kiosk",
}: PlatformLogoMarkSvgProps) {
  const uid = useId().replace(/:/g, "");
  const svg = platformLogoMarkSvg(`km-${uid}`);

  return (
    <span
      className={cn("inline-flex shrink-0", className)}
      role="img"
      aria-label={label || undefined}
      aria-hidden={!label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
