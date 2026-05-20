"use client";

import Image from "next/image";

import { TenantMonogramLockup } from "@/components/brand/tenant-monogram";
import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Cormorant_Garamond } from "next/font/google";
import {
  ArrowRight,
  Check,
  CreditCard,
  Package,
  Shield,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { StorefrontSetupModal } from "@/components/storefront/storefront-setup-modal";
import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { buildComingSoonTheme, type ComingSoonTheme } from "@/lib/coming-soon-theme";
import { APP_ROUTES } from "@/lib/config";
import { getSessionTokens } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { cn } from "@/lib/utils";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const PROMISES = [
  {
    num: "01",
    title: "Fast Delivery",
    desc: "Same-day dispatch across Nairobi. Order before 2pm, receive before evening.",
    Icon: Truck,
  },
  {
    num: "02",
    title: "Quality Guaranteed",
    desc: "Every product hand-selected. Not satisfied? We make it right, no questions.",
    Icon: Shield,
  },
  {
    num: "03",
    title: "M-Pesa Ready",
    desc: "Pay via M-Pesa, card, or cash on delivery. Checkout in under 60 seconds.",
    Icon: CreditCard,
  },
  {
    num: "04",
    title: "Best Prices",
    desc: "Everyday low prices on 1,000+ products. No hidden fees, ever.",
    Icon: Zap,
  },
] as const;

const CATEGORY_TEASERS = [
  {
    name: "Fresh Food",
    count: "200+ items",
    image: "/hello/fudowakira0-paprika-638654_1920.jpg",
  },
  {
    name: "Daily Essentials",
    count: "180+ items",
    image: "/hello/contaminazionivisive-bag-8319466.jpg",
  },
  {
    name: "Snacks & Aisles",
    count: "120+ items",
    image: "/hello/27707-supermarket-949912.jpg",
  },
  {
    name: "Nuts & Pantry",
    count: "90+ items",
    image: "/hello/publicdomainpictures-almonds-21502.jpg",
  },
  {
    name: "Fresh Produce",
    count: "150+ items",
    image: "/hello/fudowakira0-paprika-638654_1920.jpg",
  },
  {
    name: "Household",
    count: "80+ items",
    image: "/hello/contaminazionivisive-bag-8319466.jpg",
  },
  {
    name: "Pantry Staples",
    count: "70+ items",
    image: "/hello/publicdomainpictures-almonds-21502.jpg",
  },
] as const;

const MARQUEE_PERKS = [
  "Same-day delivery",
  "M-Pesa checkout",
  "Curated essentials",
  "No hidden fees",
  "Owner-built storefront",
  "Launching soon",
] as const;

const HERO_CELLS = [
  {
    name: "Fresh Groceries",
    price: "KSh 240–",
    image: "/hello/fudowakira0-paprika-638654_1920.jpg",
    imageAlt: "Fresh paprika and produce",
  },
  {
    name: "Daily Essentials",
    price: "KSh 180–",
    image: "/hello/contaminazionivisive-bag-8319466.jpg",
    imageAlt: "Shopping bag with everyday essentials",
  },
  {
    name: "Snacks & More",
    price: "KSh 80–",
    image: "/hello/27707-supermarket-949912.jpg",
    imageAlt: "Supermarket aisles with snacks and packaged goods",
  },
  {
    name: "Nuts & Pantry",
    price: "KSh 50–",
    image: "/hello/publicdomainpictures-almonds-21502.jpg",
    imageAlt: "Almonds and dry pantry goods",
  },
] as const;

export type ShopStorefrontComingSoonProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  accentHex?: string | null;
};

export function ShopStorefrontComingSoon(props: ShopStorefrontComingSoonProps) {
  return (
    <Suspense fallback={<ComingSoonPage {...props} ownerState="unknown" setupOpen={false} onSetupOpen={() => {}} loginHref={APP_ROUTES.login} />}>
      <ShopStorefrontComingSoonInner {...props} />
    </Suspense>
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
    <ComingSoonPage
      storeName={storeName}
      logoUrl={logoUrl}
      primaryHex={primaryHex}
      accentHex={accentHex}
      ownerState={ownerState}
      setupOpen={setupOpen}
      onSetupOpen={setSetupOpen}
      loginHref={loginHref}
    />
  );
}

