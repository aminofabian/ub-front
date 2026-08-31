"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, MessageCircle, Search, ShoppingBag, X } from "lucide-react";
import { Suspense, useEffect, useState, type MouseEvent } from "react";

import { useStorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { logoutRemote } from "@/lib/api";
import { clearSessionTokens } from "@/lib/auth";
import { APP_ROUTES, apiUrl } from "@/lib/config";
import type { PublicCatalogType, PublicCategory } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={styles.clock}>{time || "--:--:--"}</span>;
}

function SearchForm({ className }: { className?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form
      action={action}
      method="get"
      className={cn(styles.searchForm, className)}
      role="search"
    >
      <label className="sr-only" htmlFor="cm-search-q">
        Search products
      </label>
      <span className={styles.searchGlyph} aria-hidden>
        <Search size={16} strokeWidth={2} />
      </span>
      <input
        id="cm-search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search products…"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" className={styles.searchSubmit}>
        Search
      </button>
    </form>
  );
}

type ComilmartHeaderProps = {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  areaLabel?: string | null;
  branchHint?: string | null;
  whatsapp?: string | null;
  categories?: PublicCategory[];
  className?: string;
};

export function ComilmartHeader(props: ComilmartHeaderProps) {
  return (
    <Suspense fallback={<ComilmartHeaderView {...props} listing={false} />}>
      <ComilmartHeaderLive {...props} />
    </Suspense>
  );
}

function ComilmartHeaderLive(props: ComilmartHeaderProps) {
  const sp = useSearchParams();
  const listing = Boolean(
    sp.get("q")?.trim() ||
      sp.get("typeId")?.trim() ||
      sp.get("departmentId")?.trim() ||
      sp.get("categoryId")?.trim(),
  );
  return <ComilmartHeaderView {...props} listing={listing} />;
}

function ComilmartHeaderView({
  slug,
  storeName,
  logoUrl,
  announcement,
  areaLabel,
  branchHint,
  whatsapp,
  categories = [],
  className,
  listing,
}: ComilmartHeaderProps & { listing: boolean }) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useShopCart();
  const { signedIn, href, label, signUpHref, onActivate } =
    useStorefrontAccountLink();
  const [menuOpen, setMenuOpen] = useState(false);
  const [types, setTypes] = useState<PublicCatalogType[]>([]);
  const categoryPathSlug = pathname.startsWith("/shop/c/")
    ? pathname.slice("/shop/c/".length).split("/")[0]
    : undefined;
  const wa = whatsapp?.replace(/\D/g, "") || "";
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") ||
    "Deliver to your area";
  const isHome =
    !listing &&
    (pathname === "/" ||
      pathname === APP_ROUTES.shop ||
      pathname === `${APP_ROUTES.shop}/`);
  const visibleCategories = categories.slice(0, 16);
  const visibleTypes = filterShopperTypes(types).slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    const url = apiUrl(
      `/api/v1/public/businesses/${encodeURIComponent(slug)}/catalog/types`,
    );
    void fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { types?: PublicCatalogType[] } | null) => {
        if (!cancelled && payload?.types) {
          setTypes(payload.types);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const closeThen = (handler: (event: MouseEvent<HTMLAnchorElement>) => void) => {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      setMenuOpen(false);
      handler(event);
    };
  };

  const onSignOut = async () => {
    setMenuOpen(false);
    await logoutRemote().catch(() => {});
    clearSessionTokens();
    window.location.reload();
  };

  return (
    <header
      className={cn(styles.header, className)}
      data-over-hero={isHome ? "true" : undefined}
      data-open={menuOpen ? "true" : undefined}
    >
      <div className={styles.promoBar}>
        <p>
          {announcement?.trim() ||
            "Order online - pay by M-Pesa, card, or cash on delivery."}
        </p>
        {wa ? (
          <a href={`https://wa.me/${wa}`} className={styles.promoCta}>
            Chat on WhatsApp
          </a>
        ) : null}
      </div>

      <div className={styles.utilityBar}>
        <div className={styles.utilityLeft}>
          <LiveClock />
          <span className={styles.utilityDot} aria-hidden />
          <span className={styles.utilityLink}>{storeName}</span>
        </div>
        <div className={styles.utilityRight}>
          <span className={styles.verified}>Verified shop</span>
          <Link
            href={href}
            className={styles.signIn}
            onClick={onActivate}
          >
            {label}
          </Link>
        </div>
      </div>

      <div className={styles.mainBar}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-expanded={menuOpen}
          aria-controls="cm-sidebar"
          aria-label={menuOpen ? "Close menu" : "Menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>

        <Link href={APP_ROUTES.shop} className={styles.logo}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            alt={storeName}
            width={240}
            height={56}
            className={styles.logoImg}
            fallback={<span className={styles.logoText}>{storeName}</span>}
          />
        </Link>

        <Suspense fallback={null}>
          <SearchForm className={styles.mainSearch} />
        </Suspense>

        <div className={styles.mainActions}>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={
              itemCount > 0 ? `Open cart, ${itemCount} items` : "Open cart"
            }
          >
            <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />
            {itemCount > 0 ? (
              <span className={styles.cartCount}>{Math.min(itemCount, 99)}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div
        className={styles.sidebarOverlay}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <aside
        id="cm-sidebar"
        className={styles.sidebar}
        aria-hidden={!menuOpen}
        aria-label="Shop menu"
      >
        <div className={styles.sidebarHead}>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
          <span className={styles.sidebarBrand}>
            <span className={styles.sidebarBrandName}>{storeName}</span>
            <span className={styles.sidebarBrandHint}>
              Your online shopping center
            </span>
          </span>
        </div>

        {signedIn ? (
          <Link
            href={APP_ROUTES.shopAccount}
            className={styles.sidebarAccount}
            onClick={() => setMenuOpen(false)}
          >
            Account
          </Link>
        ) : (
          <Link
            href={signUpHref}
            className={styles.sidebarSignup}
            onClick={closeThen(onActivate)}
          >
            Sign up free
          </Link>
        )}

        {!signedIn ? (
          <Link
            href={href}
            className={styles.sidebarSignIn}
            onClick={closeThen(onActivate)}
          >
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            className={styles.sidebarSignIn}
            onClick={() => void onSignOut()}
          >
            Sign out
          </button>
        )}

        <p className={styles.sidebarDeliver}>Deliver to: {locality} ▾</p>

        <nav className={styles.sidebarNav} aria-label="Categories">
          <Link
            href={APP_ROUTES.shop}
            className={styles.sidebarLink}
            onClick={() => setMenuOpen(false)}
          >
            All products
          </Link>
          {visibleCategories.map((cat) => (
            <Link
              key={cat.id}
              href={shopListPath({
                categoryPathSlug: storefrontCategoryPathSlug(cat),
                typeId: undefined,
              })}
              className={styles.sidebarLink}
              onClick={() => setMenuOpen(false)}
            >
              {cat.name}
            </Link>
          ))}
          {visibleCategories.length === 0
            ? visibleTypes.map((type) => (
                <Link
                  key={type.id}
                  href={shopListPath({
                    categoryPathSlug,
                    typeId: type.id,
                  })}
                  className={styles.sidebarLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {type.label}
                </Link>
              ))
            : null}
        </nav>

        {wa ? (
          <a
            href={`https://wa.me/${wa}`}
            className={styles.sidebarChat}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            <MessageCircle size={16} strokeWidth={2} aria-hidden />
            Chat on WhatsApp
          </a>
        ) : null}
      </aside>
    </header>
  );
}
