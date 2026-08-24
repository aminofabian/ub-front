"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import {
  spBtnPrimary,
  spEyebrow,
  spShellBg,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import { loginSupplierPortal } from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

export default function SupplierPortalLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("phone")?.trim();
    const email = params.get("email")?.trim();
    if (phone) setIdentifier(phone);
    else if (email) setIdentifier(email);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginSupplierPortal(identifier, password);
      router.push(APP_ROUTES.supplierPortalOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        spShellBg,
        "relative flex min-h-dvh flex-col overflow-hidden",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent),transparent)]"
      />

      <div className="relative z-10 flex flex-1 flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))] sm:mx-auto sm:w-full sm:max-w-md sm:justify-center sm:pt-10">
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3">
            <KioskLogo size="md" />
            <div>
              <p className={spEyebrow}>Supplier portal</p>
              <h1 className="font-[family-name:var(--font-heading)] text-[2.75rem] leading-none font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
                Kiosk
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Manage orders, shops, and payouts — built for the road and the warehouse floor.
          </p>
        </div>

        <div
          className={cn(
            "mt-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
            "bg-[color-mix(in_srgb,#faf8f4_94%,transparent)] p-5 shadow-[0_-8px_40px_rgba(28,25,21,0.08)]",
            "sm:mt-0 sm:shadow-none",
            "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          )}
        >
          <p className={spEyebrow}>Sign in</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--pos-ink,#1c1915)]">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The stall phone or email, plus the PIN or password you set.
          </p>

          <form className="mt-5 space-y-3.5" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Phone or email
              </span>
              <input
                id="sp-identifier"
                type="text"
                className="h-12 w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-white px-3 text-[16px] outline-none focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)]"
                value={identifier}
                onChange={(ev) => setIdentifier(ev.target.value)}
                autoComplete="username"
                placeholder="07… / 2547… or you@email.com"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                PIN or password
              </span>
              <input
                id="sp-password"
                type="password"
                className="h-12 w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-white px-3 text-[16px] outline-none focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)]"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit" className={cn(spBtnPrimary, "h-12 w-full text-[12px]")} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {error ? (
            <p className="mt-4 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href={APP_ROUTES.supplierPortalClaim}
              className="font-medium text-[var(--pos-primary,#0f766e)] underline underline-offset-2"
            >
              Open with the stall phone
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

