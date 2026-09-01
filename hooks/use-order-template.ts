"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ORDER_TEMPLATE_CHANGED_EVENT,
  parseOrderTemplateId,
  readLocalOrderTemplate,
  writeLocalOrderTemplate,
  type OrderTemplateId,
} from "@/lib/order-templates";
import { useMediaLg } from "@/hooks/use-media-lg";

/**
 * Resolves this browser's order workspace layout. Ledger only applies at lg+
 * so phones stay on Shelf.
 */
export function useOrderTemplate(): {
  preferred: OrderTemplateId;
  effective: OrderTemplateId;
  isLedger: boolean;
  setTemplate: (id: OrderTemplateId) => void;
} {
  const isLg = useMediaLg();
  const [local, setLocal] = useState<OrderTemplateId>("shelf");

  useEffect(() => {
    setLocal(readLocalOrderTemplate());
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<OrderTemplateId>).detail;
      setLocal(parseOrderTemplateId(detail ?? readLocalOrderTemplate()));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "ub.orderTemplateId") return;
      setLocal(readLocalOrderTemplate());
    };
    window.addEventListener(ORDER_TEMPLATE_CHANGED_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ORDER_TEMPLATE_CHANGED_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const effective: OrderTemplateId =
    local === "ledger" && isLg ? "ledger" : "shelf";

  const setTemplate = useCallback((id: OrderTemplateId) => {
    const next = parseOrderTemplateId(id);
    writeLocalOrderTemplate(next);
    setLocal(next);
  }, []);

  return {
    preferred: local,
    effective,
    isLedger: effective === "ledger",
    setTemplate,
  };
}
