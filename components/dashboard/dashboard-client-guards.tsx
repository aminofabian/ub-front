"use client";

import { useEffect } from "react";

/** Drop stale PWA workers so dashboard API calls are not intercepted. */
export function DashboardClientGuards() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
  }, []);

  return null;
}