function ComingSoonPage({
  storeName,
  logoUrl,
  primaryHex,
  accentHex,
  ownerState,
  setupOpen,
  onSetupOpen,
  loginHref,
}: ShopStorefrontComingSoonProps & {
  ownerState: "unknown" | "guest" | "owner" | "other";
  setupOpen: boolean;
  onSetupOpen: (open: boolean) => void;
  loginHref: string;
}) {
  const theme = useMemo(
    () => buildComingSoonTheme(primaryHex, accentHex),
    [primaryHex, accentHex],
  );

  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [countdown, setCountdown] = useState({
    days: "21",
    hours: "00",
    mins: "00",
    secs: "00",
  });

  const launchTarget = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 21);
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = launchTarget.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({
          days: "00",
          hours: "00",
          mins: "00",
          secs: "00",
        });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown({
        days: pad(days),
        hours: pad(hours),
        mins: pad(mins),
        secs: pad(secs),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [launchTarget]);

  const onNotify = () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      return;
    }
    setEmailDone(true);
  };

  const displayName = storeName.trim() || "Our shop";
  const firstWord = displayName.split(/\s+/)[0] ?? displayName;

  return (
    <ComingSoonPageBody
      storeName={storeName}
      logoUrl={logoUrl}
      theme={theme}
      ownerState={ownerState}
      setupOpen={setupOpen}
      onSetupOpen={onSetupOpen}
      loginHref={loginHref}
      email={email}
      emailDone={emailDone}
      countdown={countdown}
      displayName={displayName}
      firstWord={firstWord}
      onEmailChange={setEmail}
      onNotify={onNotify}
    />
  );
}

