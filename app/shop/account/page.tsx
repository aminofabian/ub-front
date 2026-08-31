"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";

import { ShopAccountHub, SHOP_FLOOR_HREF } from "@/components/storefront/shop-account-hub";
import {
  buildStorefrontSignInHref,
  UnifiedSignInForm,
} from "@/components/storefront/storefront-sign-in-sheet";
import styles from "@/components/storefront/shop-account.module.css";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchBusiness, fetchMe, logoutRemote, type MeResponse } from "@/lib/api";
import { getSessionTokens, hasAccessSession } from "@/lib/auth";
import { isBuyerAccount } from "@/lib/buyer-role";
import { APP_ROUTES } from "@/lib/config";
import { destinationForShopAccountSignIn } from "@/lib/post-auth-destination";

type LoadState = "loading" | "guest" | "ready" | "error" | "routing";

export default function ShopAccountPage() {
  const router = useRouter();
  const { ready, hasSession } = useAuthenticatedSession({
    loginPath: buildStorefrontSignInHref({ next: APP_ROUTES.shopAccount }),
  });
  const [me, setMe] = useState<MeResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const routingRef = useRef(false);

  const sessionHint = hasSession;

  const leaveForRole = useCallback(
    async (profile: MeResponse) => {
      const business = await fetchBusiness().catch(() => null);
      const dest = destinationForShopAccountSignIn(profile, business);
      if (dest && dest !== APP_ROUTES.shopAccount) {
        routingRef.current = true;
        router.replace(dest);
        return true;
      }
      return false;
    },
    [router],
  );

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
      if (!isBuyerAccount(profile)) {
        const left = await leaveForRole(profile);
        if (left) return;
      }
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
  }, [hasSession, leaveForRole]);

  useEffect(() => {
    if (routingRef.current) return;
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
  const waitingOnProfile =
    state === "routing" ||
    (sessionHint && (state === "loading" || (!ready && state !== "guest")));

  if (waitingOnProfile) {
    return (
      <div className={styles.page}>
        <div className={styles.passbook} aria-busy="true">
          <div className={styles.passHead}>
            <h1 className={styles.hello}>
              {state === "routing" || (me && !isBuyerAccount(me))
                ? "Taking you to the right place"
                : "Loading your orders"}
            </h1>
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
                void (async () => {
                  routingRef.current = true;
                  setState("routing");
                  try {
                    const profile = await fetchMe();
                    const left = await leaveForRole(profile);
                    if (left) return;
                    routingRef.current = false;
                    setMe(profile);
                    setState("ready");
                    router.refresh();
                  } catch {
                    routingRef.current = false;
                    void loadMe();
                  }
                })();
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

  if (!me || !isBuyerAccount(me)) {
    return (
      <div className={styles.page}>
        <div className={styles.passbook} aria-busy="true">
          <div className={styles.passHead}>
            <h1 className={styles.hello}>
              {me && !isBuyerAccount(me)
                ? "Taking you to the right place"
                : "Loading your orders"}
            </h1>
          </div>
          <div className={styles.skel} />
        </div>
      </div>
    );
  }

  return <ShopAccountHub me={me} />;
}
