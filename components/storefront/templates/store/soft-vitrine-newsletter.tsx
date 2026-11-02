"use client";

import Link from "next/link";

import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/soft-vitrine.module.css";

/**
 * Soft vitrine account / newsletter band — “be the first to know” grammar.
 * Opens the storefront sign-up sheet (F8) instead of a dead email input.
 */
export function SoftVitrineNewsletter() {
  const { href, label, onActivate } = useStorefrontSignUpDoor();

  return (
    <section className={styles.accountBand} aria-labelledby="sv-account-title">
      <div className={styles.accountInner}>
        <div className={styles.accountCopy}>
          <h2 id="sv-account-title" className={styles.accountTitle}>
            Be the first to know
          </h2>
          <p className={styles.accountSub}>
            Get early access to new launches, exclusive offers, and tips from
            the community.
          </p>
        </div>
        <Link href={href} onClick={onActivate} className={styles.accountCta}>
          {label === "Sign up" ? "Subscribe" : label}
        </Link>
      </div>
    </section>
  );
}
