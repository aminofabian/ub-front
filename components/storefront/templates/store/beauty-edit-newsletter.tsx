"use client";

import Link from "next/link";

import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";

/**
 * Beyond's account band.
 *
 * This was an email box whose submit handler only called `preventDefault()` — no
 * call, no feedback, no record. It now opens the storefront sign-up sheet (F8).
 */
export function BeautyEditNewsletter() {
  const { href, label, onActivate } = useStorefrontSignUpDoor();

  return (
    <section className={styles.accountBand} aria-labelledby="be-account-title">
      <div className={styles.accountInner}>
        <div className={styles.accountCopy}>
          <h2 id="be-account-title" className={styles.accountTitle}>
            Save your edit
          </h2>
          <p className={styles.accountSub}>
            Keep your bag between visits, follow your orders, and hear when new
            pieces land.
          </p>
        </div>
        <Link href={href} onClick={onActivate} className={styles.accountCta}>
          {label}
        </Link>
      </div>
    </section>
  );
}
