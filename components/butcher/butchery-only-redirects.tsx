"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { resolveButcheryOnlyRedirect } from "@/lib/butcher-only-access";

/**
 * Keeps butchery-only tenants inside the butcher workspace when they hit generic
 * dashboard routes (overview, business settings, etc.).
 */
export function ButcheryOnlyRedirects() {
  const router = useRouter();
  const pathname = usePathname();
  const { business, loading } = useDashboard();

  useEffect(() => {
    if (loading) {
      return;
    }
    const redirect = resolveButcheryOnlyRedirect(pathname, business);
    if (redirect) {
      router.replace(redirect);
    }
  }, [business, loading, pathname, router]);

  return null;
}
