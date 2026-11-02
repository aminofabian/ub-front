"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Menu,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";

import { zetuFontVariables } from "@/app/fonts/zetu";
import { StorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCategory } from "@/lib/public-storefront";
import {
  activeStorefrontCategorySlugFromPathname,
  shopListPath,
  storefrontCategoryPathSlug,
} from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Z";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function topLevelCategories(categories: PublicCategory[]): PublicCategory[] {
  return categories
    .filter((c) => !c.parentId)
    .filter((c) => c.name.trim().length > 0)
    .slice(0, 9);
}

function saleCategory(categories: PublicCategory[]): PublicCategory | null {
  return (
    categories.find((c) => /(^|\b)(sale|offer|deal)/i.test(c.name)) ?? null
  );
}

function SearchForm({
  inputId,
  compact,
}: {
  inputId: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form
      action={action}
      method="get"
      className={cn(styles.search, compact && styles.searchCompact)}
      role="search"
    >
      <Search size={16} strokeWidth={2} aria-hidden />
      <label className={styles.srOnly} htmlFor={inputId}>
        Search products
      </label>
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search products, brands and more"
        autoComplete="off"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit" className={styles.searchGo}>
        Search
      </button>
    </form>
  );
}

type ZetuHeaderProps = {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  announcement?: string | null;
  whatsapp?: string | null;
  categories: PublicCategory[];
  className?: string;
};

export function ZetuHeader(props: ZetuHeaderProps) {
  return (
    <Suspense fallback={<ZetuHeaderView {...props} />}>
      <ZetuHeaderView {...props} />
    </Suspense>
  );
}

function ZetuHeaderView({
  storeName,
  logoUrl,
  announcement,
  categories,
  className,
}: ZetuHeaderProps) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useShopCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const categoryPathSlug =
    activeStorefrontCategorySlugFromPathname(pathname) || undefined;

  const navCategories = useMemo(
    () => topLevelCategories(categories),
    [categories],
  );
  const sale = saleCategory(categories);
  const note =
    announcement?.trim() || "New season, new obsessions — fresh drops weekly.";
  const isSaleCopy = /\b(sale|deal|off)\b/i.test(note);
  const flag = isSaleCopy ? "SALE" : "NEW IN";
  const pill = sale
    ? { href: shopListPath({ categoryPathSlug: storefrontCategoryPathSlug(sale) }), label: "Sale" }
    : { href: APP_ROUTES.shop, label: "Shop all" };

  return (
    <header
      className={cn(styles.header, zetuFontVariables, className)}
      data-open={menuOpen ? "true" : undefined}
    >
      <div className={styles.announce}>
        <div className={styles.announceInner}>
          <span className={styles.announceTag}>{flag}</span>
          <span className={styles.announceRule} aria-hidden />
          <p className={styles.announceNote}>{note}</p>
          <Link
            href={sale ? pill.href : APP_ROUTES.shop}
            className={styles.announceCta}
            onClick={() => setMenuOpen(false)}
          >
            {sale ? "Shop the sale" : "Shop the edit"}
          </Link>
        </div>
      </div>

      <div className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X size={20} strokeWidth={2} aria-hidden />
            ) : (
              <Menu size={20} strokeWidth={2} aria-hidden />
            )}
          </button>

          <Link
            href={APP_ROUTES.shop}
            className={styles.logo}
            aria-label={`${storeName} home`}
            onClick={() => setMenuOpen(false)}
          >
            <StorefrontEditableLogoMark
              logoUrl={logoUrl}
              alt={storeName}
              width={168}
              height={48}
              className={styles.logoImg}
              fallback={
                <span className={styles.logoPlate}>
                  <span className={styles.logoFallback}>
                    {initials(storeName)}
                  </span>
                </span>
              }
            />
          </Link>

          <div className={styles.searchSlot}>
            <Suspense fallback={null}>
              <SearchForm inputId="zt-search-q" />
            </Suspense>
          </div>

          <Link
            href={APP_ROUTES.shop}
            className={styles.filterPill}
            aria-label="Browse all products"
          >
            <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />
            <span>Filters</span>
          </Link>

          <div className={styles.tools}>
            <StorefrontAccountLink
              className={styles.accountBtn}
              labelClassName={styles.accountLabel}
              showLabel
            >
              <UserRound size={19} strokeWidth={1.9} aria-hidden />
            </StorefrontAccountLink>
            <button
              type="button"
              className={styles.cartBtn}
              onClick={openDrawer}
              aria-label={itemCount > 0 ? `Open bag, ${itemCount} items` : "Open bag"}
            >
              <ShoppingBag size={19} strokeWidth={1.9} aria-hidden />
              {itemCount > 0 ? (
                <span className={styles.cartCount}>{Math.min(itemCount, 99)}</span>
              ) : null}
            </button>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Collections">
          <Link
            href={APP_ROUTES.shop}
            className={cn(
              styles.navLink,
              pathname === APP_ROUTES.shop &&
                !categoryPathSlug &&
                styles.navLinkActive,
            )}
            onClick={() => setMenuOpen(false)}
          >
            New In
          </Link>
          {navCategories.map((cat) => {
            const slugSeg = storefrontCategoryPathSlug(cat);
            const active = categoryPathSlug === slugSeg;
            return (
              <Link
                key={cat.id}
                href={shopListPath({ categoryPathSlug: slugSeg })}
                className={cn(styles.navLink, active && styles.navLinkActive)}
                onClick={() => setMenuOpen(false)}
              >
                {cat.name}
              </Link>
            );
          })}
          <Link
            href={pill.href}
            className={styles.navPill}
            onClick={() => setMenuOpen(false)}
          >
            {pill.label}
          </Link>
        </nav>
      </div>

      <div className={styles.mobileSearch}>
        <Suspense fallback={null}>
          <SearchForm inputId="zt-search-q-mobile" compact />
        </Suspense>
      </div>

      <div className={styles.drawer}>
        <div className={styles.drawerHead}>
          <span className={styles.drawerKicker}>Shop by collection</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <nav className={styles.drawerNav} aria-label="Mobile collections">
          <Link
            href={APP_ROUTES.shop}
            className={styles.drawerLink}
            onClick={() => setMenuOpen(false)}
          >
            New In
            <span className={styles.drawerArrow} aria-hidden>
              →
            </span>
          </Link>
          {navCategories.map((cat) => (
            <Link
              key={cat.id}
              href={shopListPath({
                categoryPathSlug: storefrontCategoryPathSlug(cat),
              })}
              className={styles.drawerLink}
              onClick={() => setMenuOpen(false)}
            >
              {cat.name}
              <span className={styles.drawerArrow} aria-hidden>
                →
              </span>
            </Link>
          ))}
          <Link
            href={pill.href}
            className={cn(styles.drawerLink, styles.drawerLinkAccent)}
            onClick={() => setMenuOpen(false)}
          >
            {pill.label}
            <span className={styles.drawerArrow} aria-hidden>
              →
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
