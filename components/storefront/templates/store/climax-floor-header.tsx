"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, ShoppingBag } from "lucide-react";
import { Suspense, useState } from "react";

import { useStorefrontAccountLink } from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import { ClimaxFloorAisles } from "@/components/storefront/templates/store/climax-floor-aisles";
import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCategory } from "@/lib/public-storefront";
import { activeStorefrontCategorySlugFromPathname } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

function SearchForm({ inputId }: { inputId: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const typeId = sp.get("typeId")?.trim() || sp.get("departmentId")?.trim();
  const action = pathname.startsWith("/shop") ? pathname : APP_ROUTES.shop;

  return (
    <form action={action} method="get" className={styles.searchForm} role="search">
      <Search size={16} strokeWidth={1.8} aria-hidden />
      <label className={styles.srOnly} htmlFor={inputId}>
        Search the floor
      </label>
      <input
        id={inputId}
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search chairs, desks, sets…"
        autoComplete="off"
      />
      {typeId ? <input type="hidden" name="typeId" value={typeId} /> : null}
      <button type="submit">Search</button>
    </form>
  );
}

type ClimaxFloorHeaderProps = {
  storeName: string;
  logoUrl?: string | null;
  tagline?: string | null;
  categories?: PublicCategory[];
  className?: string;
};

export function ClimaxFloorHeader(props: ClimaxFloorHeaderProps) {
  return (
    <Suspense fallback={<ClimaxFloorHeaderView {...props} />}>
      <ClimaxFloorHeaderView {...props} />
    </Suspense>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CF";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ClimaxFloorHeaderView({
  storeName,
  logoUrl,
  tagline,
  categories = [],
  className,
}: ClimaxFloorHeaderProps) {
  const { itemCount, openDrawer } = useShopCart();
  const { signedIn, href, onActivate } = useStorefrontAccountLink();
  const pathname = usePathname();
  const categoryPathSlug =
    activeStorefrontCategorySlugFromPathname(pathname) || undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className={cn(styles.header, className)}
      data-open={menuOpen ? "true" : undefined}
      data-search={searchOpen ? "true" : undefined}
    >
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.brand}>
          <span className={styles.logoMark}>
            <StorefrontEditableLogoMark
              logoUrl={logoUrl}
              alt={storeName}
              width={36}
              height={36}
              className={styles.logoImg}
              fallback={
                <span className={styles.logoFallback}>{initials(storeName)}</span>
              }
            />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>{storeName}</span>
            {tagline ? <span className={styles.brandTag}>{tagline}</span> : null}
          </span>
        </Link>

        <div className={styles.searchSlot}>
          <Suspense fallback={null}>
            <SearchForm inputId="cf-search-q" />
          </Suspense>
        </div>

        <div className={styles.tools}>
          <Link href={href} className={styles.login} onClick={onActivate}>
            {signedIn ? "Account" : "Log in"}
          </Link>
          <button
            type="button"
            className={styles.searchToggle}
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={
              itemCount > 0 ? `Open cart, ${itemCount} items` : "Open cart"
            }
          >
            <ShoppingBag size={18} strokeWidth={1.8} />
            {itemCount > 0 ? (
              <span className={styles.cartCount}>{Math.min(itemCount, 99)}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={menuOpen ? "Close aisles" : "Open aisles"}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={styles.searchPanel}>
        <Suspense fallback={null}>
          <SearchForm inputId="cf-search-q-mobile" />
        </Suspense>
      </div>

      <div className={styles.drawer}>
        <ClimaxFloorAisles
          categories={categories}
          categoryPathSlug={categoryPathSlug}
          onNavigate={() => setMenuOpen(false)}
        />
      </div>
    </header>
  );
}
