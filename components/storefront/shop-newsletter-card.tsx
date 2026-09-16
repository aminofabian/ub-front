"use client";

import Link from "next/link";
import { Send } from "lucide-react";

import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import { cn } from "@/lib/utils";

/**
 * Sidebar panel pointing at the shopper's real account.
 *
 * This was an email box whose submit handler only called `preventDefault()` — it
 * told the shopper nothing and stored nothing, so anyone who used it became no
 * record at all. It now opens the storefront sign-up sheet (F8).
 */
export function ShopNewsletterCard({
  primary,
  accent,
}: {
  primary: string | null;
  accent: string | null;
}) {
  const { href, label, onActivate } = useStorefrontSignUpDoor();

  return (
    <aside
      className="relative overflow-hidden rounded-xl px-4 py-4 text-white shadow-sm"
      style={{ backgroundColor: primary ?? "var(--color-primary)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Offers &amp; restock alerts</p>
          <p className="mt-0.5 text-[11px] text-white/70">
            Keep them with your orders — no inbox needed.
          </p>
        </div>
        <Send
          className="h-7 w-7 -rotate-12 text-white/30 shrink-0"
          aria-hidden
        />
      </div>
      <Link
        href={href}
        onClick={onActivate}
        className={cn(
          "mt-3 flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-90",
          !accent && "bg-amber-500 hover:bg-amber-600",
        )}
        style={
          accent ? { backgroundColor: accent, color: "#fff" } : undefined
        }
      >
        {label}
      </Link>
    </aside>
  );
}
