"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  clearWebCartHandle,
  ensureWebCartId,
  notifyWebCartChanged,
  upsertWebCartLine,
} from "@/lib/web-cart";

/**
 * Round "+" pill that adds one of the given item to the web cart.
 * Used on product tiles and sidebar list rows. Falls back to theme primary when no accent is set.
 */
export function ShopQuickAddButton({
  slug,
  itemId,
  ariaLabel,
  accentHex,
  size = "md",
}: {
  slug: string;
  itemId: string;
  ariaLabel: string;
  accentHex?: string | null;
  size?: "sm" | "md";
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  async function add() {
    const s = slug.trim();
    const id = itemId.trim();
    if (!s || !id || busy) {
      return;
    }
    setBusy(true);
    try {
      let cartId = (await ensureWebCartId(s)) ?? null;
      if (!cartId) {
        return;
      }
      let updated = await upsertWebCartLine(s, cartId, id, 1);
      if (!updated) {
        clearWebCartHandle();
        cartId = (await ensureWebCartId(s)) ?? null;
        if (!cartId) {
          return;
        }
        updated = await upsertWebCartLine(s, cartId, id, 1);
      }
      if (updated) {
        notifyWebCartChanged();
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void add();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-70",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        !accent && "bg-primary",
      )}
      style={accent ? { backgroundColor: accent } : undefined}
    >
      {done ? (
        <Check className={size === "sm" ? "h-4 w-4" : "h-4 w-4"} aria-hidden />
      ) : (
        <Plus className={size === "sm" ? "h-4 w-4" : "h-4 w-4"} aria-hidden />
      )}
    </button>
  );
}
