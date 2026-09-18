"use client";

import { resolvePaymentBrandLogo } from "@/lib/payment-brand-logo";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-8",
  md: "size-10",
} as const;

export function PaymentBrandMark({
  gatewayType,
  displayName,
  logoUrl,
  glyph,
  size = "md",
  className,
}: {
  gatewayType?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
  /** Letter fallback when there is no brand artwork. */
  glyph?: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const logo = resolvePaymentBrandLogo({ gatewayType, displayName, logoUrl });
  const dim = SIZE[size];

  if (logo) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black",
          dim,
          className,
        )}
        aria-hidden
      >
        {/* Static files in /public; object-contain keeps the wordmark inside the circle. */}
        <img
          src={logo.src}
          alt=""
          className={
            logo.crop === "mark"
              ? "h-full w-[240%] max-w-none object-cover object-left"
              : "size-full object-contain"
          }
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-sm font-bold text-muted-foreground",
        dim,
        className,
      )}
      aria-hidden
    >
      {(
        glyph ??
        (displayName || gatewayType || "?").trim().slice(0, 1).toUpperCase()
      ) || "?"}
    </span>
  );
}
