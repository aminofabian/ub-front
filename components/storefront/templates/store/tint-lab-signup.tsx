"use client";

import Link from "next/link";

import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import styles from "@/components/storefront/templates/store/tint-lab.module.css";

/**
 * Tint Lab's account panel.
 *
 * This was an email box that set `done` on submit and rendered "You're on the
 * list." without calling anything — a confirmation for something that never
 * happened. It now opens the storefront sign-up sheet (F8).
 */
export function TintLabSignup() {
  const { href, label, onActivate } = useStorefrontSignUpDoor();

  return (
    <section className={styles.section} id="signup">
      <div className={styles.signup}>
        <div>
          <h3>Find your shade before it sells out.</h3>
          <p>
            An account keeps your orders, your saved cart, and restock alerts
            together — so you hear about it when it matters.
          </p>
        </div>
        <Link href={href} onClick={onActivate} className={styles.signupCta}>
          {label} →
        </Link>
      </div>
    </section>
  );
}
