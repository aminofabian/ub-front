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
import {
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { TenantMonogramLockup } from "@/components/brand/tenant-monogram";
import { cormorant } from "@/app/fonts/cormorant";
import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { LandingAccountAction } from "@/components/storefront/templates/landing/shared";
import { buildComingSoonTheme, type ComingSoonTheme } from "@/lib/coming-soon-theme";
import type {
  ComingSoonChip,
  ComingSoonEditorialContent,
  ComingSoonHeroCell,
  ComingSoonTeaser,
} from "@/lib/coming-soon-editorial";
import { APP_ROUTES } from "@/lib/config";
import { hasAccessSession } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { cn } from "@/lib/utils";

const CHIP_ICON = {
  products: Package,
  place: MapPin,
  hours: Clock,
  pay: CreditCard,
  delivery: Truck,
} as const;

export type ShopStorefrontComingSoonProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  accentHex?: string | null;
  content: ComingSoonEditorialContent;
};

export function ShopStorefrontComingSoon(props: ShopStorefrontComingSoonProps) {
  return (
    <Suspense
      fallback={
        <ComingSoonPage
          {...props}
          ownerState="unknown"
          ownerHubHref={APP_ROUTES.business}
          loginHref={APP_ROUTES.staffLogin}
        />
      }
    >
      <ShopStorefrontComingSoonInner {...props} />
    </Suspense>
  );
}

function ShopStorefrontComingSoonInner({
  storeName,
  logoUrl,
  primaryHex,
  accentHex,
  content,
}: ShopStorefrontComingSoonProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ownerState, setOwnerState] = useState<
    "unknown" | "guest" | "owner" | "other"
  >("unknown");

  const ownerHubHref = APP_ROUTES.business;
  const loginHref = `${APP_ROUTES.staffLogin}?mode=office&next=${encodeURIComponent(ownerHubHref)}`;

  const resolveOwner = useCallback(async () => {
    if (!hasAccessSession()) {
      setOwnerState("guest");
      return false;
    }
    try {
      const me = await fetchMe();
      const isOwner = (me.role?.key ?? "").trim().toLowerCase() === "owner";
      setOwnerState(isOwner ? "owner" : "other");
      return isOwner;
    } catch {
      setOwnerState("guest");
      return false;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const isOwner = await resolveOwner();
      if (isOwner && searchParams.get("setup") === "storefront") {
        router.replace(ownerHubHref);
      }
    })();
  }, [resolveOwner, searchParams, router, ownerHubHref]);

  return (
    <ComingSoonPage
      storeName={storeName}
      logoUrl={logoUrl}
      primaryHex={primaryHex}
      accentHex={accentHex}
      content={content}
      ownerState={ownerState}
      ownerHubHref={ownerHubHref}
      loginHref={loginHref}
    />
  );
}

function ComingSoonPage({
  logoUrl,
  primaryHex,
  accentHex,
  content,
  ownerState,
  ownerHubHref,
  loginHref,
}: ShopStorefrontComingSoonProps & {
  ownerState: "unknown" | "guest" | "owner" | "other";
  ownerHubHref: string;
  loginHref: string;
}) {
  const theme = useMemo(
    () => buildComingSoonTheme(primaryHex, accentHex),
    [primaryHex, accentHex],
  );

  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);

  const onNotify = () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      return;
    }
    setEmailDone(true);
  };

  return (
    <ComingSoonPageBody
      logoUrl={logoUrl}
      theme={theme}
      content={content}
      ownerState={ownerState}
      ownerHubHref={ownerHubHref}
      loginHref={loginHref}
      email={email}
      emailDone={emailDone}
      onEmailChange={setEmail}
      onNotify={onNotify}
    />
  );
}

