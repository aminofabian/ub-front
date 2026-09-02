"use client";

import { useCallback, useEffect, useState } from "react";

import {
  MARKETPLACE_TEMPLATE_CHANGED_EVENT,
  MARKETPLACE_TEMPLATE_STORAGE_KEY,
  parseMarketplaceTemplateId,
  readLocalMarketplaceTemplate,
  writeLocalMarketplaceTemplate,
  type MarketplaceTemplateId,
} from "@/lib/marketplace-templates";

/**
 * Resolves this browser's marketplace catalogue layout. Ledger is available
 * at every width: a dense list is the point on phones as well as desktops.
 */
export function useMarketplaceTemplate(): {
  preferred: MarketplaceTemplateId;
  effective: MarketplaceTemplateId;
  isLedger: boolean;
  setTemplate: (id: MarketplaceTemplateId) => void;
} {
  const [local, setLocal] = useState<MarketplaceTemplateId>("shelf");

  useEffect(() => {
    setLocal(readLocalMarketplaceTemplate());
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<MarketplaceTemplateId>).detail;
      setLocal(parseMarketplaceTemplateId(detail ?? readLocalMarketplaceTemplate()));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== MARKETPLACE_TEMPLATE_STORAGE_KEY) return;
      setLocal(readLocalMarketplaceTemplate());
    };
    window.addEventListener(MARKETPLACE_TEMPLATE_CHANGED_EVENT, onLocal);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MARKETPLACE_TEMPLATE_CHANGED_EVENT, onLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTemplate = useCallback((id: MarketplaceTemplateId) => {
    const next = parseMarketplaceTemplateId(id);
    writeLocalMarketplaceTemplate(next);
    setLocal(next);
  }, []);

  return {
    preferred: local,
    effective: local,
    isLedger: local === "ledger",
    setTemplate,
  };
}
