"use client";

import Image from "next/image";
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
import { ArrowRight, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { StorefrontSetupModal } from "@/components/storefront/storefront-setup-modal";
import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
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
  },
  {
    num: "02",
    title: "Quality Guaranteed",
    desc: "Every product hand-selected. Not satisfied? We make it right, no questions.",
  },
  {
    num: "03",
    title: "M-Pesa Ready",
    desc: "Pay via M-Pesa, card, or cash on delivery. Checkout in under 60 seconds.",
  },
  {
    num: "04",
    title: "Best Prices",
    desc: "Everyday low prices on 1,000+ products. No hidden fees, ever.",
  },
] as const;

const CATEGORY_TEASERS = [
  { icon: "Fr", name: "Fresh Food", count: "200+ items" },
  { icon: "Bv", name: "Beverages", count: "150+ items" },
  { icon: "Cl", name: "Cleaning", count: "80+ items" },
  { icon: "Sk", name: "Snacks", count: "120+ items" },
  { icon: "Bb", name: "Baby & Kids", count: "60+ items" },
  { icon: "Pc", name: "Personal Care", count: "90+ items" },
  { icon: "Hm", name: "Home Goods", count: "70+ items" },
] as const;

const HERO_CELLS = [
  { icon: "Hm", name: "Fresh Groceries", price: "KSh 240–" },
  { icon: "Cl", name: "Cleaning Essentials", price: "KSh 180–" },
  { icon: "Bv", name: "Beverages", price: "KSh 80–" },
  { icon: "Sk", name: "Snacks & More", price: "KSh 50–" },
] as const;

