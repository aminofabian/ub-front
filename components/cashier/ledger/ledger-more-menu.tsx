"use client";

import { Children, type ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Full-width command row. Pass to AirtimeQuickAction as triggerClassName. */
export const MORE_ROW = cn(
  "flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[13px] font-medium text-zinc-800",
  "hover:bg-zinc-50 active:bg-zinc-100",
  "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary)_8%,white)]",
  "disabled:opacity-40",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-zinc-500",
);

export function MoreSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <section className="border-t border-zinc-100 first:border-t-0">
      <h2 className="px-2.5 pb-0.5 pt-2 text-[11px] font-medium text-zinc-500">
        {label}
      </h2>
      <div className="pb-1">{items}</div>
    </section>
  );
}

export function MoreRow({
  icon: Icon,
  children,
  onClick,
  href,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: "default" | "leave";
}) {
  const className = cn(
    MORE_ROW,
    tone === "leave" && "text-zinc-600 hover:text-zinc-900",
  );
  const inner = (
    <>
      <Icon aria-hidden />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {inner}
    </button>
  );
}
