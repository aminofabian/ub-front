"use client";

import { useState } from "react";

import styles from "@/components/storefront/templates/store/oxide.module.css";

export function OxideSignup() {
  const [done, setDone] = useState(false);

  return (
    <section className={styles.section} id="spec">
      <div className={styles.signup} id="signup">
        <div>
          <h3>Get the next dispatch before it&apos;s gone.</h3>
          <p>
            Restock alerts, spec sheets, and early access to numbered runs. One
            email a week, never more.
          </p>
        </div>
        {done ? (
          <p className={styles.mono} style={{ letterSpacing: "0.08em" }}>
            You&apos;re on the list.
          </p>
        ) : (
          <form
            className={styles.signupForm}
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <input type="email" placeholder="your@email.com" required />
            <button type="submit">Subscribe →</button>
          </form>
        )}
      </div>
    </section>
  );
}
