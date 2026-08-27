"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CASHIER_TEMPLATE_CHANGED_EVENT,
  parseCashierTemplateId,
  readLocalCashierTemplate,
  resolveCashierTemplate,
  writeLocalCashierTemplate,
  type CashierTemplateId,
} from "@/lib/cashier-templates";
import {
  fetchTillDeviceMe,
  patchTillDeviceMe,
} from "@/lib/till-devices-api";
import { useMediaLg } from "@/hooks/use-media-lg";

/**
 * Resolves this browser's cashier chrome. Registered till row wins, then
 * localStorage, then shelf. Ledger only applies at lg+ so phones stay on Shelf.
 */
export function useCashierTemplate(branchId: string | null | undefined): {
  preferred: CashierTemplateId;
  effective: CashierTemplateId;
  isLedger: boolean;
  setTemplate: (id: CashierTemplateId) => Promise<void>;
} {
  const isLg = useMediaLg();
  const [local, setLocal] = useState<CashierTemplateId>(DEFAULT_LOCAL);
  const [registered, setRegistered] = useState<string | null>(null);

  const bid = branchId?.trim() || "";

  useEffect(() => {
    setLocal(readLocalCashierTemplate());
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<CashierTemplateId>).detail;
      setLocal(parseCashierTemplateId(detail ?? readLocalCashierTemplate()));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "ub.cashierTemplateId") return;
      setLocal(readLocalCashierTemplate());
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
    void fetchTillDeviceMe({ branchId: bid })
      .then((row) => {
        if (cancelled) return;
        setRegistered(row.cashierTemplate);
        setLocal(parseCashierTemplateId(row.cashierTemplate));
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
  const effective: CashierTemplateId =
    preferred === "ledger" && isLg ? "ledger" : "shelf";

  const setTemplate = useCallback(
    async (id: CashierTemplateId) => {
      const next = parseCashierTemplateId(id);
      writeLocalCashierTemplate(next);
      setLocal(next);
      if (!bid) return;
      try {
        const row = await patchTillDeviceMe({
          branchId: bid,
          cashierTemplate: next,
        });
        setRegistered(row.cashierTemplate);
      } catch {
        /* unregistered till keeps localStorage only */
      }
    },
    [bid],
  );

  return {
    preferred,
    effective,
    isLedger: effective === "ledger",
    setTemplate,
  };
}

const DEFAULT_LOCAL: CashierTemplateId = "shelf";
