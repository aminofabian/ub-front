"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { useClientHasSession, useClientSessionReady } from "@/hooks/use-client-session";
import { isBuyerAccount } from "@/lib/buyer-role";
import { resolveButcheryOnlyRedirect } from "@/lib/butcher-only-access";
import { resolvePostAuthDestination, roleLandingRedirect } from "@/lib/post-auth-destination";

/**
 * Role-based and butchery-only route guards for the main dashboard shell.
 */
export function DashboardAccessRedirects() {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useClientSessionReady();
  const hasSession = useClientHasSession();
  const { me, business, loading } = useDashboard();

  useEffect(() => {
    if (!ready || !hasSession || loading || !me) {
      return;
    }

    if (isBuyerAccount(me)) {
      router.replace(resolvePostAuthDestination(me, null, business));
      return;
    }

    const roleRedirect = roleLandingRedirect(me, pathname, business);
    if (roleRedirect) {
      router.replace(roleRedirect);
      return;
    }

    const butcherRedirect = resolveButcheryOnlyRedirect(pathname, business);
    if (butcherRedirect) {
      router.replace(butcherRedirect);
    }
  }, [ready, hasSession, loading, me, business, pathname, router]);

  return null;
}
