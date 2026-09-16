"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useOptionalDashboard } from "@/components/dashboard-provider";
import {
  CASHIER_TEMPLATE_CHANGED_EVENT,
  CASHIER_TEMPLATE_STORAGE_KEY,
  clearLocalCashierTemplate,
  parseCashierTemplateId,
  readLocalCashierTemplateOrNull,
  resolveCashierTemplate,
  writeLocalCashierTemplate,
  type CashierTemplateId,
} from "@/lib/cashier-templates";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  fetchTillDeviceMe,
  patchTillDeviceMe,
  tillDeviceErrorMessage,
} from "@/lib/till-devices-api";

/**
 * Resolves this browser's cashier chrome. Registered till row wins, then
 * localStorage, then shelf.
 *
 * The ledger renders a compact single-column till below `lg` (stacked line
 * rows, slide-up payment panel), so it is a valid choice on any screen.
 *
 * Changing the till's row needs `business.manage_settings`; a cashier can still
 * switch *their own* screen, saved on this device only — never a 403 in their
 * face for a preference they are allowed to hold.
 */
export function useCashierTemplate(branchId: string | null | undefined): {
  preferred: CashierTemplateId;
  effective: CashierTemplateId;
  isLedger: boolean;
  setTemplate: (id: CashierTemplateId) => Promise<void>;
  /** False when this user may only change the template on this device. */
  canPersistToTill: boolean;
  /** Set when a permitted till update still failed (offline, revoked till…). */
  tillUpdateError: string | null;
  /** This device's explicit pick, or null when it follows the till. */
  localPick: CashierTemplateId | null;
  /** The registered till row's template, or null when unregistered/unknown. */
  registeredTemplate: CashierTemplateId | null;
  /** Drops the device pick so the registered till's template applies again. */
  followTill: () => void;
} {
  const dashboard = useOptionalDashboard();
  const me = dashboard?.me;
  const [local, setLocal] = useState<CashierTemplateId | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);
  const [tillUpdateError, setTillUpdateError] = useState<string | null>(null);

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  /**
   * Owner/admin/settings may write the registered till row. While the session
   * is still loading we do not pre-empt: the request goes out and the backend
   * decides, so an owner is never blocked by a race.
   */
  const mayWriteTillRow =
    me == null ||
    roleKey === "owner" ||
    roleKey === "admin" ||
    hasPermission(me.permissions, Permission.BusinessManageSettings);

  const bid = branchId?.trim() || "";

  useEffect(() => {
    setLocal(readLocalCashierTemplateOrNull());
    const onLocal = () => setLocal(readLocalCashierTemplateOrNull());
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CASHIER_TEMPLATE_STORAGE_KEY) return;
      setLocal(readLocalCashierTemplateOrNull());
    };
    window.addEventListener(CASHIER_TEMPLATE_CHANGED_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CASHIER_TEMPLATE_CHANGED_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!bid) {
      setRegistered(null);
      return;
    }
    let cancelled = false;
    void fetchTillDeviceMe({ branchId: bid, toast: false })
      .then((row) => {
        if (cancelled) return;
        // The row is the till's default, never this browser's pick — writing it
        // into local storage would silently override the cashier's own choice.
        setRegistered(row.cashierTemplate);
      })
      .catch(() => {
        if (!cancelled) setRegistered(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bid]);

  const preferred = useMemo(
    () => resolveCashierTemplate({ registered, local }),
    [registered, local],
  );
  const effective: CashierTemplateId = preferred;

  const setTemplate = useCallback(
    async (id: CashierTemplateId) => {
      const next = parseCashierTemplateId(id);
      setTillUpdateError(null);
      writeLocalCashierTemplate(next);
      setLocal(next);
      if (!bid || !mayWriteTillRow) return;
      try {
        const row = await patchTillDeviceMe({
          branchId: bid,
          cashierTemplate: next,
        });
        setRegistered(row.cashierTemplate);
      } catch (e) {
        /* Local pick still applies; the till row keeps its own value. */
        setTillUpdateError(
          e instanceof Error && /access|forbidden|403/i.test(e.message)
            ? "Your role cannot set the till default"
            : tillDeviceErrorMessage(e),
        );
      }
    },
    [bid, mayWriteTillRow],
  );

  const followTill = useCallback(() => {
    setTillUpdateError(null);
    clearLocalCashierTemplate();
    setLocal(null);
  }, []);

  return {
    preferred,
    effective,
    isLedger: effective === "ledger",
    setTemplate,
    canPersistToTill: mayWriteTillRow,
    tillUpdateError,
    localPick: local,
    registeredTemplate:
      registered != null && registered.trim() !== ""
        ? parseCashierTemplateId(registered)
        : null,
    followTill,
  };
}

