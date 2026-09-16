"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import styles from "@/components/storefront/storefront-account-link.module.css";
import { useStorefrontSignIn, buildStorefrontSignInHref, type StorefrontSignInPhase } from "@/components/storefront/storefront-sign-in-sheet";
import {
  useClientHasSession,
  useClientSessionReady,
} from "@/hooks/use-client-session";
import { APP_ROUTES } from "@/lib/config";
import { isShopNextPath } from "@/lib/post-auth-destination";
import { useSessionRestoreFailed } from "@/lib/session-restore-status";

export const STOREFRONT_LOGIN_HREF = buildStorefrontSignInHref({
  next: APP_ROUTES.shopAccount,
});
export const STOREFRONT_SIGNUP_HREF = buildStorefrontSignInHref({
  next: APP_ROUTES.shopAccount,
  signup: true,
});

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
  /**
   * Click handler for the sign-up link. Same contract, but opens the sheet on
   * the create-account form — the two doors used to be the same URL, so a
   * shopper who tapped "Sign up" got a sign-in form.
   */
  onSignUpActivate: (event: MouseEvent<HTMLAnchorElement>) => void;
} {
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const restoreFailed = useSessionRestoreFailed();
  const pathname = usePathname();
  const { available, open, hasPresence } = useStorefrontSignIn();

  // D8 (§10): the server-rendered presence hint keeps the signed-in label
  // through hydration; a failed cookie-only restore downgrades it to
  // "Sign in" once the client knows the hint is stale.
  const clientSignedIn = ready && hasSession;
  const signedIn = clientSignedIn || (hasPresence && !restoreFailed);

  const next = isShopNextPath(pathname) ? pathname : APP_ROUTES.shopAccount;

  const openFor = (
    event: MouseEvent<HTMLAnchorElement>,
    phase: StorefrontSignInPhase,
  ) => {
    // Signed-in shoppers go straight to the account page — no sheet. The
    // optimistic presence hint is not enough: clicks during the restore window
    // open the sheet, which is the right door for a possibly-stale hint.
    if (clientSignedIn) {
      return;
    }
    if (!available) {
      return;
    }
    event.preventDefault();
    open({ reason: "header", next, initialPhase: phase });
  };

  return {
    signedIn,
    href: signedIn
      ? APP_ROUTES.shopAccount
      : buildStorefrontSignInHref({ path: next, next }),
    label: signedIn ? "Account" : "Sign in",
    signUpHref: buildStorefrontSignInHref({ path: next, next, signup: true }),
    onActivate: (event) => openFor(event, "credentials"),
    onSignUpActivate: (event) => openFor(event, "signup"),
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
  const { href, label, signedIn, signUpHref, onActivate, onSignUpActivate } =
    useStorefrontAccountLink();

  return (
    <>
      <Link href={href} className={className} aria-label={label} onClick={onActivate}>
        {children ?? label}
      </Link>
      {signUpClassName && !signedIn ? (
        <span className={styles.signUpWrap}>
          <Link
            href={signUpHref}
            className={signUpClassName}
            onClick={onSignUpActivate}
          >
            {signUpLabel}
          </Link>
        </span>
      ) : null}
    </>
  );
}

/**
 * Sign-up door for surfaces that render their own markup — the newsletter and
 * subscribe panels in the store themes.
 *
 * Same contract as {@link useStorefrontAccountLink}: the `<a href>` works without
 * JS, and the click opens the sheet on the create-account form when the provider
 * is mounted. `label`/`href` flip to the account page for a signed-in shopper, so
 * a panel never offers to create an account that already exists.
 *
 * These panels used to be forms that stored nothing, so a shopper could
 * "subscribe", see a confirmation, and never become a record (F8).
 */
export function useStorefrontSignUpDoor(): {
  href: string;
  label: string;
  onActivate: (event: MouseEvent<HTMLAnchorElement>) => void;
} {
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const restoreFailed = useSessionRestoreFailed();
  const pathname = usePathname();
  const { available, open, hasPresence } = useStorefrontSignIn();

  const clientSignedIn = ready && hasSession;
  const signedIn = clientSignedIn || (hasPresence && !restoreFailed);
  const next = isShopNextPath(pathname) ? pathname : APP_ROUTES.shopAccount;

  return {
    href: signedIn
      ? APP_ROUTES.shopAccount
      : buildStorefrontSignInHref({ path: next, next, signup: true }),
    label: signedIn ? "Your account" : "Create an account",
    onActivate: (event) => {
      if (signedIn || !available) {
        return;
      }
      event.preventDefault();
      // "header" is the in-chrome bucket: not apex, not landing, so the sheet
      // keeps the shopper on the page they signed up from.
      open({ reason: "header", next, initialPhase: "signup" });
    },
  };
}
