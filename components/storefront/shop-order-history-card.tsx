"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

function isHex(v: string | null | undefined): v is string {
  return !!v && /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

export function ShopOrderHistoryCard({
  primaryHex,
}: {
  primaryHex: string | null;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const primary = isHex(primaryHex) ? primaryHex.trim() : null;

  const sync = useCallback(() => {
    setSignedIn(getSessionTokens() != null);
  }, []);

  useEffect(() => {
    setMounted(true);
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopAccount)}`;
  const href = mounted && signedIn ? APP_ROUTES.shopAccount : loginHref;
  const cta = !mounted ? "…" : signedIn ? "View orders" : "Sign in";
  const description =
    mounted && signedIn
      ? "View past orders and reorder from your account."
      : "Sign in to view past orders and reorder.";

  return (
    <aside className="rounded-xl border border-border/40 bg-card p-4">
      <p className="text-xs font-semibold text-foreground">Order History</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Link
        href={href}
        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold text-white transition hover:brightness-110"
        style={{
          backgroundColor: primary ?? "var(--color-primary)",
        }}
      >
        {cta}
      </Link>
    </aside>
  );
}
