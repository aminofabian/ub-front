"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShopNewsletterCard({
  primary,
  accent,
}: {
  primary: string | null;
  accent: string | null;
}) {
  return (
    <aside
      className="relative overflow-hidden rounded-xl px-4 py-4 text-white shadow-sm"
      style={{ backgroundColor: primary ?? "var(--color-primary)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Stay Updated</p>
          <p className="mt-0.5 text-[11px] text-white/70">
            Best offers delivered to your inbox.
          </p>
        </div>
        <Send
          className="h-7 w-7 -rotate-12 text-white/30 shrink-0"
          aria-hidden
        />
      </div>
      <form
        className="mt-3 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label htmlFor="shop-newsletter-email" className="sr-only">
          Email
        </label>
        <input
          id="shop-newsletter-email"
          type="email"
          placeholder="Enter your email"
          className="h-8 flex-1 rounded-lg border border-white/25 bg-white/12 px-2.5 text-xs text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none"
        />
        <Button
          type="submit"
          className={cn(
            "h-8 shrink-0 rounded-lg px-3 text-xs font-semibold text-white shadow-sm",
            !accent && "bg-amber-500 hover:bg-amber-600",
          )}
          style={
            accent ? { backgroundColor: accent, color: "#fff" } : undefined
          }
        >
          Subscribe
        </Button>
      </form>
    </aside>
  );
}
