"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/components/storefront/storefront-account-link.module.css";
import {
  useClientHasSession,
  useClientSessionReady,
} from "@/hooks/use-client-session";
import { APP_ROUTES } from "@/lib/config";

const nextParam = `next=${encodeURIComponent(APP_ROUTES.shopAccount)}`;

export const STOREFRONT_LOGIN_HREF = `${APP_ROUTES.login}?${nextParam}`;
export const STOREFRONT_SIGNUP_HREF = `${APP_ROUTES.signup}?${nextParam}`;

/**
 * Account entry point for storefront theme headers: signed-in shoppers go to
 * their account, everyone else is sent to sign in (which links on to sign up).
 */
export function useStorefrontAccountLink(): {
  signedIn: boolean;
  href: string;
  label: string;
  signUpHref: string;
} {
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const signedIn = ready && hasSession;

  return {
    signedIn,
    href: signedIn ? APP_ROUTES.shopAccount : STOREFRONT_LOGIN_HREF,
    label: !ready || signedIn ? "Account" : "Sign in",
    signUpHref: STOREFRONT_SIGNUP_HREF,
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
  const { href, label, signedIn, signUpHref } = useStorefrontAccountLink();

  return (
    <>
      <Link href={href} className={className} aria-label={label}>
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
