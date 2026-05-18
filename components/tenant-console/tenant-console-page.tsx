"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Globe,
  MonitorSmartphone,
  ShoppingCart,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { authInputClassName } from "@/components/auth/auth-split-shell";
import { Button } from "@/components/ui/button";
import { setSessionTenantId } from "@/lib/auth";
import { onboardBusiness } from "@/lib/api";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";

const LANDING_ACCENT = "#d9a441";

const FEATURES = [
  {
    icon: MonitorSmartphone,
    title: "POS that stays in sync",
    description:
      "Ring up sales at the counter while inventory and pricing update everywhere instantly.",
  },
  {
    icon: ShoppingCart,
    title: "Built-in storefront",
    description:
      "Publish a shoppable catalog online — web orders flow into the same dashboard as in-store sales.",
  },
  {
    icon: Globe,
    title: "Your domain, your brand",
    description:
      "Start on a free subdomain, then point a custom domain when you're ready to go fully white-label.",
  },
  {
    icon: Zap,
    title: "Multi-tenant by design",
    description:
      "Each shop is isolated — staff, branches, payments, and catalog scoped to your business only.",
  },
] as const;

function exampleShopHost(): string {
  if (typeof window === "undefined") {
    return "yourshop.palmart.co.ke";
  }
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `yourshop.localhost${port}`;
  }
  const parts = hostname.split(".");
  const ccSLDs = new Set([
    "co",
    "com",
    "org",
    "net",
    "gov",
    "edu",
    "ac",
    "or",
    "ne",
    "go",
  ]);
  const minParts = ccSLDs.has(parts[parts.length - 2] ?? "") ? 4 : 3;
  const base =
    parts.length >= minParts ? parts.slice(1).join(".") : hostname;
  return `yourshop.${base}`;
}

function domainSuffix(fullHost: string): string {
  const dot = fullHost.indexOf(".");
  return dot === -1 ? fullHost : fullHost.slice(dot);
}

