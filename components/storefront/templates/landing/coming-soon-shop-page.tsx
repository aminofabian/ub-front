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
import { Check, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { dmSans } from "@/app/fonts/dm-sans";
import { TenantMonogramLockup } from "@/components/brand/tenant-monogram";
import { LandingAccountAction } from "@/components/storefront/templates/landing/shared";
import styles from "@/components/storefront/templates/landing/coming-soon-shop.module.css";
import { buildComingSoonTheme } from "@/lib/coming-soon-theme";
import type {
  ComingSoonShopContent,
  ComingSoonShopProduct,
} from "@/lib/coming-soon-shop";
import { APP_ROUTES } from "@/lib/config";
import { hasAccessSession } from "@/lib/auth";
import { fetchMe } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ComingSoonShopPageProps = {
  storeName: string;
  logoUrl?: string | null;
  primaryHex?: string | null;
  accentHex?: string | null;
  content: ComingSoonShopContent;
};

export function ComingSoonShopPage(props: ComingSoonShopPageProps) {
  return (
    <Suspense
      fallback={
        <ShopPage
          {...props}
          ownerState="unknown"
          ownerHubHref={APP_ROUTES.business}
          loginHref={APP_ROUTES.staffLogin}
        />
      }
    >
      <ComingSoonShopInner {...props} />
    </Suspense>
  );
}

function ComingSoonShopInner(props: ComingSoonShopPageProps) {
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
    <ShopPage
      {...props}
      ownerState={ownerState}
      ownerHubHref={ownerHubHref}
      loginHref={loginHref}
    />
  );
}

