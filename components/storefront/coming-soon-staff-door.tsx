"use client";

import { useEffect, useState, type MouseEvent } from "react";

import styles from "@/components/storefront/shop-storefront-coming-soon.module.css";
import { useStorefrontSignIn } from "@/components/storefront/storefront-sign-in-sheet";
import { LANDING_STAFF_LOGIN_HREF } from "@/components/storefront/templates/landing/shared";
import { useClientHasSession, useClientSessionReady } from "@/hooks/use-client-session";
import { fetchBusiness, fetchMe } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";

type Door = {
  href: string;
  title: string;
  detail: string;
  signedIn: boolean;
};

const SIGNED_OUT: Door = {
  href: LANDING_STAFF_LOGIN_HREF,
  title: "Shop or cashier",
  detail: "Staff sign in",
  signedIn: false,
};

export function ComingSoonStaffDoor() {
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const { available, open } = useStorefrontSignIn();
  const [door, setDoor] = useState<Door>(SIGNED_OUT);

  useEffect(() => {
    if (!ready || !hasSession) {
      setDoor(SIGNED_OUT);
      return;
    }
    let cancelled = false;
    void loadStaffDoor().then((next) => {
      if (!cancelled) setDoor(next);
    });
    return () => {
      cancelled = true;
    };
  }, [hasSession, ready]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (door.signedIn || !available) return;
    event.preventDefault();
    open({ reason: "landing", door: "staff", next: APP_ROUTES.business });
  };

  return (
    <a className={styles.staffDoor} href={door.href} onClick={onClick}>
      <span className={styles.staffDoorTitle}>{door.title}</span>
      <span className={styles.staffDoorDetail}>{door.detail}</span>
    </a>
  );
}

async function loadStaffDoor(): Promise<Door> {
  try {
    const me = await fetchMe({ toast: false });
    const business = await fetchBusiness({ toast: false }).catch(() => null);
    const href = resolvePostAuthDestination(me, APP_ROUTES.business, business);
    if (isShopperPath(href)) return SIGNED_OUT;
    return { href, signedIn: true, ...staffDoorCopy(href) };
  } catch {
    return SIGNED_OUT;
  }
}

function isShopperPath(href: string): boolean {
  return href === "/" || href.startsWith("/shop");
}

function staffDoorCopy(href: string): { title: string; detail: string } {
  if (href.startsWith(APP_ROUTES.cashier) || href.startsWith(APP_ROUTES.shifts)) {
    return { title: "Open the cashier", detail: "Clock in, then sell" };
  }
  if (href.startsWith(APP_ROUTES.business) || href.startsWith(APP_ROUTES.overview)) {
    return { title: "Open the shop", detail: "Business" };
  }
  return { title: "Open your work", detail: "Staff" };
}
