"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { setSessionTenantId } from "@/lib/auth";
import { onboardBusiness } from "@/lib/api";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

export function TenantConsolePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShopSignIn, setShowShopSignIn] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [shopSlug, setShopSlug] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  const onOnboardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await onboardBusiness(host, businessName);
      if (!result?.tenantId) {
        setErrorMessage(
          "Could not create business. Please try a different name.",
        );
        return;
      }

      setSessionTenantId(result.tenantId);
      const shopUrl = slugDerivedShopUrl(result.slug);
      if (shopUrl) {
        window.location.assign(`${shopUrl}/signup`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create business. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onShopSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = shopSlug.trim().toLowerCase();
    if (!slug) {
      setErrorMessage("Enter your shop name.");
      return;
    }
    const shopUrl = slugDerivedShopUrl(slug);
    if (shopUrl) {
      window.location.assign(`${shopUrl}/login`);
    } else {
      setErrorMessage("Could not determine your shop URL. Try again.");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-25%,var(--color-muted)_0%,transparent_52%)] opacity-70 dark:opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/20 dark:from-muted/15 dark:to-muted/10"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-20">
        <article className="w-full max-w-md rounded-2xl border border-border bg-card/95 p-6 text-center shadow-lg shadow-foreground/[0.04] ring-1 ring-foreground/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 dark:shadow-black/30 dark:ring-white/[0.06] sm:p-8">
          <header className="mx-auto flex max-w-[42ch] flex-col items-center">
            <p className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              UB Admin
            </p>
            <h1 className="mt-6 text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2rem]">
              Phase 1 · Tenant console
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
              Manage business settings, users, and catalog. Sign in with an
              existing account or create a new shop.
            </p>
          </header>

          {/* Onboarding form */}
          {showOnboarding ? (
            <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 text-left">
              <h3 className="text-sm font-bold text-foreground">
                Name your business
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick a name for your shop. You&apos;ll get a free subdomain and
                become the owner.
              </p>
              <form className="mt-4 space-y-3" onSubmit={onOnboardSubmit}>
                <input
                  className={cn(
                    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
                  )}
                  placeholder="My Shop"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoComplete="organization"
                  required
                />
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-[15px] font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Creating business…"
                    : "Create business & sign up →"}
                </Button>
              </form>
              <button
                type="button"
                className="mt-3 w-full text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() => {
                  setShowOnboarding(false);
                  setErrorMessage("");
                }}
              >
                Back
              </button>
            </div>
          ) : showShopSignIn ? (
            <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 text-left">
              <h3 className="text-sm font-bold text-foreground">
                Sign in to your shop
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your shop name to go to your sign-in page.
              </p>
              <form className="mt-4 space-y-3" onSubmit={onShopSignIn}>
                <div className="flex items-center gap-0">
                  <input
                    className={cn(
                      "flex-1 rounded-l-xl border border-border bg-background px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
                    )}
                    placeholder="your-shop"
                    value={shopSlug}
                    onChange={(e) => setShopSlug(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <span className="rounded-r-xl border-y border-r border-border bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
                    .kiosk.ke
                  </span>
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-[15px] font-semibold"
                >
                  Go to sign in →
                </Button>
              </form>
              <button
                type="button"
                className="mt-3 w-full text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() => {
                  setShowShopSignIn(false);
                  setErrorMessage("");
                }}
              >
                Back
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-3">
                <Button
                  onClick={() => {
                    setShowShopSignIn(true);
                    setErrorMessage("");
                  }}
                  size="lg"
                  className="h-11 w-full min-w-[9.5rem] px-6 text-base sm:w-auto"
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => {
                    setShowOnboarding(true);
                    setErrorMessage("");
                  }}
                  variant="outline"
                  size="lg"
                  className="h-11 w-full min-w-[9.5rem] px-6 text-base sm:w-auto"
                >
                  Create your shop
                </Button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Already have a shop?{" "}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4 hover:text-foreground"
                  onClick={() => {
                    setShowShopSignIn(true);
                    setErrorMessage("");
                  }}
                >
                  Sign in here
                </button>
                .
              </p>
            </>
          )}

          {errorMessage ? (
            <div className="mt-4">
              <AuthAlert variant="error">{errorMessage}</AuthAlert>
            </div>
          ) : null}

          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground"
            aria-label="Account and access links"
          >
            <Link
              href={APP_ROUTES.forgotPassword}
              className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:decoration-foreground/30 focus-visible:outline-none"
            >
              Forgot password
            </Link>
            <span className="select-none text-border" aria-hidden>
              ·
            </span>
            <Link
              href={APP_ROUTES.verifyEmail}
              className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:decoration-foreground/30 focus-visible:outline-none"
            >
              Verify email
            </Link>
            <span className="select-none text-border" aria-hidden>
              ·
            </span>
            <Link
              href={APP_ROUTES.superAdminLogin}
              className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:decoration-foreground/30 focus-visible:outline-none"
            >
              Super-admin
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
