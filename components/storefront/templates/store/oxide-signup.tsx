"use client";

import Link from "next/link";

import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/oxide.module.css";

/**
 * Oxide's account panel.
 *
 * This was an email box that set `done` on submit and rendered "You're on the
 * list." without calling anything — a confirmation for something that never
 * happened. It now opens the storefront sign-up sheet (F8).
 */
export function OxideSignup() {
  const { href, label, onActivate } = useStorefrontSignUpDoor();

  return (
    <section className={styles.section} id="spec">
      <div className={styles.signup} id="signup">
        <div>
          <h3>Numbered runs don&apos;t wait.</h3>
          <p>
            An account keeps your orders, your cart, and restock alerts in one
            place — no weekly email to wade through.
          </p>
        </div>
        <Link href={href} onClick={onActivate} className={styles.signupCta}>
          {label} →
        </Link>
      </div>
    </section>
  );
}
