import Link from "next/link";

import styles from "@/components/storefront/templates/store/zetu.module.css";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCategory } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import type { LandingContent } from "@/lib/storefront-templates";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Z";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ZetuFooter({
  storeName,
  currency,
  categories,
  landingContent,
  areaLabel,
  branchHint,
}: {
  storeName: string;
  currency: string;
  categories: PublicCategory[];
  landingContent?: LandingContent | null;
  areaLabel?: string | null;
  branchHint?: string | null;
}) {
  const wa =
    landingContent?.whatsapp?.replace(/\D/g, "") ||
    landingContent?.phone?.replace(/\D/g, "") ||
    "";
  const phone = landingContent?.phone?.trim() || null;
  const hours = landingContent?.hours?.trim() || null;
  const address =
    landingContent?.address?.trim() ||
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(", ") ||
    null;
  const story =
    landingContent?.storyBody?.trim() ||
    `Fashion, beauty and accessories from ${storeName}. Pay with M-Pesa at checkout.`;
  const topCategories = categories.filter((c) => !c.parentId).slice(0, 6);
  const sale = categories.find((c) => /(^|\b)(sale|offer|deal)/i.test(c.name));
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href={APP_ROUTES.shop} className={styles.footerLogo}>
              <span className={styles.footerMark} aria-hidden>
                {initials(storeName)}
              </span>
              <span className={styles.footerWordmark}>{storeName}</span>
            </Link>
            <p className={styles.footerBlurb}>{story}</p>
          </div>

          <div className={styles.footerCol}>
            <h3 className={styles.footerHead}>Shop</h3>
            {topCategories.length > 0 ? (
              topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={shopListPath({
                    categoryPathSlug: storefrontCategoryPathSlug(cat),
                  })}
                  className={styles.footerLink}
                >
                  {cat.name}
                </Link>
              ))
            ) : (
              <Link href={APP_ROUTES.shop} className={styles.footerLink}>
                All products
              </Link>
            )}
            {sale ? (
              <Link
                href={shopListPath({
                  categoryPathSlug: storefrontCategoryPathSlug(sale),
                })}
                className={styles.footerLink}
              >
                {sale.name}
              </Link>
            ) : null}
          </div>

          <div className={styles.footerCol}>
            <h3 className={styles.footerHead}>Help</h3>
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                className={styles.footerLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat on WhatsApp
              </a>
            ) : null}
            {phone ? (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className={styles.footerLink}>
                {phone}
              </a>
            ) : null}
            {hours ? <p className={styles.footerNote}>{hours}</p> : null}
            {address ? <p className={styles.footerNote}>{address}</p> : null}
          </div>

          <div className={styles.footerCol}>
            <h3 className={styles.footerHead}>Your account</h3>
            <Link href={APP_ROUTES.shopAccount} className={styles.footerLink}>
              Orders & profile
            </Link>
            <Link href={APP_ROUTES.shopCart} className={styles.footerLink}>
              Your bag
            </Link>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy policy
            </Link>
            <Link href="/terms" className={styles.footerLink}>
              Terms & conditions
            </Link>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>
            © {year} {storeName}
          </span>
          <span className={styles.footerStamp}>
            All prices in {currency || "KES"}
          </span>
        </div>
      </div>
    </footer>
  );
}
