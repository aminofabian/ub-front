"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";
import { fetchPublicBookingInfo } from "@/lib/public-booking";

import styles from "./shop-booking.module.css";

const HIDDEN_ON = [APP_ROUTES.shopBook, APP_ROUTES.shopCart, APP_ROUTES.shopCheckout];

/**
 * A "Book a visit" button on every storefront page of a shop that takes bookings online, whatever
 * theme it wears. The shop is asked once per browser session; shops that do not take bookings
 * (most retail shops) never show it.
 */
export function ShopBookLauncher({ slug }: { slug: string | null }) {
  const pathname = usePathname();
  const [takesBookings, setTakesBookings] = useState(false);
  // The service landing page already has the booking on it: no button needed there.
  const [onLanding, setOnLanding] = useState(false);
  useEffect(() => {
    setOnLanding(Boolean(document.querySelector("[data-booking-landing]")));
  }, [pathname]);

  useEffect(() => {
    if (!slug) return;
    const key = `kiosk.booking.${slug}`;
    let known: string | null = null;
    try {
      known = window.sessionStorage.getItem(key);
    } catch {
      // Private browsing may refuse storage; ask the shop instead.
    }
    if (known != null) {
      setTakesBookings(known === "1");
      return;
    }
    let live = true;
    void fetchPublicBookingInfo(slug)
      .then((info) => {
        const yes = Boolean(info && info.services.length > 0);
        try {
          window.sessionStorage.setItem(key, yes ? "1" : "0");
        } catch {
          // Nothing to remember it in; the answer still stands for this page.
        }
        if (live) setTakesBookings(yes);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [slug]);

  if (!takesBookings || onLanding || HIDDEN_ON.some((path) => pathname === path || pathname?.startsWith(`${path}/`))) return null;
  return (
    <Link href={APP_ROUTES.shopBook} className={styles.launcher}>
      <CalendarDays className="size-5" aria-hidden />
      Book a visit
    </Link>
  );
}
