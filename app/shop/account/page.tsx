"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";

import { ShopAccountHub, SHOP_FLOOR_HREF, fmtMoney } from "@/components/storefront/shop-account-hub";
import {
  buildStorefrontSignInHref,
  UnifiedSignInForm,
} from "@/components/storefront/storefront-sign-in-sheet";
import styles from "@/components/storefront/shop-account.module.css";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchBusiness, fetchMe, logoutRemote, type MeResponse } from "@/lib/api";
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
  const [peekCurrency, setPeekCurrency] = useState<string | undefined>();

  const loadMe = useCallback(async () => {
    const live = hasAccessSession() || Boolean(getSessionTokens()) || hasSession;
    if (!live) {
      setMe(null);
      setState("guest");
      return;
    }
    setState("loading");
    try {
      const [business, profile] = await Promise.all([
        fetchBusiness().catch(() => null),
        fetchMe(),
      ]);
      setPeekCurrency(business?.currency?.trim() || undefined);
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
    if (!ready) return;
    void loadMe();
  }, [loadMe, ready]);

  const onLogout = async () => {
    await logoutRemote();
    setMe(null);
    setState("guest");
    router.refresh();
  };

  const loginHref = buildStorefrontSignInHref({ next: APP_ROUTES.shopAccount });
  const currency = peekCurrency ?? "KES";

  if (!ready || state === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div>
            <div className={styles.spin} aria-hidden />
            Opening your passbook…
          </div>
        </div>
      </div>
    );
  }

  if (state === "guest") {
    return (
      <div className={styles.page}>
        <article className={styles.passbook}>
          <div className={styles.passHead}>
            <h1 className={styles.hello}>Sign in to your account</h1>
            <p className={styles.lead}>
              Email or phone, then your PIN or password — no separate login page.
            </p>
          </div>
          <div className={styles.passTop}>
            <div className={styles.stamp}>
              <UnifiedSignInForm
                onSignedIn={() => {
                  void loadMe();
                  router.refresh();
                }}
              />
            </div>
          </div>
          <dl className={styles.strip}>
            <div className={styles.cell}>
              <dt>Wallet</dt>
              <dd>
                {fmtMoney(0, currency)}
                <span className={styles.cellHint}>Store credit</span>
              </dd>
            </div>
            <div className={styles.cell}>
              <dt>Points</dt>
              <dd>
                0
                <span className={styles.cellHint}>Loyalty</span>
              </dd>
            </div>
            <div className={styles.cell}>
              <dt>Tab</dt>
              <dd>
                {fmtMoney(0, currency)}
                <span className={styles.cellHint}>Owed at the till</span>
              </dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <Link href={SHOP_FLOOR_HREF} className={styles.quiet}>
              Continue shopping
            </Link>
          </div>
        </article>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={styles.page}>
        <h1 className={styles.hello}>Your account</h1>
        <p className={styles.alert} role="alert">
          We couldn&apos;t load your profile — your session may have expired.
        </p>
        <div className={styles.toolbar}>
          <button type="button" className={styles.cta} onClick={() => void loadMe()}>
            Retry
          </button>
          <Link href={loginHref} className={styles.ghost}>
            Sign in again
          </Link>
          <Link href={SHOP_FLOOR_HREF} className={styles.quiet}>
            <ArrowLeft className="size-4" aria-hidden />
            Continue shopping
          </Link>
          <button type="button" className={styles.quiet} onClick={() => void onLogout()}>
            <LogOut className="size-4" aria-hidden />
            Clear session
          </button>
        </div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return <ShopAccountHub me={me} />;
}