function ComingSoonPageBody({
  logoUrl,
  theme,
  content,
  ownerState,
  ownerHubHref,
  loginHref,
  email,
  emailDone,
  onEmailChange,
  onNotify,
}: {
  logoUrl?: string | null;
  theme: ComingSoonTheme;
  content: ComingSoonEditorialContent;
  ownerState: "unknown" | "guest" | "owner" | "other";
  ownerHubHref: string;
  loginHref: string;
  email: string;
  emailDone: boolean;
  onEmailChange: (v: string) => void;
  onNotify: () => void;
}) {
  const promiseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { displayName } = content;

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
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [content.promises]);

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
          className={cn(
            styles.serif,
            "text-[22px] font-medium tracking-[0.04em] text-[var(--cs-charcoal)] no-underline",
          )}
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
        <div className="flex items-center gap-3">
          <LandingAccountAction className="text-[13px] font-medium text-[var(--cs-warm-gray)] underline-offset-4 hover:text-[var(--cs-charcoal)] hover:underline" />
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
        </div>
      </nav>

      <MarqueeRibbon items={content.marquee} theme={theme} />

      <section className="relative grid min-h-[100dvh] grid-cols-1 overflow-hidden lg:grid-cols-2">
        <div
          className={cn(
            styles.heroPanel,
            styles.heroGlow,
            "relative flex flex-col justify-center px-6 pb-16 pt-24 sm:px-12 lg:px-12 lg:pb-20 lg:pl-12 xl:pl-12",
          )}
        >
          <div className={cn(styles.heroEyebrow, "mb-8 flex items-center gap-3")}>
            <div
              className="h-px w-8 shrink-0"
              style={{ backgroundColor: theme.primary }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cs-warm-gray)]">
              {content.eyebrow}
            </span>
          </div>

          <h1
            className={cn(
              styles.serif,
              styles.heroTitle,
              "mb-6 text-[clamp(44px,5.6vw,84px)] font-light leading-[1.05] tracking-[-0.02em] text-[var(--cs-charcoal)]",
            )}
          >
            {content.headline.lines.map((line, i) => (
              <span key={`${line}-${i}`}>
                {i > 0 ? <br /> : null}
                {i === content.headline.accentIndex ? (
                  <em
                    className="font-light italic leading-[1.1]"
                    style={{ color: theme.primary }}
                  >
                    {line}
                  </em>
                ) : (
                  line
                )}
              </span>
            ))}
          </h1>

          <p
            className={cn(
              styles.heroDesc,
              "mb-8 max-w-[42ch] text-[15px] font-light leading-[1.75] text-[var(--cs-warm-gray)]",
            )}
          >
            {content.description}
          </p>

          {content.chips.length > 0 ? (
            <HeroChips chips={content.chips} theme={theme} />
          ) : null}

          <div
            className={cn(
              styles.heroActions,
              "mt-10 flex flex-wrap items-center gap-4",
            )}
          >
            {ownerState === "owner" ? (
              <Link
                href={ownerHubHref}
                className={cn(
                  styles.btnPrimary,
                  "relative inline-flex items-center gap-2.5 overflow-hidden border-0 px-8 py-4 text-[13px] font-medium uppercase tracking-[0.08em] no-underline transition-colors",
                )}
              >
                <span className="relative z-[1]">Finish shop setup</span>
                <ArrowRight className="relative z-[1] size-3.5" aria-hidden />
              </Link>
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
            {content.promises.length > 0 || content.teasers.length > 0 ? (
              <button
                type="button"
                className={cn(
                  styles.btnGhost,
                  "inline-flex items-center gap-2 border-0 bg-transparent p-0 text-[13px] font-normal tracking-[0.06em] transition-colors",
                )}
                onClick={() => scrollTo("discover")}
              >
                A look inside
                <ArrowRight className="size-3.5" />
              </button>
            ) : null}
          </div>

          {ownerState === "owner" ? (
            <p className="mt-4 text-xs text-[var(--cs-warm-gray)]">
              You&apos;re signed in as the owner. Finish setup in your business hub.
            </p>
          ) : null}

          {content.stats.length > 0 ? (
            <div className={cn(styles.heroCountdown, "mt-14")}>
              <LaunchStats stats={content.stats} theme={theme} />
            </div>
          ) : null}
        </div>

        <HeroVisualPanel
          theme={theme}
          cells={content.heroCells}
          fallbackUrl={content.heroFallbackUrl}
          storeName={displayName}
          logoUrl={logoUrl}
          tag={content.floatingTag}
        />
      </section>

      {content.promises.length > 0 ? (
        <>
          <div className={cn(styles.sectionRule, "mx-6 sm:mx-12")} aria-hidden />
          <section id="discover" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-12">
            <div className="mb-10 max-w-[36rem]">
              <h2
                className={cn(
                  styles.serif,
                  "text-[clamp(32px,4vw,44px)] font-light leading-tight text-[var(--cs-charcoal)]",
                )}
              >
                {content.shelfHeading}
              </h2>
            </div>
            <div
              className={cn(
                styles.promiseGrid,
                "grid grid-cols-1 sm:grid-cols-2",
                content.promises.length > 2 ? "lg:grid-cols-4" : "lg:grid-cols-2",
              )}
            >
              {content.promises.map((p, i) => (
                <div
                  key={p.key}
                  ref={(el) => {
                    promiseRefs.current[i] = el;
                  }}
                  className={cn(styles.promiseCard, "p-7 sm:p-8")}
                  style={{ transitionDelay: `${i * 0.1}s` }}
                >
                  <div className="mb-5 flex items-start justify-between gap-3">
                    {p.imageUrl ? (
                      <span className="relative size-12 overflow-hidden rounded-xl">
                        <Image
                          src={p.imageUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          styles.promiseIcon,
                          "inline-flex size-10 items-center justify-center rounded-xl",
                        )}
                      >
                        <Package className="size-[18px]" strokeWidth={1.75} aria-hidden />
                      </span>
                    )}
                    <span
                      className={cn(
                        styles.serif,
                        "text-[12px] font-light tracking-[0.12em]",
                      )}
                      style={{ color: theme.primary }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
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
        </>
      ) : (
        <div id="discover" />
      )}

      {content.teasers.length > 0 ? (
        <>
          <div className={cn(styles.sectionRule, "mx-6 sm:mx-12")} aria-hidden />
          <CategoriesTeaser teasers={content.teasers} theme={theme} />
        </>
      ) : null}

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
          {content.firstWord}
        </p>
        <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
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
                    className="font-normal italic leading-[1.1]"
                    style={{ color: theme.accentLight }}
                  >
                    today.
                  </em>
                </>
              ) : (
                <>
                  Be first
                  <br />
                  <em
                    className="font-normal italic leading-[1.1]"
                    style={{ color: theme.accentLight }}
                  >
                    in line.
                  </em>
                </>
              )}
            </h2>
            <p className="text-sm font-light leading-[1.7] text-[var(--cs-on-dark-muted)]">
              {ownerState === "owner"
                ? "Choose your branch location and enable your public catalog. Shoppers will see stock and prices from that branch."
                : `Leave your email and we will tell you when ${displayName} opens.`}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {ownerState === "owner" ? (
              <Link
                href={ownerHubHref}
                className="block w-full px-7 py-4 text-center text-xs font-semibold uppercase tracking-[0.1em] no-underline transition-colors hover:brightness-110"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.onPrimary,
                }}
              >
                Continue setup
              </Link>
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
                You&apos;re on the list. We&apos;ll write before launch.
              </div>
            ) : (
              <>
                <div className="flex border border-[color-mix(in_srgb,var(--cs-on-dark)_22%,transparent)] transition-colors focus-within:border-[var(--cs-primary)]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="Your email address"
                    className="min-w-0 flex-1 border-0 bg-transparent px-5 py-4 text-sm font-light tracking-[0.02em] text-[var(--cs-on-dark)] outline-none placeholder:text-[var(--cs-on-dark-muted)]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onNotify();
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
                    Notify me
                  </button>
                </div>
                <p className="text-[11px] tracking-[0.02em] text-[var(--cs-on-dark-muted)]">
                  No spam. Unsubscribe anytime.
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
          {content.contactHref && content.contactLabel ? (
            <a
              href={content.contactHref}
              className="text-xs uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--cs-on-dark)_62%,transparent)] no-underline hover:text-[var(--cs-on-dark)]"
            >
              {content.contactLabel}
            </a>
          ) : null}
        </div>
        <p className="text-[11px] tracking-[0.04em] text-[color-mix(in_srgb,var(--cs-on-dark)_22%,transparent)]">
          {content.footerPlace
            ? `${new Date().getFullYear()} ${displayName}. ${content.footerPlace}.`
            : `${new Date().getFullYear()} ${displayName}.`}
        </p>
      </footer>
    </div>
  );
}

function HeroVisualPanel({
  theme,
  cells,
  fallbackUrl,
  storeName,
  logoUrl,
  tag,
}: {
  theme: ComingSoonTheme;
  cells: ComingSoonHeroCell[];
  fallbackUrl: string | null;
  storeName: string;
  logoUrl?: string | null;
  tag: { title: string; subtitle: string } | null;
}) {
  const count = cells.length;
  const gridClass =
    count <= 1
      ? "grid-cols-1 grid-rows-1"
      : count === 2
        ? "grid-cols-2 grid-rows-1"
        : "grid-cols-2 grid-rows-2";

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
      {count === 0 ? (
        <BrandEmptyHero
          theme={theme}
          storeName={storeName}
          logoUrl={logoUrl}
          fallbackUrl={fallbackUrl}
        />
      ) : (
        <div
          className={cn(
            styles.visualGrid,
            "absolute inset-0 grid gap-px bg-black/25",
            gridClass,
          )}
        >
          {cells.map((cell, index) => (
            <div
              key={`${cell.name}-${index}`}
              className={cn(
                styles.heroCell,
                "group relative overflow-hidden",
                count === 3 && index === 0 ? "row-span-2" : "",
              )}
              style={{ background: theme.darkBgMid }}
            >
              {cell.imageUrl ? (
                <Image
                  src={cell.imageUrl}
                  alt={cell.imageAlt}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  priority={index < 2}
                  unoptimized
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(160deg, color-mix(in srgb, ${theme.primary} ${18 + index * 6}%, ${theme.darkBgMid}), ${theme.darkBg})`,
                  }}
                />
              )}
              <div
                className={cn(styles.heroCellOverlay, "absolute inset-0")}
                aria-hidden
              />
              <HeroCellLabel cell={cell} />
            </div>
          ))}
        </div>
      )}
      {tag ? (
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
              <Package className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-xs tracking-[0.02em] text-[var(--cs-charcoal)]">
              <strong className="mb-0.5 block text-[13px] font-medium">
                {tag.title}
              </strong>
              {tag.subtitle}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrandEmptyHero({
  theme,
  storeName,
  logoUrl,
  fallbackUrl,
}: {
  theme: ComingSoonTheme;
  storeName: string;
  logoUrl?: string | null;
  fallbackUrl: string | null;
}) {
  if (fallbackUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={fallbackUrl}
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
          unoptimized
        />
        <div
          className={cn(styles.heroCellOverlay, "absolute inset-0")}
          aria-hidden
        />
        <p
          className={cn(
            styles.serif,
            "absolute inset-x-8 bottom-24 text-[clamp(28px,4vw,48px)] font-light text-[var(--cs-on-dark)]",
          )}
        >
          {storeName}
        </p>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
      {logoUrl?.trim() ? (
        <Image
          src={logoUrl}
          alt={storeName}
          width={160}
          height={64}
          className="max-h-16 w-auto object-contain"
          unoptimized
        />
      ) : (
        <TenantMonogramLockup
          brand={storeName}
          primaryColor={theme.primary}
          size="lg"
          showTagline={false}
          tone="dark"
        />
      )}
      <p
        className={cn(
          styles.serif,
          "text-center text-[clamp(28px,3vw,40px)] font-light text-[var(--cs-on-dark)]",
        )}
      >
        {storeName}
      </p>
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

function HeroCellLabel({ cell }: { cell: ComingSoonHeroCell }) {
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
      {cell.price ? (
        <p
          className={cn(
            styles.serif,
            styles.heroCellPrice,
            "mt-0.5 text-xl font-light",
          )}
        >
          {cell.price}
        </p>
      ) : null}
    </div>
  );
}

function MarqueeRibbon({
  items,
  theme,
}: {
  items: string[];
  theme: ComingSoonTheme;
}) {
  const loop = items.length > 0 ? [...items, ...items, ...items, ...items] : [];
  if (loop.length === 0) return null;
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

function HeroChips({
  chips,
  theme,
}: {
  chips: ComingSoonChip[];
  theme: ComingSoonTheme;
}) {
  return (
    <div className={cn(styles.heroChips, "flex flex-wrap gap-2")}>
      {chips.map(({ label, kind }) => {
        const Icon = CHIP_ICON[kind];
        return (
          <span
            key={`${kind}-${label}`}
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
        );
      })}
    </div>
  );
}

function LaunchStats({
  stats,
  theme,
}: {
  stats: ComingSoonEditorialContent["stats"];
  theme: ComingSoonTheme;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((s, i) => (
        <div
          key={`${s.label}-${s.value}`}
          className={cn(
            styles.countdownUnit,
            "min-w-[4.5rem] max-w-[11rem] rounded-xl px-4 py-3 text-center",
          )}
          style={
            i === stats.length - 1
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
              "block truncate text-[28px] font-light leading-none sm:text-[32px]",
            )}
          >
            {s.value}
          </span>
          <span className="mt-1 block truncate text-[10px] uppercase tracking-[0.14em] text-[var(--cs-warm-gray)]">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoriesTeaser({
  teasers,
  theme,
}: {
  teasers: ComingSoonTeaser[];
  theme: ComingSoonTheme;
}) {
  const strip = teasers.length >= 4 ? [...teasers, ...teasers] : teasers;
  return (
    <section className="overflow-hidden pb-20 pt-16">
      <div className="mx-auto mb-10 max-w-[1200px] px-6 sm:px-12">
        <h2
          className={cn(
            styles.serif,
            "text-[clamp(28px,3.5vw,40px)] font-light text-[var(--cs-charcoal)]",
          )}
        >
          Browse what&apos;s{" "}
          <em className="italic leading-[1.1]" style={{ color: theme.primary }}>
            coming
          </em>
        </h2>
      </div>
      <div
        className={cn(
          teasers.length >= 4 ? "overflow-hidden" : "overflow-x-auto",
          "px-6 sm:px-12",
        )}
      >
        <div
          className={cn(
            teasers.length >= 4 ? styles.categoriesStrip : "",
            "flex gap-4",
          )}
        >
          {strip.map((cat, i) => (
            <div
              key={`${cat.key}-${i}`}
              className={cn(
                styles.catCard,
                "relative h-[240px] w-[210px] shrink-0 cursor-default overflow-hidden rounded-2xl border border-[var(--cs-border-subtle)]",
              )}
              style={
                cat.imageUrl
                  ? undefined
                  : {
                      background: `linear-gradient(165deg, color-mix(in srgb, ${theme.primary} 22%, ${theme.darkBgMid}), ${theme.darkBg})`,
                    }
              }
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  sizes="210px"
                  className={cn(styles.catCardImage, "object-cover")}
                  unoptimized
                />
              ) : null}
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