function ComingSoonPageBody({
  storeName,
  logoUrl,
  theme,
  ownerState,
  setupOpen,
  onSetupOpen,
  loginHref,
  email,
  emailDone,
  countdown,
  displayName,
  firstWord,
  onEmailChange,
  onNotify,
}: {
  storeName: string;
  logoUrl?: string | null;
  theme: ComingSoonTheme;
  ownerState: "unknown" | "guest" | "owner" | "other";
  setupOpen: boolean;
  onSetupOpen: (open: boolean) => void;
  loginHref: string;
  email: string;
  emailDone: boolean;
  countdown: { days: string; hours: string; mins: string; secs: string };
  displayName: string;
  firstWord: string;
  onEmailChange: (v: string) => void;
  onNotify: () => void;
}) {
  const promiseRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.promiseCardVisible);
          }
        });
      },
      { threshold: 0.12 },
    );
    promiseRefs.current.forEach((el) => {
      if (el) {
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div
      className={cn(cormorant.variable, styles.page)}
      style={theme.cssVars as CSSProperties}
    >
      <nav
        className={cn(
          styles.nav,
          "fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b border-[var(--cs-border)] bg-[color-mix(in_srgb,var(--cs-warm-white)_88%,transparent)] px-6 py-5 backdrop-blur-[20px] sm:px-12",
        )}
      >
        <a
          href="#"
          className={cn(styles.serif, "text-[22px] font-medium tracking-[0.04em] text-[var(--cs-charcoal)] no-underline")}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          {logoUrl?.trim() ? (
            <Image
              src={logoUrl}
              alt={displayName}
              width={120}
              height={40}
              className="max-h-8 w-auto object-contain"
              unoptimized
            />
          ) : (
            <TenantMonogramLockup
              brand={displayName}
              primaryColor={theme.primary}
              size="sm"
              showTagline={false}
            />
          )}
        </a>
        <span
          className="rounded-full border px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{
            borderColor: `color-mix(in srgb, ${theme.primary} 28%, transparent)`,
            backgroundColor: theme.accentPale,
            color: theme.primaryDeep,
          }}
        >
          Opening Soon
        </span>
      </nav>

      <MarqueeRibbon storeName={displayName} theme={theme} />

      <section className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div
          className={cn(
            styles.heroPanel,
            styles.heroGlow,
            "relative flex flex-col justify-center px-6 pb-16 pt-28 sm:px-12 lg:px-12 lg:pb-20 lg:pl-12 lg:pt-32 xl:pl-12",
          )}
        >
          <div className={cn(styles.heroEyebrow, "mb-8 flex items-center gap-3")}>
            <div
              className="h-px w-8 shrink-0"
              style={{ backgroundColor: theme.primary }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cs-warm-gray)]">
              {displayName} · opening soon
            </span>
          </div>

          <h1
            className={cn(
              styles.serif,
              styles.heroTitle,
              "mb-3 text-[clamp(52px,6vw,88px)] font-light leading-[0.95] tracking-[-0.02em] text-[var(--cs-charcoal)]",
            )}
          >
            Something
            <br />
            <em
              className="font-light not-italic"
              style={{ color: theme.primary }}
            >
              worth
            </em>
            <br />
            waiting for.
          </h1>

          <p
            className={cn(
              styles.serif,
              styles.heroSubtitle,
              "mb-6 text-[clamp(28px,3.2vw,48px)] font-light leading-[1.05] tracking-[-0.01em] text-[var(--cs-charcoal)]",
            )}
          >
            <span className="opacity-75">{displayName}</span>
            <span className="mx-2 opacity-30">·</span>
            <em className="not-italic" style={{ color: theme.primary }}>
              launching soon
            </em>
          </p>

          <p
            className={cn(
              styles.heroDesc,
              "mb-8 max-w-[420px] text-[15px] font-light leading-[1.75] text-[var(--cs-warm-gray)]",
            )}
          >
            Your neighbourhood mini-mart, online — fresh groceries, pantry
            staples, and everyday essentials delivered with care.
          </p>

          <HeroChips theme={theme} />

          <div className={cn(styles.heroActions, "mt-10 flex flex-wrap items-center gap-4")}>
            {ownerState === "owner" ? (
              <button
                type="button"
                className={cn(
                  styles.btnPrimary,
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 px-8 py-4 text-[13px] font-medium uppercase tracking-[0.08em] transition-colors",
                )}
                onClick={() => onSetupOpen(true)}
              >
                <span className="relative z-[1]">Open your online shop</span>
                <ArrowRight className="relative z-[1] size-3.5" aria-hidden />
              </button>
            ) : ownerState === "guest" ? (
              <Link
                href={loginHref}
                className={cn(
                  styles.btnPrimary,
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 px-8 py-4 text-[13px] font-medium uppercase tracking-[0.08em] no-underline transition-colors",
                )}
              >
                <span className="relative z-[1]">Owner sign in</span>
                <ArrowRight className="relative z-[1] size-3.5" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                className={cn(
                  styles.btnPrimary,
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 px-8 py-4 text-[13px] font-medium uppercase tracking-[0.08em]",
                )}
                onClick={() => scrollTo("notify")}
              >
                <span className="relative z-[1]">Notify me first</span>
                <ArrowRight className="relative z-[1] size-3.5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              className={cn(
                styles.btnGhost,
                "inline-flex items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-normal tracking-[0.06em] transition-colors",
              )}
              onClick={() => scrollTo("discover")}
            >
              What to expect
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {ownerState === "owner" ? (
            <p className="mt-4 text-xs text-[var(--cs-warm-gray)]">
              You&apos;re signed in as the owner — launch your catalog in under a minute.
            </p>
          ) : null}

          <div className={cn(styles.heroCountdown, "mt-14")}>
            <p className="mb-4 text-[10px] font-normal uppercase tracking-[0.2em] text-[var(--cs-warm-gray)]">
              Days until launch
            </p>
            <LaunchCountdown countdown={countdown} theme={theme} />
          </div>
        </div>

        <HeroVisualPanel theme={theme} />
      </section>

      <div className={cn(styles.sectionRule, "mx-6 sm:mx-12")} aria-hidden />

      <section id="discover" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-12">
        <div className="mb-14 text-center">
          <p
            className="mb-3 inline-flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: theme.primary }}
          >
            <Sparkles className="size-3" aria-hidden />
            The {firstWord} promise
          </p>
          <h2
            className={cn(
              styles.serif,
              "text-[clamp(32px,4vw,44px)] font-light leading-tight text-[var(--cs-charcoal)]",
            )}
          >
            Built for how you{" "}
            <em className="italic" style={{ color: theme.primary }}>
              actually shop
            </em>
          </h2>
        </div>
        <div
          className={cn(
            styles.promiseGrid,
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {PROMISES.map((p, i) => (
            <div
              key={p.num}
              ref={(el) => {
                promiseRefs.current[i] = el;
              }}
              className={cn(styles.promiseCard, "p-7 sm:p-8")}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {(() => {
                const Icon = PROMISES[i].Icon;
                return (
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        styles.promiseIcon,
                        "inline-flex size-10 items-center justify-center rounded-xl",
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span
                      className={cn(
                        styles.serif,
                        "text-[12px] font-light tracking-[0.12em]",
                      )}
                      style={{ color: theme.primary }}
                    >
                      {p.num}
                    </span>
                  </div>
                );
              })()}
              <h3
                className={cn(
                  styles.serif,
                  "mb-2.5 text-[22px] font-normal leading-tight text-[var(--cs-charcoal)]",
                )}
              >
                {p.title}
              </h3>
              <p className="text-[13px] font-light leading-[1.65] text-[var(--cs-warm-gray)]">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={cn(styles.sectionRule, "mx-6 sm:mx-12")} aria-hidden />

      <CategoriesTeaser theme={theme} />

      <section
        id="notify"
        className={cn(styles.notifySection, "relative overflow-hidden px-6 py-20 sm:px-12")}
      >
        <div className={cn(styles.notifyGlow, "pointer-events-none absolute inset-0")} aria-hidden />
        <p
          className={cn(
            styles.serif,
            styles.notifyWatermark,
            "pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[clamp(80px,14vw,180px)] font-light tracking-[-0.04em]",
          )}
          aria-hidden
        >
          {firstWord}
        </p>
        <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p
              className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cs-accent-light)]"
            >
              {ownerState === "owner" ? "Ready to launch" : "Be first in line"}
            </p>
            <h2
              className={cn(
                styles.serif,
                "mb-4 text-[42px] font-light leading-[1.1] text-[var(--cs-on-dark)]",
              )}
            >
              {ownerState === "owner" ? (
                <>
                  Go live
                  <br />
                  <em
                    className="font-normal italic"
                    style={{ color: theme.accentLight }}
                  >
                    today.
                  </em>
                </>
              ) : (
                <>
                  Early access.
                  <br />
                  <em
                    className="font-normal italic"
                    style={{ color: theme.accentLight }}
                  >
                    Exclusive offers.
                  </em>
                </>
              )}
            </h2>
            <p className="text-sm font-light leading-[1.7] text-[var(--cs-on-dark-muted)]">
              {ownerState === "owner"
                ? "Choose your branch location and enable your public catalog. Shoppers will see stock and prices from that branch."
                : "Join our waitlist and be the first to shop when we launch. Early subscribers get 15% off their first order."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {ownerState === "owner" ? (
              <button
                type="button"
                className="w-full border-0 px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors hover:brightness-110"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.onPrimary,
                }}
                onClick={() => onSetupOpen(true)}
              >
                Set up storefront
              </button>
            ) : ownerState === "guest" ? (
              <Link
                href={loginHref}
                className="block w-full px-7 py-4 text-center text-xs font-semibold uppercase tracking-[0.1em] no-underline transition-colors hover:brightness-110"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.onPrimary,
                }}
              >
                Owner sign in to set up
              </Link>
            ) : emailDone ? (
              <div
                className="flex items-center gap-2.5 border px-5 py-4 text-[13px] font-light tracking-[0.04em]"
                style={{
                  borderColor: `color-mix(in srgb, ${theme.primary} 45%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${theme.primary} 14%, transparent)`,
                  color: theme.accentLight,
                }}
              >
                <Check className="size-4 shrink-0" aria-hidden />
                You&apos;re on the list! We&apos;ll notify you before launch.
              </div>
            ) : (
              <>
                <div
                  className="flex border border-[color-mix(in_srgb,var(--cs-on-dark)_22%,transparent)] transition-colors focus-within:border-[var(--cs-primary)]"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="Your email address"
                    className="min-w-0 flex-1 border-0 bg-transparent px-5 py-4 text-sm font-light tracking-[0.02em] text-[var(--cs-on-dark)] outline-none placeholder:text-[var(--cs-on-dark-muted)]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onNotify();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 border-0 px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors hover:brightness-110"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.onPrimary,
                    }}
                    onClick={onNotify}
                  >
                    Notify Me
                  </button>
                </div>
                <p className="text-[11px] tracking-[0.02em] text-[var(--cs-on-dark-muted)]">
                  No spam. Unsubscribe anytime. We respect your inbox.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <footer
        className={cn(
          styles.notifySection,
          "flex flex-col items-center justify-between gap-6 border-t border-[color-mix(in_srgb,var(--cs-on-dark)_8%,transparent)] px-6 py-12 sm:flex-row sm:px-12",
        )}
      >
        <div
          className={cn(
            styles.serif,
            "text-2xl font-light tracking-[0.04em] text-[var(--cs-on-dark)]",
          )}
        >
          {displayName}
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {["About", "Contact", "Privacy"].map((label) => (
            <span
              key={label}
              className="cursor-default text-xs uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--cs-on-dark)_38%,transparent)]"
            >
              {label}
            </span>
          ))}
        </div>
        <p className="text-[11px] tracking-[0.04em] text-[color-mix(in_srgb,var(--cs-on-dark)_22%,transparent)]">
          © {new Date().getFullYear()} {displayName}. Nairobi, Kenya.
        </p>
      </footer>

      <StorefrontSetupModal
        open={setupOpen}
        onOpenChange={onSetupOpen}
        primaryHex={theme.primary}
      />
    </div>
  );
}

