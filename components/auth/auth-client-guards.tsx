"use client";

import { useEffect } from "react";

/**
 * Auth pages must reach the API directly. A stale cashier PWA service worker
 * can cache broken JS bundles or intercept GET /api/* — both cause sign-in to
 * reload without ever POSTing to the backend (common on older iPad Safari).
 */
export function AuthClientGuards() {
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
