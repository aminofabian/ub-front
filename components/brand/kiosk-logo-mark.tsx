"use client";

import { useId } from "react";

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
 * Premium logomark — shop kiosk with scan, sale lines, and payment glow.
 */
export function KioskLogoMark({
  size = "md",
  variant = "default",
  plain = false,
  className,
}: KioskLogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const bgId = `km-bg-${uid}`;
  const bgDeepId = `km-deep-${uid}`;
  const shineId = `km-shine-${uid}`;
  const goldId = `km-gold-${uid}`;
  const glowId = `km-glow-${uid}`;

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
        !plain && "ring-1 ring-inset ring-white/25 transition-transform duration-300 group-hover:-translate-y-px",
        shellClass,
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        role="img"
        aria-label="Kiosk shop counter"
      >
        <defs>
          <linearGradient id={bgId} x1="8" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#45D078" />
            <stop offset="0.5" stopColor="#28A745" />
            <stop offset="1" stopColor="#186B30" />
          </linearGradient>
          <linearGradient id={bgDeepId} x1="16" y1="14" x2="16" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id={shineId} x1="16" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity="0.42" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={goldId} x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B8E8C6" stopOpacity="0" />
            <stop offset="0.5" stopColor="#E8F8EC" stopOpacity="0.85" />
            <stop offset="1" stopColor="#B8E8C6" stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="32" height="32" rx="9" fill={`url(#${bgId})`} />
        <rect width="32" height="32" rx="9" fill={`url(#${bgDeepId})`} />
        <rect width="32" height="14" rx="9" fill={`url(#${shineId})`} />
        <rect width="32" height="32" rx="9" fill={`url(#${goldId})`} opacity="0.35" />

        {/* Awning — market kiosk */}
        <path
          d="M3 12.2C9.8 8.1 12.2 7.5 16 7.5C19.8 7.5 22.2 8.1 29 12.2V14.1H3V12.2Z"
          fill="#FFFFFF"
          fillOpacity="0.98"
        />
        <path
          d="M3 12.2C9.8 8.1 12.2 7.5 16 7.5C19.8 7.5 22.2 8.1 29 12.2"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="0.6"
          fill="none"
        />

        {/* Till body */}
        <rect x="5.5" y="14.8" width="21" height="12.8" rx="2.6" fill="#FFFFFF" fillOpacity="0.96" />
        <rect x="5.5" y="14.8" width="21" height="1.2" rx="0.6" fill="#1A7A34" fillOpacity="0.08" />

        {/* Barcode */}
        <rect x="7.8" y="17" width="1.2" height="4.2" rx="0.6" fill="#1A7A34" fillOpacity="0.5" />
        <rect x="9.4" y="17" width="1.2" height="6.2" rx="0.6" fill="#1A7A34" fillOpacity="0.72" />
        <rect x="11" y="17" width="1.2" height="3.4" rx="0.6" fill="#1A7A34" fillOpacity="0.42" />
        <rect x="12.6" y="17" width="1.2" height="5.4" rx="0.6" fill="#1A7A34" fillOpacity="0.62" />

        {/* Receipt lines */}
        <path
          d="M16.2 17.4H23.4M16.2 19.6H22.2M16.2 21.8H23"
          stroke="#1A7A34"
          strokeOpacity="0.45"
          strokeWidth="1.05"
          strokeLinecap="round"
        />

        {/* Payment — M-Pesa / cash */}
        <circle cx="22" cy="24.6" r="2.5" fill="#32B85A" filter={`url(#${glowId})`} />
        <circle cx="22" cy="24.6" r="1.5" fill="#FFFFFF" fillOpacity="0.95" />
        <path
          d="M21.1 24.55L21.75 25.2L23.15 23.65"
          stroke="#1A7A34"
          strokeWidth="0.95"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Scanner corner */}
        <path
          d="M14.8 15.8V17.4M14.8 15.8H16.4"
          stroke="#45D078"
          strokeWidth="1.05"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
