"use client";

import Link from "next/link";

import { HUB_CARD, HUB_MUTED } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  footer,
  footerTone = "muted",
  href,
}: {
  label: string;
  value: string;
  footer?: string;
  footerTone?: "muted" | "positive" | "warning";
  href?: string;
}) {
  const card = (
    <div className={HUB_CARD}>
      <p className={cn("text-sm", HUB_MUTED)}>{label}</p>
      <p className="mt-3 text-[1.75rem] font-bold leading-none tracking-tight text-black">
        {value}
      </p>
      {footer ? (
        <p
          className={cn(
            "mt-auto pt-4 text-sm font-medium",
            footerTone === "positive" && "text-emerald-600",
            footerTone === "warning" && "text-[#C47A5A]",
            footerTone === "muted" && "text-[#666666]",
          )}
        >
          {footer}
        </p>
      ) : (
        <span className="mt-auto block h-5" aria-hidden />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}
