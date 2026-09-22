"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import {
  StorefrontAccountLink,
  useStorefrontAccountLink,
} from "@/components/storefront/storefront-account-link";
import { StorefrontEditableLogoMark } from "@/components/storefront/storefront-editable-logo";
import styles from "@/components/storefront/templates/store/mizu-springs.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#about", label: "About Us" },
  { href: "#collection", label: "Products" },
  { href: "#custom", label: "Custom" },
  { href: "#faq", label: "FAQs" },
] as const;

type MizuSpringsHeaderProps = {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  whatsapp?: string | null;
  className?: string;
};

export function MizuSpringsHeader(props: MizuSpringsHeaderProps) {
  return (
    <Suspense fallback={<MizuSpringsHeaderView {...props} />}>
      <MizuSpringsHeaderView {...props} />
    </Suspense>
  );
}

function MizuSpringsHeaderView({
  storeName,
  logoUrl,
  whatsapp,
  className,
}: MizuSpringsHeaderProps) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useShopCart();
  const { signedIn, label } = useStorefrontAccountLink();
  const [menuOpen, setMenuOpen] = useState(false);
  const wa = whatsapp?.replace(/\D/g, "") || "";
  const isHome =
    pathname === "/" ||
    pathname === APP_ROUTES.shop ||
    pathname === `${APP_ROUTES.shop}/`;

  const orderHref = wa
    ? `https://wa.me/${wa}`
    : isHome
      ? "#collection"
      : APP_ROUTES.shop;

  const initial = (storeName.trim().charAt(0) || "S").toUpperCase();

  return (
    <header
      className={cn(styles.header, className)}
      data-open={menuOpen ? "true" : undefined}
    >
      <div className={styles.headerInner}>
        <Link href={APP_ROUTES.shop} className={styles.logo}>
          <StorefrontEditableLogoMark
            logoUrl={logoUrl}
            alt={storeName}
            width={240}
            height={96}
            className={styles.logoImg}
            fallback={<span className={styles.logoText}>{storeName}</span>}
          />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={isHome ? item.href : `${APP_ROUTES.shop}${item.href}`}
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.tools}>
          <a
            href={orderHref}
            className={styles.orderBtn}
            target={wa ? "_blank" : undefined}
            rel={wa ? "noopener noreferrer" : undefined}
          >
            Order Now
            <MessageCircle size={16} aria-hidden />
          </a>
          <StorefrontAccountLink
            className={signedIn ? styles.sessionChip : styles.sessionGhost}
            signUpClassName={styles.sessionGhost}
            signUpLabel="Join"
          >
            {signedIn ? (
              <>
                <span className={styles.sessionAvatar} aria-hidden>
                  {initial}
                </span>
                <span className={styles.sessionDot} aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5.5 19c1.2-3.2 3.4-4.7 6.5-4.7s5.3 1.5 6.5 4.7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </StorefrontAccountLink>
          <button
            type="button"
            className={styles.cartBtn}
            onClick={openDrawer}
            aria-label={
              itemCount > 0 ? `Open bag, ${itemCount} items` : "Open bag"
            }
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 8h12l-1 11H7L6 8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 8V6.5a3 3 0 0 1 6 0V8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {itemCount > 0 ? (
              <span className={styles.cartCount}>{itemCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={styles.drawer}>
        <nav className={styles.nav} aria-label="Mobile">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={isHome ? item.href : `${APP_ROUTES.shop}${item.href}`}
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
