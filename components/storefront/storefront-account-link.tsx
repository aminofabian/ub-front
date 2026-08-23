"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import styles from "@/components/storefront/storefront-account-link.module.css";
import { useStorefrontSignIn } from "@/components/storefront/storefront-sign-in-sheet";
import {
  useClientHasSession,
  useClientSessionReady,
} from "@/hooks/use-client-session";
import { APP_ROUTES } from "@/lib/config";
import { isShopNextPath } from "@/lib/post-auth-destination";
import { useSessionRestoreFailed } from "@/lib/session-restore-status";

const nextParam = `next=${encodeURIComponent(APP_ROUTES.shopAccount)}`;

export const STOREFRONT_LOGIN_HREF = `${APP_ROUTES.login}?${nextParam}`;
export const STOREFRONT_SIGNUP_HREF = `${APP_ROUTES.signup}?${nextParam}`;

/**
 * Account entry point for storefront theme headers: signed-in shoppers go to
 * their account, everyone else is sent to sign in (which links on to sign up).
 *
 * Phase 2 (D3): the login/signup `next` becomes the *current* path (allowlisted,
 * including the host root `/`) so signing in returns the shopper to the page
 * they were reading; the account page is the fallback. When the sign-in sheet
 * provider is mounted and hydrated, clicks are intercepted and the sheet opens
 * in place instead of navigating.
 */
export function useStorefrontAccountLink(): {
  signedIn: boolean;
  href: string;
  label: string;
  signUpHref: string;
  /**
   * Click handler for the account link. Prevents navigation and opens the sheet
   * when it is available; a no-op otherwise so the `<a href>` fallback wins.
   */
  onActivate: (event: MouseEvent<HTMLAnchorElement>) => void;
} {
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const restoreFailed = useSessionRestoreFailed();
  const pathname = usePathname();
  const { ready: sheetReady, open, hasPresence } = useStorefrontSignIn();

  // D8 (§10): the server-rendered presence hint keeps the signed-in label
  // through hydration; a failed cookie-only restore downgrades it to
  // "Sign in" once the client knows the hint is stale.
  const clientSignedIn = ready && hasSession;
  const signedIn = clientSignedIn || (hasPresence && !restoreFailed);

  const next = isShopNextPath(pathname) ? pathname : APP_ROUTES.shopAccount;
  const nextQuery = encodeURIComponent(next);

  const onActivate = (event: MouseEvent<HTMLAnchorElement>) => {
    // Signed-in shoppers go straight to the account page — no sheet. The
    // optimistic presence hint is not enough: clicks during the restore window
    // open the sheet, which is the right door for a possibly-stale hint.
    if (clientSignedIn || !sheetReady) {
      return;
    }
    event.preventDefault();
    open({ reason: "header", next });
  };

  return {
    signedIn,
    href: signedIn ? APP_ROUTES.shopAccount : `${APP_ROUTES.login}?next=${nextQuery}`,
    label: signedIn ? "Account" : "Sign in",
    signUpHref: `${APP_ROUTES.signup}?next=${nextQuery}`,
    onActivate,
  };
}

export function StorefrontAccountLink({
  className,
  signUpClassName,
  signUpLabel = "Sign up",
  children,
}: {
  className?: string;
  /** Set to also render a sign-up link for signed-out shoppers. */
  signUpClassName?: string;
  signUpLabel?: string;
  /** Theme glyph rendered instead of the text label. */
  children?: ReactNode;
}) {
  const { href, label, signedIn, signUpHref, onActivate } =
    useStorefrontAccountLink();

  return (
    <>
      <Link href={href} className={className} aria-label={label} onClick={onActivate}>
        {children ?? label}
      </Link>
      {signUpClassName && !signedIn ? (
        <span className={styles.signUpWrap}>
          <Link href={signUpHref} className={signUpClassName}>
            {signUpLabel}
          </Link>
        </span>
      ) : null}
    </>
  );
}
