"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";

import { ShopAccountHub, SHOP_FLOOR_HREF } from "@/components/storefront/shop-account-hub";
import {
  buildStorefrontSignInHref,
  UnifiedSignInForm,
} from "@/components/storefront/storefront-sign-in-sheet";
import styles from "@/components/storefront/shop-account.module.css";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchMe, logoutRemote, type MeResponse } from "@/lib/api";
import { getSessionTokens, hasAccessSession } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

type LoadState = "loading" | "guest" | "ready" | "error";

export default function ShopAccountPage() {
  const router = useRouter();
  const { ready, hasSession } = useAuthenticatedSession({
    loginPath: buildStorefrontSignInHref({ next: APP_ROUTES.shopAccount }),
  });
  const [me, setMe] = useState<MeResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const sessionHint = hasSession;

  const loadMe = useCallback(async () => {
    const live = hasAccessSession() || Boolean(getSessionTokens()) || hasSession;
    if (!live) {
      setMe(null);
      setState("guest");
      return;
    }
    setState("loading");
    try {
      const profile = await fetchMe();
      setMe(profile);
      setState("ready");
    } catch {
      if (!hasAccessSession() && !getSessionTokens()) {
        setMe(null);
        setState("guest");
        return;
      }
      setMe(null);
      setState("error");
    }
  }, [hasSession]);

  useEffect(() => {
    if (!sessionHint) {
      setState("guest");
      return;
    }
    if (!ready) return;
    void loadMe();
  }, [loadMe, ready, sessionHint]);

  useEffect(() => {
    if (!sessionHint || ready) return;
    const id = window.setTimeout(() => {
      if (!hasAccessSession() && !getSessionTokens()) {
        setState("guest");
      }
    }, 3500);
    return () => window.clearTimeout(id);
  }, [ready, sessionHint]);

  const onLogout = async () => {
    await logoutRemote();
    setMe(null);
    setState("guest");
    router.refresh();
  };

  const loginHref = buildStorefrontSignInHref({ next: APP_ROUTES.shopAccount });
  const waitingOnProfile = sessionHint && (state === "loading" || (!ready && state !== "guest"));

  if (waitingOnProfile) {
    return (
      <div className={styles.page}>
        <div className={styles.passbook} aria-busy="true">
          <div className={styles.passHead}>
            <h1 className={styles.hello}>Loading your orders</h1>
            <p className={styles.lead}>This only takes a moment.</p>
          </div>
          <div className={styles.skel} />
        </div>
      </div>
    );
  }

  if (state === "guest" || !sessionHint) {
    return (
      <div className={styles.page}>
        <article className={styles.passbook}>
          <div className={styles.passHead}>
            <h1 className={styles.hello}>See your orders</h1>
            <p className={styles.lead}>
              Sign in with the email or phone on your account. Receipts, store
              credit, and your tab show up here.
            </p>
          </div>
          <div className={styles.guestBody}>
            <UnifiedSignInForm
              onSignedIn={() => {
                void loadMe();
                router.refresh();
              }}
            />
          </div>
          <div className={styles.actions}>
            <Link href={SHOP_FLOOR_HREF} className={styles.cta}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to the shop
            </Link>
          </div>
        </article>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={styles.page}>
        <article className={styles.passbook}>
          <div className={styles.passHead}>
            <h1 className={styles.hello}>We couldn&apos;t open your account</h1>
            <p className={styles.lead}>
              Your session may have expired. Sign in again, or keep shopping.
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cta} onClick={() => void loadMe()}>
              Try again
            </button>
            <Link href={loginHref} className={styles.ghost}>
              Sign in again
            </Link>
            <Link href={SHOP_FLOOR_HREF} className={styles.quiet}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to the shop
            </Link>
            <button type="button" className={styles.quiet} onClick={() => void onLogout()}>
              <LogOut className="size-4" aria-hidden />
              Clear session
            </button>
          </div>
        </article>
      </div>
    );
  }

  if (!me) {
    return (
      <div className={styles.page}>
        <div className={styles.passbook} aria-busy="true">
          <div className={styles.passHead}>
            <h1 className={styles.hello}>Loading your orders</h1>
          </div>
          <div className={styles.skel} />
        </div>
      </div>
    );
  }

  return <ShopAccountHub me={me} />;
}
