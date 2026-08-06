"use client";

import { useState } from "react";

import styles from "@/components/storefront/templates/store/tint-lab.module.css";

export function TintLabSignup() {
  const [done, setDone] = useState(false);

  return (
    <section className={styles.section} id="signup">
      <div className={styles.signup}>
        <div>
          <h3>Find your shade before it sells out.</h3>
          <p>
            New formulas, restock alerts, and the occasional honest opinion about
            what&apos;s actually worth your money.
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
            <button type="submit">Join →</button>
          </form>
        )}
      </div>
    </section>
  );
}
