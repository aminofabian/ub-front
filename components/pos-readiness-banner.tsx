"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Banknote, MonitorSmartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { fetchCurrentShift } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { hasPermission, Permission } from "@/lib/permissions";
import type { PosGuidanceKind } from "@/lib/problem";
import {
  POS_GUIDANCE_EVENT,
  POS_GUIDANCE_RESOLVED_EVENT,
  requestOpenPosShift,
  requestOpenRegisterTill,
  type PosGuidanceDetail,
} from "@/lib/pos-guidance";
import { fetchTillDeviceMe } from "@/lib/till-devices-api";
import { cn } from "@/lib/utils";

const COPY: Record<
  PosGuidanceKind,
  { icon: typeof MonitorSmartphone; message: string }
> = {
  "register-till": {
    icon: MonitorSmartphone,
    message: "This browser isn’t a registered till yet — sales won’t stick.",
  },
  "open-shift": {
    icon: Banknote,
    message: "No shift is open on this register — count the float before selling.",
  },
};

/**
 * Slim amber strip for till setup gaps (register device, open shift).
 * Replaces repeated error toasts so cashiers always see what to fix next.
 */
export function PosReadinessBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnlineStatus();
  const { me, branchId } = useDashboard();
  const [active, setActive] = useState<Set<PosGuidanceKind>>(() => new Set());

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const canRegisterTill =
    hasPermission(me?.permissions, Permission.BusinessManageSettings) ||
    roleKey === "owner" ||
    roleKey === "admin";
  const canOpenShift =
    hasPermission(me?.permissions, Permission.ShiftsOpen) ||
    roleKey === "owner" ||
    roleKey === "admin";

  const bid = branchId?.trim() ?? "";

  const markActive = useCallback((kind: PosGuidanceKind) => {
    setActive((prev) => {
      if (prev.has(kind)) return prev;
      const next = new Set(prev);
      next.add(kind);
      return next;
    });
  }, []);

  const markResolved = useCallback((kind: PosGuidanceKind) => {
    setActive((prev) => {
      if (!prev.has(kind)) return prev;
      const next = new Set(prev);
      next.delete(kind);
      return next;
    });
  }, []);

  useEffect(() => {
    const onGuidance = (event: Event) => {
      const kind = (event as CustomEvent<PosGuidanceDetail>).detail?.kind;
      if (kind === "register-till" || kind === "open-shift") {
        markActive(kind);
      }
    };
    const onResolved = (event: Event) => {
      const kind = (event as CustomEvent<PosGuidanceDetail>).detail?.kind;
      if (kind === "register-till" || kind === "open-shift") {
        markResolved(kind);
      }
    };
    window.addEventListener(POS_GUIDANCE_EVENT, onGuidance);
    window.addEventListener(POS_GUIDANCE_RESOLVED_EVENT, onResolved);
    return () => {
      window.removeEventListener(POS_GUIDANCE_EVENT, onGuidance);
      window.removeEventListener(POS_GUIDANCE_RESOLVED_EVENT, onResolved);
    };
  }, [markActive, markResolved]);

  useEffect(() => {
    if (!bid || !online) {
      return;
    }
    let cancelled = false;

    void fetchTillDeviceMe({ branchId: bid, toast: false })
      .then(() => {
        if (!cancelled) markResolved("register-till");
      })
      .catch(() => {
        if (!cancelled) markActive("register-till");
      });

    void fetchCurrentShift(bid, { toast: false })
      .then((shift) => {
        if (!cancelled) {
          if (shift.status === "open") {
            markResolved("open-shift");
          } else {
            markActive("open-shift");
          }
        }
      })
      .catch(() => {
        if (!cancelled) markActive("open-shift");
      });

    return () => {
      cancelled = true;
    };
  }, [bid, online, markActive, markResolved]);

  const onCashierRoute = pathname === APP_ROUTES.cashier;

  const onOpenShift = useCallback(() => {
    if (onCashierRoute) {
      requestOpenPosShift();
      return;
    }
    router.push(APP_ROUTES.shifts);
  }, [onCashierRoute, router]);

  const rows = useMemo(() => {
    const kinds: PosGuidanceKind[] = [];
    if (active.has("register-till")) kinds.push("register-till");
    if (active.has("open-shift")) kinds.push("open-shift");
    return kinds;
  }, [active]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="shrink-0 border-b border-amber-400/35 bg-amber-50 text-amber-950 dark:border-amber-600/30 dark:bg-amber-950/35 dark:text-amber-50"
    >
      <ul className="divide-y divide-amber-400/20 dark:divide-amber-600/20">
        {rows.map((kind) => {
          const { icon: Icon, message } = COPY[kind];
          return (
            <li
              key={kind}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:px-4"
            >
              <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <p className="min-w-0 flex-1 text-[11px] leading-snug sm:text-xs">
                {message}
              </p>
              {kind === "register-till" ? (
                canRegisterTill ? (
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 text-[11px] font-semibold underline underline-offset-2",
                      "decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-200/50",
                    )}
                    onClick={requestOpenRegisterTill}
                  >
                    Register this till →
                  </button>
                ) : (
                  <Link
                    href={APP_ROUTES.helpOpenCashier}
                    className={cn(
                      "shrink-0 text-[11px] font-semibold underline underline-offset-2",
                      "decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-200/50",
                    )}
                  >
                    How to register →
                  </Link>
                )
              ) : canOpenShift ? (
                <button
                  type="button"
                  className={cn(
                    "shrink-0 text-[11px] font-semibold underline underline-offset-2",
                    "decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-200/50",
                  )}
                  onClick={onOpenShift}
                >
                  {onCashierRoute ? "Open shift here →" : "Open a shift →"}
                </button>
              ) : (
                <Link
                  href={APP_ROUTES.helpOpenCashier}
                  className={cn(
                    "shrink-0 text-[11px] font-semibold underline underline-offset-2",
                    "decoration-amber-700/50 hover:decoration-amber-900 dark:decoration-amber-200/50",
                  )}
                >
                  Shift setup guide →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