function HeroVisualPanel({ theme }: { theme: ComingSoonTheme }) {
  return (
    <div
      className={cn(styles.heroVisual, "relative min-h-[min(420px,50vh)] lg:min-h-full")}
    >
      <HeroDecoCircles />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 80% 20%, color-mix(in srgb, ${theme.primary} 28%, transparent), transparent 55%)`,
        }}
        aria-hidden
      />
      <div
        className={cn(
          styles.visualGrid,
          "absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-black/25",
        )}
      >
        {HERO_CELLS.map((cell, index) => (
          <div
            key={cell.name}
            className={cn(styles.heroCell, "group relative overflow-hidden")}
            style={{ background: theme.darkBgMid }}
          >
            <span
              className={cn(
                styles.heroCellIndex,
                styles.serif,
                "pointer-events-none absolute left-4 top-4 z-[3] text-[11px] font-light tracking-[0.14em]",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <Image
              src={cell.image}
              alt={cell.imageAlt}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              priority
            />
            <div
              className={cn(styles.heroCellOverlay, "absolute inset-0")}
              aria-hidden
            />
            <HeroCellLabel cell={cell} />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-8 sm:p-12">
        <div
          className={cn(
            styles.floatingTag,
            "pointer-events-auto relative left-0 flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 bg-[var(--cs-warm-white)] px-6 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:-left-6",
          )}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${theme.primary} 14%, white)`,
              color: theme.primaryDeep,
            }}
          >
            <Truck className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-xs tracking-[0.02em] text-[var(--cs-charcoal)]">
            <strong className="mb-0.5 block text-[13px] font-medium">
              Same-day delivery
            </strong>
            Available across Nairobi
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroDecoCircles() {
  return (
    <>
      <div
        className={cn(
          styles.decoRing,
          "pointer-events-none absolute -right-24 -top-24 size-[400px] rounded-full border",
        )}
        aria-hidden
      />
      <div
        className={cn(
          styles.decoRing,
          "pointer-events-none absolute bottom-20 left-8 size-[220px] rounded-full border",
        )}
        aria-hidden
      />
    </>
  );
}