function ShopPage({
  logoUrl,
  primaryHex,
  accentHex,
  content,
  ownerState,
  ownerHubHref,
  loginHref,
}: ComingSoonShopPageProps & {
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
  const [watching, setWatching] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const onNotify = () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) return;
    setEmailDone(true);
  };

  const watch = (name: string) => {
    setWatching(name);
    emailRef.current?.focus();
    document.getElementById("notify")?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  const { displayName, featured, products } = content;
  const thumbs = products.filter((p) => p.imageUrl).slice(0, 3);
  const hasShelf = Boolean(featured) || products.length > 0;
  const tillHint = watching
    ? "We'll tell you when it's in the bag"
    : "Bag locked";
  const tillLine = watching
    ? watching
    : content.productCount > 0
      ? `${formatCount(content.productCount)} on the shelf`
      : "Stocking the shelf";

  return (
    <div
      className={cn(dmSans.variable, styles.page)}
      style={theme.cssVars as CSSProperties}
    >
      <header className={styles.chrome}>
        <a
          href="#"
          className={styles.brand}
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
              height={36}
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
        <div className={styles.chromeActions}>
          <LandingAccountAction className="text-[13px] font-medium text-[var(--shop-muted)] underline-offset-4 hover:underline" />
          <span className={styles.soon}>
            <span className={styles.soonDot} aria-hidden />
            Opening soon
          </span>
        </div>
      </header>

      {hasShelf && featured ? (
        <section className={styles.pdp} aria-labelledby="featured-name">
          <div className={styles.pdpPhoto}>
            {featured.imageUrl ? (
              <Image
                src={featured.imageUrl}
                alt={featured.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(160deg, color-mix(in srgb, ${theme.primary} 28%, ${theme.darkBgMid}), ${theme.darkBg})`,
                }}
              />
            )}
          </div>
          <div className={styles.pdpCopy}>
            <h1
              id="featured-name"
              className="m-0 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.03em]"
            >
              {featured.name}
            </h1>
            {featured.price ? (
              <div className={styles.priceRow}>
                <span className={styles.price}>{featured.price}</span>
                {featured.regularPrice ? (
                  <span className={styles.was}>{featured.regularPrice}</span>
                ) : null}
              </div>
            ) : null}
            <p className={styles.lede}>{content.description}</p>
            {content.chips.length > 0 ? (
              <div className={styles.facts}>
                {content.chips.map((chip) => (
                  <span key={chip.kind} className={styles.fact}>
                    {chip.label}
                  </span>
                ))}
              </div>
            ) : null}
            {ownerState === "owner" ? (
              <Link href={ownerHubHref} className={styles.notifyBtn}>
                Finish shop setup
              </Link>
            ) : ownerState === "guest" ? (
              <Link href={loginHref} className={styles.notifyBtn}>
                Owner sign in
              </Link>
            ) : (
              <button
                type="button"
                className={styles.notifyBtn}
                onClick={() => watch(featured.name)}
              >
                <Lock className="size-3.5" strokeWidth={2} aria-hidden />
                Notify me about this
              </button>
            )}
            {thumbs.length > 0 ? (
              <div className={styles.thumbs} aria-hidden>
                {thumbs.map((thumb) => (
                  <span key={thumb.id} className={styles.thumb}>
                    {thumb.imageUrl ? (
                      <Image
                        src={thumb.imageUrl}
                        alt=""
                        fill
                        sizes="52px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <EmptyShelf
          displayName={displayName}
          logoUrl={logoUrl}
          fallbackUrl={content.heroFallbackUrl}
          description={content.description}
          primary={theme.primary}
        />
      )}

      {content.collections.length > 0 ? (
        <nav className={styles.rail} aria-label="Collections">
          {content.collections.map((col) => (
            <span key={col.id} className={styles.pill}>
              {col.name}
              {col.count ? ` · ${col.count}` : ""}
            </span>
          ))}
        </nav>
      ) : null}

      {products.length > 0 ? (
        <section className={styles.shelf} aria-labelledby="shelf-heading">
          <div className={styles.shelfHead}>
            <h2 id="shelf-heading">On the shelf</h2>
            <span className={styles.count}>
              {formatCount(
                content.productCount || products.length + (featured ? 1 : 0),
              )}{" "}
              {content.productCount === 1 ? "product" : "products"}
            </span>
          </div>
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onWatch={() => watch(product.name)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <footer className={styles.foot}>
        <span>
          {displayName}
          {content.place ? ` · ${content.place}` : ""}
        </span>
        {content.contactHref && content.contactLabel ? (
          <a href={content.contactHref}>{content.contactLabel}</a>
        ) : content.hours ? (
          <span>{content.hours}</span>
        ) : null}
      </footer>

      <aside className={styles.till} id="notify">
        <div className={styles.tillCopy}>
          <p className={styles.tillHint}>{tillHint}</p>
          <p className={styles.tillLine}>{tillLine}</p>
        </div>
        {ownerState === "owner" ? (
          <Link href={ownerHubHref} className={styles.tillLink}>
            Continue setup
          </Link>
        ) : ownerState === "guest" ? (
          <Link href={loginHref} className={styles.tillLink}>
            Owner sign in to set up
          </Link>
        ) : emailDone ? (
          <p className={styles.tillDone}>
            <Check className="size-4 shrink-0" aria-hidden />
            You&apos;re on the list. We&apos;ll write before launch.
          </p>
        ) : (
          <form
            className={styles.tillForm}
            onSubmit={(e) => {
              e.preventDefault();
              onNotify();
            }}
          >
            <input
              ref={emailRef}
              id="notify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              autoComplete="email"
              aria-label="Your email"
            />
            <button type="submit">Tell me when we open</button>
          </form>
        )}
      </aside>
    </div>
  );
}

function ProductCard({
  product,
  onWatch,
}: {
  product: ComingSoonShopProduct;
  onWatch: () => void;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardFace}>
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(max-width: 720px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            unoptimized
          />
        ) : null}
      </div>
      <div className={styles.cardMeta}>
        <div className="min-w-0">
          <h3 className={styles.cardName}>{product.name}</h3>
          {product.price ? (
            <p className={styles.cardPrice}>
              {product.price}
              {product.regularPrice ? (
                <span className={styles.was}> {product.regularPrice}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.lockBtn}
          onClick={onWatch}
          aria-label={`Notify me about ${product.name}`}
        >
          <Lock className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </article>
  );
}

function EmptyShelf({
  displayName,
  logoUrl,
  fallbackUrl,
  description,
  primary,
}: {
  displayName: string;
  logoUrl?: string | null;
  fallbackUrl: string | null;
  description: string;
  primary: string;
}) {
  if (fallbackUrl) {
    return (
      <section className={styles.pdp}>
        <div className={styles.pdpPhoto}>
          <Image
            src={fallbackUrl}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
        </div>
        <div className={styles.pdpCopy}>
          <h1 className="m-0 text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            {displayName}
          </h1>
          <p className={styles.lede}>{description}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.empty}>
      {logoUrl?.trim() ? (
        <Image
          src={logoUrl}
          alt={displayName}
          width={140}
          height={56}
          className="max-h-14 w-auto object-contain"
          unoptimized
        />
      ) : (
        <TenantMonogramLockup
          brand={displayName}
          primaryColor={primary}
          size="lg"
          showTagline={false}
        />
      )}
      <h1 className="m-0 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.03em]">
        {displayName}
      </h1>
      <p className={styles.lede}>{description}</p>
      <div className={styles.emptyGhosts} aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={styles.ghost} />
        ))}
      </div>
    </section>
  );
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("en").format(n);
}
