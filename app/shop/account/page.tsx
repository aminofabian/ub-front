"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut } from "lucide-react";

import { ShopAccountHub, SHOP_FLOOR_HREF, fmtMoney } from "@/components/storefront/shop-account-hub";
import { ShopperPhoneLogin } from "@/components/storefront/shop-phone-login";
import styles from "@/components/storefront/shop-account.module.css";
import { useAuthenticatedSession } from "@/hooks/use-authenticated-session";
import { fetchBusiness, fetchMe, logoutRemote, type MeResponse } from "@/lib/api";
import { getSessionTokens, hasAccessSession } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

type LoadState = "loading" | "guest" | "ready" | "error";

export default function ShopAccountPage() {
  const router = useRouter();
  const { ready, hasSession } = useAuthenticatedSession({ loginPath: APP_ROUTES.login });
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

  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopAccount)}&mode=email`;
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
            <h1 className={styles.hello}>Your number is your account</h1>
            <p className={styles.lead}>
              If you already buy on tab here, you&apos;re already a customer. Verify the phone,
              enter or set a PIN, and you&apos;re in.
            </p>
          </div>
          <div className={styles.passTop}>
            <div className={styles.stamp}>
              <ShopperPhoneLogin
                variant="passbook"
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
            <Link href={loginHref} className={styles.quiet}>
              Use email instead
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
