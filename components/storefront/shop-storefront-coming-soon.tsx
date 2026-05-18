"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { StorefrontSetupModal } from "@/components/storefront/storefront-setup-modal";
import { ShopTrustStrip } from "@/components/storefront/shop-trust-strip";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { getSessionTokens } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  { icon: Truck, title: "Fast delivery", sub: "Order online, delivered to you" },
  { icon: ShieldCheck, title: "Trusted quality", sub: "Shop with confidence" },
  { icon: Package, title: "Fresh selection", sub: "Browse our full catalog soon" },
] as const;

export type ShopStorefrontComingSoonProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  accentHex?: string | null;
};

export function ShopStorefrontComingSoon(props: ShopStorefrontComingSoonProps) {
  return (
    <Suspense fallback={<ShopStorefrontComingSoonFallback {...props} />}>
      <ShopStorefrontComingSoonInner {...props} />
    </Suspense>
  );
}

function ShopStorefrontComingSoonFallback({
  storeName,
  logoUrl,
  primaryHex,
}: ShopStorefrontComingSoonProps) {
  const primary = useMemo(() => parseHex(primaryHex), [primaryHex]);
  const heroSurfaces = heroStyleVars(primary);

  return (
    <div className="bg-[oklch(0.985_0.002_90)] dark:bg-background">
      <ComingSoonContent
        storeName={storeName}
        logoUrl={logoUrl}
        primary={primary}
        accent={null}
        heroSurfaces={heroSurfaces}
        ownerState="unknown"
        setupOpen={false}
        onSetupOpen={() => {}}
        loginHref={APP_ROUTES.login}
      />
    </div>
  );
}

function ShopStorefrontComingSoonInner({
  storeName,
  logoUrl,
  primaryHex,
  accentHex,
}: ShopStorefrontComingSoonProps) {
  const searchParams = useSearchParams();
  const [setupOpen, setSetupOpen] = useState(false);
  const [ownerState, setOwnerState] = useState<
    "unknown" | "guest" | "owner" | "other"
  >("unknown");
  const [loginNext, setLoginNext] = useState("/");

  const primary = useMemo(() => parseHex(primaryHex), [primaryHex]);
  const accent = useMemo(() => parseHex(accentHex), [accentHex]);

  const heroSurfaces = heroStyleVars(primary);

  const resolveOwner = useCallback(async () => {
    if (!getSessionTokens()) {
      setOwnerState("guest");
      return false;
    }
    try {
      const me = await fetchMe();
      const isOwner =
        (me.role?.key ?? "").trim().toLowerCase() === "owner";
      setOwnerState(isOwner ? "owner" : "other");
      return isOwner;
    } catch {
      setOwnerState("guest");
      return false;
    }
  }, []);

  useEffect(() => {
    setLoginNext(
      `${window.location.pathname}${window.location.search}`,
    );
    void (async () => {
      const isOwner = await resolveOwner();
      if (isOwner && searchParams.get("setup") === "storefront") {
        setSetupOpen(true);
      }
    })();
  }, [resolveOwner, searchParams]);

  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(
    `${loginNext}${loginNext.includes("?") ? "&" : "?"}setup=storefront`,
  )}`;

  return (
    <div className="bg-[oklch(0.985_0.002_90)] dark:bg-background">
      <ComingSoonContent
        storeName={storeName}
        logoUrl={logoUrl}
        primary={primary}
        accent={accent}
        heroSurfaces={heroSurfaces}
        ownerState={ownerState}
        setupOpen={setupOpen}
        onSetupOpen={setSetupOpen}
        loginHref={loginHref}
      />
    </div>
  );
}

function ComingSoonContent({
  storeName,
  logoUrl,
  primary,
  accent,
  heroSurfaces,
  ownerState,
  setupOpen,
  onSetupOpen,
  loginHref,
}: {
  storeName: string;
  logoUrl?: string | null;
  primary: string | null;
  accent: string | null;
  heroSurfaces: CSSProperties | undefined;
  ownerState: "unknown" | "guest" | "owner" | "other";
  setupOpen: boolean;
  onSetupOpen: (open: boolean) => void;
  loginHref: string;
}) {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-5 sm:px-6 sm:pb-24 sm:pt-6">
        <section
          className="relative overflow-hidden rounded-2xl border border-border/40 shadow-sm"
          style={heroSurfaces}
        >
          <ComingSoonHero
            storeName={storeName}
            logoUrl={logoUrl}
            ownerState={ownerState}
            accent={accent}
            onOpenSetup={() => onSetupOpen(true)}
            loginHref={loginHref}
          />
        </section>

        <TrustSection primary={primary} />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, sub }) => (
            <div
              key={title}
              className={cn(
                "rounded-xl border border-border/50 bg-card/80 p-5 shadow-sm backdrop-blur-sm",
                "transition-shadow hover:shadow-md",
              )}
            >
              <span
                className="inline-flex size-10 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: primary
                    ? `${primary}14`
                    : "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                  color: primary ?? "var(--color-primary)",
                }}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {sub}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 opacity-40 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-muted"
                style={
                  primary
                    ? {
                        background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 8%, #e5e7eb), #f3f4f6)`,
                      }
                    : undefined
                }
              />
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Our catalog will appear here once the shop is live.
          </p>
        </div>
      </div>

      <StorefrontSetupModal
        open={setupOpen}
        onOpenChange={onSetupOpen}
        primaryHex={primary}
      />
    </>
  );
}