const CELL_BG = ["#251f17", "#1e1a13", "#211d16", "#1a1610"] as const;

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
  const accent = useMemo(() => parseHex(accentHex) ?? "#c8963e", [accentHex]);
  const pageStyle = useMemo(
    (): CSSProperties => ({
      ["--cs-brand-accent" as string]: accent,
      ["--cs-brand-accent-light" as string]: lightenHex(accent, 0.22),
      ["--cs-brand-accent-pale" as string]: lightenHex(accent, 0.42),
    }),
    [accent],
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
      accent={accent}
      pageStyle={pageStyle}
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
  accent,
  pageStyle,
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
  accent: string;
  pageStyle: CSSProperties;
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
            entry.target.classList.add(styles.promiseItemVisible);
          }
        });
      },
      { threshold: 0.15 },
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
      style={pageStyle}
    >
      <nav
        className={cn(
          styles.nav,
          "fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-b border-[var(--cs-border-subtle)] bg-[rgba(250,247,242,0.85)] px-6 py-6 backdrop-blur-[20px] sm:px-12",
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
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={displayName}
              width={120}
              height={40}
              className="max-h-8 w-auto object-contain"
              unoptimized
            />
          ) : (
            displayName
          )}
        </a>
        <span className="rounded-full border border-[var(--cs-accent)] bg-[var(--cs-accent-pale)] px-3.5 py-1 text-[11px] font-normal uppercase tracking-[0.14em] text-[var(--cs-accent)]">
          Opening Soon
        </span>
      </nav>

      <section className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 pb-16 pt-32 sm:px-12 lg:px-12 lg:pb-20 lg:pl-12 lg:pt-36 xl:pl-12">
          <div className={cn(styles.heroEyebrow, "mb-8 flex items-center gap-3")}>
            <div className="h-px w-8 bg-[var(--cs-accent)]" />
            <span className="text-[11px] font-normal uppercase tracking-[0.18em] text-[var(--cs-accent)]">
              Nairobi&apos;s finest online mini-mart
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
            <em className="font-light not-italic text-[var(--cs-accent)]">worth</em>
            <br />
            waiting for.
          </h1>

          <p
            className={cn(
              styles.serif,
              styles.heroSubtitle,
              "mb-10 text-[clamp(36px,4vw,58px)] font-light leading-none tracking-[-0.01em] text-[var(--cs-warm-gray)]",
            )}
          >
            Launching soon.
          </p>

          <p
            className={cn(
              styles.heroDesc,
              "mb-12 max-w-[400px] text-[15px] font-light leading-[1.7] text-[var(--cs-warm-gray)]",
            )}
          >
            Quality essentials. Everyday groceries. Premium home goods. All
            curated, all delivered — right to your door across Nairobi.
          </p>

          <div className={cn(styles.heroActions, "flex flex-wrap items-center gap-4")}>
            {ownerState === "owner" ? (
              <button
                type="button"
                className={cn(
                  styles.btnPrimary,
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 bg-[var(--cs-charcoal)] px-8 py-4 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--cs-cream)] transition-colors",
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
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 bg-[var(--cs-charcoal)] px-8 py-4 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--cs-cream)] no-underline transition-colors",
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
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 bg-[var(--cs-charcoal)] px-8 py-4 text-[13px] font-normal uppercase tracking-[0.08em] text-[var(--cs-cream)]",
                )}
                onClick={() => scrollTo("notify")}
              >
                <span className="relative z-[1]">Notify me first</span>
                <ArrowRight className="relative z-[1] size-3.5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-normal tracking-[0.06em] text-[var(--cs-charcoal)] transition-colors hover:text-[var(--cs-accent)]"
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
            <LaunchCountdown countdown={countdown} />
          </div>
        </div>

        <HeroVisualPanel />
      </section>

      <div className="mx-12 h-px bg-[var(--cs-border-subtle)]" />

      <section id="discover" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-12">
        <p className="mb-12 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--cs-accent)]">
          Why {firstWord}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p, i) => (
            <div
              key={p.num}
              ref={(el) => {
                promiseRefs.current[i] = el;
              }}
              className={cn(
                styles.promiseItem,
                "border-b border-[var(--cs-border-subtle)] px-6 py-10 transition-colors hover:bg-[var(--cs-cream)] sm:border-b-0 sm:border-r sm:py-10 last:sm:border-r-0",
              )}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <p
                className={cn(
                  styles.serif,
                  "mb-5 text-[13px] font-light tracking-[0.1em] text-[var(--cs-accent)]",
                )}
              >
                {p.num}
              </p>
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

      <div className="mx-12 h-px bg-[var(--cs-border-subtle)]" />

      <CategoriesTeaser />

      <section
        id="notify"
        className="relative overflow-hidden bg-[var(--cs-charcoal)] px-6 py-20 sm:px-12"
      >
        <p
          className={cn(
            styles.serif,
            "pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[clamp(80px,14vw,180px)] font-light tracking-[-0.04em] text-[rgba(200,150,62,0.04)]",
          )}
          aria-hidden
        >
          {firstWord}
        </p>
        <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[var(--cs-accent)]">
              {ownerState === "owner" ? "Ready to launch" : "Be first in line"}
            </p>
            <h2
              className={cn(
                styles.serif,
                "mb-4 text-[42px] font-light leading-[1.1] text-[var(--cs-cream)]",
              )}
            >
              {ownerState === "owner" ? (
                <>
                  Go live
                  <br />
                  <em className="font-normal italic text-[var(--cs-accent-light)]">
                    today.
                  </em>
                </>
              ) : (
                <>
                  Early access.
                  <br />
                  <em className="font-normal italic text-[var(--cs-accent-light)]">
                    Exclusive offers.
                  </em>
                </>
              )}
            </h2>
            <p className="text-sm font-light leading-[1.7] text-[rgba(245,240,232,0.5)]">
              {ownerState === "owner"
                ? "Choose your branch location and enable your public catalog. Shoppers will see stock and prices from that branch."
                : "Join our waitlist and be the first to shop when we launch. Early subscribers get 15% off their first order."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {ownerState === "owner" ? (
              <button
                type="button"
                className="w-full border-0 bg-[var(--cs-accent)] px-7 py-4 text-xs font-medium uppercase tracking-[0.1em] text-[var(--cs-charcoal)] transition-colors hover:bg-[var(--cs-accent-light)]"
                onClick={() => onSetupOpen(true)}
              >
                Set up storefront
              </button>
            ) : ownerState === "guest" ? (
              <Link
                href={loginHref}
                className="block w-full bg-[var(--cs-accent)] px-7 py-4 text-center text-xs font-medium uppercase tracking-[0.1em] text-[var(--cs-charcoal)] no-underline transition-colors hover:bg-[var(--cs-accent-light)]"
              >
                Owner sign in to set up
              </Link>
            ) : emailDone ? (
              <div className="flex items-center gap-2.5 border border-[var(--cs-accent)] bg-[rgba(200,150,62,0.1)] px-5 py-4 text-[13px] font-light tracking-[0.04em] text-[var(--cs-accent-light)]">
                <Check className="size-4 shrink-0" aria-hidden />
                You&apos;re on the list! We&apos;ll notify you before launch.
              </div>
            ) : (
              <>
                <div className="flex border border-[rgba(245,240,232,0.2)] transition-colors focus-within:border-[var(--cs-accent)]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="Your email address"
                    className="min-w-0 flex-1 border-0 bg-transparent px-5 py-4 text-sm font-light tracking-[0.02em] text-[var(--cs-cream)] outline-none placeholder:text-[rgba(245,240,232,0.3)]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onNotify();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 border-0 bg-[var(--cs-accent)] px-7 py-4 text-xs font-medium uppercase tracking-[0.1em] text-[var(--cs-charcoal)] transition-colors hover:bg-[var(--cs-accent-light)]"
                    onClick={onNotify}
                  >
                    Notify Me
                  </button>
                </div>
                <p className="text-[11px] tracking-[0.02em] text-[rgba(245,240,232,0.3)]">
                  No spam. Unsubscribe anytime. We respect your inbox.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-6 border-t border-[rgba(245,240,232,0.06)] bg-[var(--cs-charcoal)] px-6 py-12 sm:flex-row sm:px-12">
        <div
          className={cn(
            styles.serif,
            "text-2xl font-light tracking-[0.04em] text-[var(--cs-cream)]",
          )}
        >
          {displayName}
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {["About", "Contact", "Privacy"].map((label) => (
            <span
              key={label}
              className="cursor-default text-xs uppercase tracking-[0.08em] text-[rgba(245,240,232,0.35)]"
            >
              {label}
            </span>
          ))}
        </div>
        <p className="text-[11px] tracking-[0.04em] text-[rgba(245,240,232,0.2)]">
          © {new Date().getFullYear()} {displayName}. Nairobi, Kenya.
        </p>
      </footer>

      <StorefrontSetupModal
        open={setupOpen}
        onOpenChange={onSetupOpen}
        primaryHex={accent}
      />
    </div>
  );
}

function HeroVisualPanel() {
  return (
    <div className="relative min-h-[min(420px,50vh)] bg-[var(--cs-charcoal)] lg:min-h-full">
      <HeroDecoCircles />
      <div
        className={cn(
          styles.visualGrid,
          "absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5",
        )}
      >
        {HERO_CELLS.map((cell, i) => (
          <div
            key={cell.name}
            className="relative flex items-center justify-center overflow-hidden"
            style={{ background: CELL_BG[i] }}
          >
            <span
              className={cn(
                styles.serif,
                "text-5xl italic text-[var(--cs-accent-light)] opacity-15",
              )}
            >
              {cell.icon}
            </span>
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
            className={cn(
              styles.tagDot,
              "size-2 shrink-0 rounded-full bg-[#4CAF50]",
            )}
          />
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
        className="pointer-events-none absolute -right-24 -top-24 size-[400px] rounded-full border border-[rgba(200,150,62,0.15)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-20 left-8 size-[220px] rounded-full border border-[rgba(200,150,62,0.15)]"
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
    <div className="absolute inset-x-5 bottom-5">
      <p className="text-[11px] font-light uppercase tracking-[0.1em] text-white/40">
        {cell.name}
      </p>
      <p
        className={cn(
          styles.serif,
          "mt-0.5 text-xl font-light text-[var(--cs-accent-light)]",
        )}
      >
        {cell.price}
      </p>
    </div>
  );
}

function LaunchCountdown({
  countdown,
}: {
  countdown: { days: string; hours: string; mins: string; secs: string };
}) {
  const units = [
    { value: countdown.days, label: "Days" },
    { value: countdown.hours, label: "Hours" },
    { value: countdown.mins, label: "Min" },
    { value: countdown.secs, label: "Sec" },
  ];
  return (
    <div className="flex">
      {units.map((u, i) => (
        <div
          key={u.label}
          className={cn(
            "pr-7 text-center",
            i < units.length - 1 &&
              "mr-7 border-r border-[var(--cs-border-subtle)]",
          )}
        >
          <span
            className={cn(
              styles.serif,
              "block min-w-[52px] text-[42px] font-light leading-none text-[var(--cs-charcoal)]",
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

function CategoriesTeaser() {
  const strip = [...CATEGORY_TEASERS, ...CATEGORY_TEASERS];
  return (
    <section className="overflow-hidden pb-20 pt-20">
      <div className="mx-auto mb-10 flex max-w-[1200px] flex-wrap items-baseline justify-between gap-4 px-6 sm:px-12">
        <h2
          className={cn(
            styles.serif,
            "text-[36px] font-light text-[var(--cs-charcoal)]",
          )}
        >
          Browse what&apos;s <em className="italic text-[var(--cs-accent)]">coming</em>
        </h2>
        <span className="text-xs tracking-[0.05em] text-[var(--cs-warm-gray)]">
          Hover to pause ↔
        </span>
      </div>
      <div className="overflow-hidden px-6 sm:px-12">
        <div className={cn(styles.categoriesStrip, "flex gap-4")}>
          {strip.map((cat, i) => (
            <div
              key={`${cat.name}-${i}`}
              className={cn(
                styles.catCard,
                "relative flex h-[220px] w-[200px] shrink-0 cursor-default flex-col justify-end overflow-hidden border border-[var(--cs-border-subtle)] bg-[var(--cs-cream)] p-5",
              )}
            >
              <span
                className={cn(
                  styles.serif,
                  styles.catIcon,
                  "relative z-[1] mb-2 text-[40px] font-light italic leading-none text-[var(--cs-accent)] transition-colors",
                )}
              >
                {cat.icon}
              </span>
              <span
                className={cn(
                  styles.catName,
                  "relative z-[1] text-[13px] font-normal uppercase tracking-[0.06em] text-[var(--cs-charcoal)] transition-colors",
                )}
              >
                {cat.name}
              </span>
              <span
                className={cn(
                  styles.catCount,
                  "relative z-[1] mt-0.5 text-[11px] text-[var(--cs-warm-gray)] transition-colors",
                )}
              >
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function parseHex(value?: string | null): string | null {
  const raw = value?.trim() ?? "";
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : null;
}

function lightenHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) =>
    Math.min(255, Math.round(c + (255 - c) * amount));
  return `#${[mix(r), mix(g), mix(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}