function HeroCellLabel({
  cell,
}: {
  cell: (typeof HERO_CELLS)[number];
}) {
  return (
    <div className={cn(styles.heroCellLabel, "absolute inset-x-5 bottom-5")}>
      <p
        className={cn(
          styles.heroCellLabelMuted,
          "text-[11px] font-medium uppercase tracking-[0.1em]",
        )}
      >
        {cell.name}
      </p>
      <p
        className={cn(
          styles.serif,
          styles.heroCellPrice,
          "mt-0.5 text-xl font-light",
        )}
      >
        {cell.price}
      </p>
    </div>
  );
}

function MarqueeRibbon({
  storeName,
  theme,
}: {
  storeName: string;
  theme: ComingSoonTheme;
}) {
  const loop = [
    ...MARQUEE_PERKS,
    storeName,
    ...MARQUEE_PERKS,
    ...MARQUEE_PERKS,
    storeName,
    ...MARQUEE_PERKS,
  ];
  return (
    <div
      className="overflow-hidden border-b py-2.5"
      style={{
        borderColor: `color-mix(in srgb, ${theme.primary} 18%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${theme.primary} 6%, var(--cs-warm-white))`,
      }}
    >
      <div className={cn(styles.marqueeTrack, "flex")}>
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={cn(
              styles.marqueeItem,
              "shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cs-warm-gray)]",
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroChips({ theme }: { theme: ComingSoonTheme }) {
  const chips = [
    { label: "Same-day delivery", Icon: Truck },
    { label: "M-Pesa ready", Icon: CreditCard },
    { label: "1,000+ SKUs", Icon: Package },
  ] as const;
  return (
    <div className={cn(styles.heroChips, "flex flex-wrap gap-2")}>
      {chips.map(({ label, Icon }) => (
        <span
          key={label}
          className={cn(
            styles.heroChip,
            "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-medium tracking-[0.04em] text-[var(--cs-charcoal)]",
          )}
        >
          <Icon
            className="size-3.5 shrink-0"
            style={{ color: theme.primary }}
            strokeWidth={1.75}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
}

function LaunchCountdown({
  countdown,
  theme,
}: {
  countdown: { days: string; hours: string; mins: string; secs: string };
  theme: ComingSoonTheme;
}) {
  const units = [
    { value: countdown.days, label: "Days" },
    { value: countdown.hours, label: "Hours" },
    { value: countdown.mins, label: "Min" },
    { value: countdown.secs, label: "Sec" },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {units.map((u, i) => (
        <div
          key={u.label}
          className={cn(
            styles.countdownUnit,
            "min-w-[4.5rem] rounded-xl px-4 py-3 text-center",
          )}
          style={
            i === 3
              ? {
                  boxShadow: `0 0 0 1px color-mix(in srgb, ${theme.primary} 35%, transparent)`,
                }
              : undefined
          }
        >
          <span
            className={cn(
              styles.serif,
              styles.countdownValue,
              "block text-[36px] font-light leading-none sm:text-[42px]",
            )}
          >
            {u.value}
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--cs-warm-gray)]">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoriesTeaser({ theme }: { theme: ComingSoonTheme }) {
  const strip = [...CATEGORY_TEASERS, ...CATEGORY_TEASERS];
  return (
    <section className="overflow-hidden pb-20 pt-16">
      <div className="mx-auto mb-10 max-w-[1200px] px-6 sm:px-12">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.primary }}>
          A taste of the aisles
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={cn(styles.serif, "text-[clamp(28px,3.5vw,40px)] font-light text-[var(--cs-charcoal)]")}>
            Browse what&apos;s <em className="italic" style={{ color: theme.primary }}>coming</em>
          </h2>
          <span className="text-xs tracking-[0.05em] text-[var(--cs-warm-gray)]">Hover to pause</span>
        </div>
      </div>
      <div className="overflow-hidden px-6 sm:px-12">
        <div className={cn(styles.categoriesStrip, "flex gap-4")}>
          {strip.map((cat, i) => (
            <div
              key={`${cat.name}-${i}`}
              className={cn(
                styles.catCard,
                "relative h-[240px] w-[210px] shrink-0 cursor-default overflow-hidden rounded-2xl border border-[var(--cs-border-subtle)]",
              )}
            >
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                sizes="210px"
                className={cn(styles.catCardImage, "object-cover")}
                unoptimized
              />
              <div
                className={cn(styles.catCardOverlay, "absolute inset-0")}
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 z-[2] p-5">
                <span className="block text-[13px] font-semibold uppercase tracking-[0.06em] text-white">
                  {cat.name}
                </span>
                <span className="mt-1 block text-[11px] text-white/75">
                  {cat.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