export function TenantConsolePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shopHostExample, setShopHostExample] = useState("yourshop.palmart.co.ke");

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  useEffect(() => {
    setShopHostExample(exampleShopHost());
  }, []);

  const openOnboarding = () => {
    setShowOnboarding(true);
    setErrorMessage("");
  };

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

  const landingStyle = {
    "--landing-accent": LANDING_ACCENT,
    "--landing-accent-ink": "#141414",
    "--landing-glow":
      "color-mix(in srgb, var(--landing-accent) 22%, transparent)",
  } as React.CSSProperties;

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f4f5f8] text-foreground dark:bg-[#0c0c0e]"
      style={landingStyle}
    >
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-[18%] top-[-8%] h-[min(100vw,640px)] w-[min(100vw,640px)] rounded-full opacity-[0.35] blur-[120px]"
          style={{ background: "var(--landing-accent)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, oklch(0.5 0 0 / 0.07) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/80 dark:from-black/20 dark:to-black/60" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--landing-accent), color-mix(in srgb, var(--landing-accent) 65%, white))",
              color: "var(--landing-accent-ink)",
            }}
          >
            <Store className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            Palmart
          </span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href={APP_ROUTES.login}>Sign in</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full px-4 font-semibold shadow-md"
            style={{
              backgroundColor: "var(--landing-accent)",
              color: "var(--landing-accent-ink)",
            }}
            onClick={openOnboarding}
          >
            Create your shop
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10 xl:gap-14">
          {/* Hero copy */}
          <section className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
              <Sparkles
                className="h-3.5 w-3.5 text-[var(--landing-accent)]"
                aria-hidden
              />
              Multi-tenant POS · E-commerce
            </p>

            <h1 className="font-heading mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.25rem]">
              Run your shop in-store and online —{" "}
              <span className="text-[var(--landing-accent)]">one platform</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Palmart connects point-of-sale, inventory, and a branded storefront.
              Launch on a free subdomain today, add your custom domain when
              you&apos;re ready, and sell everywhere your customers are.
            </p>

            {showOnboarding ? (
              <div className="mx-auto mt-8 max-w-md rounded-2xl border border-black/[0.06] bg-white/90 p-5 text-left shadow-xl shadow-black/[0.06] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/40 lg:mx-0">
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                  Name your business
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;ll get a free subdomain, become the owner, and can add a
                  custom domain later.
                </p>
                <form className="mt-4 space-y-3" onSubmit={onOnboardSubmit}>
                  <label className="sr-only" htmlFor="landing-business-name">
                    Business name
                  </label>
                  <input
                    id="landing-business-name"
                    className={authInputClassName}
                    placeholder="e.g. Sunrise Bakery"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoComplete="organization"
                    required
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-2xl text-[15px] font-semibold shadow-lg"
                    style={{
                      backgroundColor: "var(--landing-accent)",
                      color: "var(--landing-accent-ink)",
                    }}
                  >
                    {isSubmitting ? (
                      "Creating your shop…"
                    ) : (
                      <>
                        Create business & continue
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>
                </form>
                <button
                  type="button"
                  className="mt-3 w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    setShowOnboarding(false);
                    setErrorMessage("");
                  }}
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:items-stretch lg:justify-start">
                <Button
                  type="button"
                  size="lg"
                  className="group h-14 min-w-[14rem] rounded-2xl px-8 text-base font-semibold shadow-lg shadow-[var(--landing-glow)] transition hover:brightness-[0.97] active:scale-[0.99] sm:min-w-[16rem] sm:text-lg"
                  style={{
                    backgroundColor: "var(--landing-accent)",
                    color: "var(--landing-accent-ink)",
                  }}
                  onClick={openOnboarding}
                >
                  Create your shop
                  <ArrowRight
                    className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 rounded-2xl border-black/[0.08] bg-white/60 px-8 text-base backdrop-blur-sm dark:border-white/12 dark:bg-white/[0.04]"
                >
                  <Link href={APP_ROUTES.login}>Sign in to dashboard</Link>
                </Button>
              </div>
            )}

            {errorMessage ? (
              <div className="mx-auto mt-4 max-w-md lg:mx-0">
                <AuthAlert variant="error">{errorMessage}</AuthAlert>
              </div>
            ) : null}

            <p className="mt-6 text-sm text-muted-foreground">
              Already running a shop?{" "}
              <Link
                href={APP_ROUTES.login}
                className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground/40"
              >
                Sign in
              </Link>
              {" · "}
              <Link
                href={APP_ROUTES.forgotPassword}
                className="underline decoration-border underline-offset-4 hover:text-foreground"
              >
                Forgot password
              </Link>
            </p>
          </section>

          {/* Hero visual */}
          <aside
            className={
              showOnboarding
                ? "hidden"
                : "relative mx-auto w-full max-w-md lg:max-w-none"
            }
            aria-hidden={showOnboarding || undefined}
          >
            <div className="relative rounded-3xl border border-black/[0.06] bg-white/75 p-5 shadow-2xl shadow-black/[0.08] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/50 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Your storefront
                  </p>
                  <p className="mt-1 font-mono text-sm font-medium sm:text-base">
                    <span className="text-[var(--landing-accent)]">yourshop</span>
                    <span className="text-muted-foreground">
                      {domainSuffix(shopHostExample)}
                    </span>
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Live
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/50 p-4 dark:bg-white/[0.04]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    POS · Today
                  </p>
                  <p className="font-heading mt-2 text-2xl font-bold">KES 48,200</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    23 tickets · synced
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4 dark:bg-white/[0.04]">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Web orders
                  </p>
                  <p className="font-heading mt-2 text-2xl font-bold">7 new</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Same inventory pool
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--landing-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--landing-accent)_8%,white)] p-4 dark:bg-[color-mix(in_srgb,var(--landing-accent)_12%,#18181b)]">
                <div className="flex items-start gap-3">
                  <Globe
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--landing-accent)]"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold">Custom domain ready</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Map <span className="font-mono">shop.yourbrand.com</span> when
                      you&apos;re ready — SSL and primary domain switching included.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="pointer-events-none absolute -right-4 -top-4 hidden h-20 w-20 rounded-2xl border border-black/[0.06] bg-white/80 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] lg:block"
              style={{ transform: "rotate(6deg)" }}
            >
              <div className="flex h-full flex-col items-center justify-center gap-1 p-3 text-center">
                <ShoppingCart
                  className="h-6 w-6 text-[var(--landing-accent)]"
                  aria-hidden
                />
                <span className="text-[10px] font-semibold leading-tight text-muted-foreground">
                  Cart checkout
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* Features */}
        <section className="mt-20 sm:mt-28" aria-labelledby="landing-features">
          <h2
            id="landing-features"
            className="font-heading text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Everything a modern retailer needs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            From the cashier lane to your customer&apos;s phone — one catalog, one
            truth for stock and price.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="rounded-2xl border border-black/[0.05] bg-white/70 p-5 shadow-sm backdrop-blur-sm transition hover:border-[color-mix(in_srgb,var(--landing-accent)_35%,transparent)] hover:shadow-md dark:border-white/8 dark:bg-white/[0.04]"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--landing-accent) 18%, white)",
                    color: "var(--landing-accent)",
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <h3 className="font-heading mt-4 text-base font-semibold">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Bottom CTA band */}
        {!showOnboarding ? (
          <section className="mt-16 rounded-3xl border border-black/[0.06] bg-[#141414] px-6 py-10 text-center text-white shadow-xl sm:mt-20 sm:px-10 sm:py-12 dark:border-white/10">
            <p className="text-sm font-medium text-white/70">
              Free subdomain · no credit card to start
            </p>
            <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to open your shop?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
              Name your business, claim your URL, and invite your team — custom
              domains and branding follow when you grow.
            </p>
            <Button
              type="button"
              size="lg"
              className="mt-7 h-14 rounded-2xl px-10 text-base font-semibold shadow-lg"
              style={{
                backgroundColor: "var(--landing-accent)",
                color: "var(--landing-accent-ink)",
              }}
              onClick={openOnboarding}
            >
              Create your shop
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
            </Button>
          </section>
        ) : null}
      </main>

      <footer className="relative z-10 border-t border-black/[0.06] bg-white/50 py-6 backdrop-blur-md dark:border-white/8 dark:bg-black/30">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 text-sm text-muted-foreground sm:px-6"
          aria-label="Account and access links"
        >
          <Link
            href={APP_ROUTES.forgotPassword}
            className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            Forgot password
          </Link>
          <span className="select-none text-border" aria-hidden>
            ·
          </span>
          <Link
            href={APP_ROUTES.verifyEmail}
            className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            Verify email
          </Link>
          <span className="select-none text-border" aria-hidden>
            ·
          </span>
          <Link
            href={APP_ROUTES.superAdminLogin}
            className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            Super-admin
          </Link>
        </nav>
      </footer>
    </div>
  );
}
