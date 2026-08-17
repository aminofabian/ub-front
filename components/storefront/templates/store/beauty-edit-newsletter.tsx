"use client";

import styles from "@/components/storefront/templates/store/beauty-edit.module.css";

export function BeautyEditNewsletter() {
  return (
    <section className={styles.newsletter} aria-labelledby="be-newsletter-title">
      <h2 id="be-newsletter-title" className={styles.newsletterTitle}>
        Join the List
      </h2>
      <p className={styles.newsletterSub}>
        Be first to know about promotions or product launches
      </p>
      <form
        className={styles.newsletterForm}
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="sr-only" htmlFor="be-email">
          Email address
        </label>
        <input
          id="be-email"
          type="email"
          name="email"
          placeholder="Your email"
          autoComplete="email"
        />
        <button type="submit">Join</button>
      </form>
    </section>
  );
}