function TrustSection({ primary }: { primary: string | null }) {
  return (
    <div className="mt-6">
      <ShopTrustStrip primaryHex={primary} />
    </div>
  );
}

function ComingSoonHero({
  storeName,
  logoUrl,
  ownerState,
  accent,
  onOpenSetup,
  loginHref,
}: {
  storeName: string;
  logoUrl?: string | null;
  ownerState: "unknown" | "guest" | "owner" | "other";
  accent: string | null;
  onOpenSetup: () => void;
  loginHref: string;
}) {
  return (
    <div className="relative min-h-[min(52vh,28rem)] bg-[var(--hero-bg,oklch(0.22_0.02_260))] px-6 py-12 sm:px-10 sm:py-16">
      <HeroGlow />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center text-white">
        {logoUrl ? (
          <div className="mb-6 flex h-16 w-40 items-center justify-center rounded-xl bg-white/10 p-3 backdrop-blur-sm">
            <Image
              src={logoUrl}
              alt={`${storeName} logo`}
              width={160}
              height={64}
              className="max-h-12 w-auto object-contain"
              unoptimized
            />
          </div>
        ) : (
          <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Store className="size-7" aria-hidden />
          </span>
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          Opening soon
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {storeName}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
          We&apos;re putting the finishing touches on our online shop. Check back
          soon for quality products, great prices, and easy ordering.
        </p>
        {ownerState === "owner" ? (
          <OwnerSetupCta accent={accent} onOpenSetup={onOpenSetup} />
        ) : ownerState === "guest" ? (
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-11 rounded-full bg-white/95 px-6 text-base text-foreground hover:bg-white"
            >
              <Link href={loginHref}>Owner? Sign in to set up</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OwnerSetupCta({
  accent,
  onOpenSetup,
}: {
  accent: string | null;
  onOpenSetup: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
      <Button
        type="button"
        size="lg"
        className="h-11 gap-2 rounded-full px-6 text-base shadow-lg"
        style={
          accent
            ? {
                backgroundColor: accent,
                borderColor: accent,
                color: "#fff",
              }
            : undefined
        }
        onClick={onOpenSetup}
      >
        <Sparkles className="size-4" aria-hidden />
        Open your online shop
        <ArrowRight className="size-4" aria-hidden />
      </Button>
      <p className="text-xs text-white/60">
        You&apos;re signed in as the owner — set up takes a minute.
      </p>
    </div>
  );
}

function HeroGlow() {
  return (
    <>
      <div
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--hero-glow, transparent) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20"
        aria-hidden
      />
    </>
  );
}

function heroStyleVars(primary: string | null): CSSProperties | undefined {
  if (!primary) {
    return undefined;
  }
  return {
    ["--hero-bg" as string]: `color-mix(in srgb, ${primary} 78%, #020617)`,
    ["--hero-glow" as string]: `${primary}30`,
  };
}

function parseHex(value?: string | null): string | null {
  const raw = value?.trim() ?? "";
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : null;
}
