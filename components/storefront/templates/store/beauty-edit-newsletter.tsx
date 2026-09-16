"use client";

import Link from "next/link";

import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";

/**
 * Beauty Edit's account panel.
 *
 * This was an email box whose submit handler only called `preventDefault()` — no
 * call, no feedback, no record. It now opens the storefront sign-up sheet (F8).
 */
export function BeautyEditNewsletter() {
  const { href, label, onActivate } = useStorefrontSignUpDoor();

  return (
    <section className={styles.newsletter} aria-labelledby="be-newsletter-title">
      <h2 id="be-newsletter-title" className={styles.newsletterTitle}>
        Your list, in one place
      </h2>
      <p className={styles.newsletterSub}>
        Create an account to track orders, save your cart, and hear about
        promotions and launches.
      </p>
      <Link href={href} onClick={onActivate} className={styles.newsletterCta}>
        {label}
      </Link>
    </section>
  );
}
