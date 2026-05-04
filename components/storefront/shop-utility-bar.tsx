"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import Link from "next/link";

import { logoutRemote } from "@/lib/api";
import { clearSessionTokens, getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function readSignedIn(): boolean {
  return getSessionTokens() != null;
}

export function ShopUtilityBar({
  primaryHex,
  locationHint,
}: {
  primaryHex: string | null;
  locationHint?: string | null;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  const sync = useCallback(() => {
    setSignedIn(readSignedIn());
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

  const onSignOut = useCallback(async () => {
    await logoutRemote().catch(() => {});
    clearSessionTokens();
    setSignedIn(false);
    window.location.reload();
  }, []);

  const resolvedPrimary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim()) ? primaryHex.trim() : null;
  const hint =
    locationHint?.trim() ||
    process.env.NEXT_PUBLIC_STOREFRONT_LOCATION_HINT?.trim() ||
    null;

  return (
    <div
      className={cn(
        "text-[11px] font-medium text-white sm:text-xs",
        !resolvedPrimary && "bg-primary",
      )}
      style={
        resolvedPrimary
          ? { backgroundColor: resolvedPrimary, color: "#fafafa" }
          : undefined
      }
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          <span className="truncate opacity-90">
            Delivering to:{" "}
            <span className="font-semibold opacity-100">{hint || "Your area"}</span>
          </span>
        </div>
        <nav className="flex shrink-0 items-center gap-x-1 sm:gap-x-2">
          <Link
            href={APP_ROUTES.shopCart}
            className="rounded px-2 py-0.5 transition hover:bg-white/10"
          >
            Track Order
          </Link>
          <span className="text-white/40" aria-hidden>
            |
          </span>
          <Link
            href="#shop-catalog"
            className="rounded px-2 py-0.5 transition hover:bg-white/10"
          >
            Help Center
          </Link>
          <span className="text-white/40" aria-hidden>
            |
          </span>
          {!mounted ? (
            <span className="rounded px-2 py-0.5 font-semibold opacity-70">…</span>
          ) : signedIn ? (
            <>
              <Link
                href={APP_ROUTES.business}
                className="rounded px-2 py-0.5 transition hover:bg-white/10"
              >
                Dashboard
              </Link>
              <span className="text-white/40" aria-hidden>
                |
              </span>
              <button
                type="button"
                className="rounded px-2 py-0.5 font-semibold transition hover:bg-white/10"
                onClick={() => void onSignOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href={APP_ROUTES.login}
              className="rounded px-2 py-0.5 font-semibold transition hover:bg-white/10"
            >
              Login / Sign up
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
