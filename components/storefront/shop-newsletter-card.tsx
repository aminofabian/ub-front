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
      className="relative overflow-hidden rounded-2xl px-5 py-5 text-white shadow-md"
      style={{ backgroundColor: primary ?? "var(--color-primary)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold leading-tight">Stay Updated</p>
          <p className="mt-1 text-xs text-white/75">
            Get the best offers and updates delivered to your inbox.
          </p>
        </div>
        <Send className="h-9 w-9 -rotate-12 text-white/40" aria-hidden />
      </div>
      <form
        className="mt-4 flex gap-2"
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
          placeholder="Enter your email address"
          className="h-10 flex-1 rounded-md border border-white/30 bg-white/15 px-3 text-sm text-white placeholder:text-white/55 focus:border-white/60 focus:outline-none"
        />
        <Button
          type="submit"
          className={cn(
            "h-10 shrink-0 rounded-md px-4 font-semibold text-white shadow-sm",
            !accent && "bg-orange-500 hover:bg-orange-600",
          )}
          style={accent ? { backgroundColor: accent, color: "#fff" } : undefined}
        >
          Subscribe
        </Button>
      </form>
    </aside>
  );
}
