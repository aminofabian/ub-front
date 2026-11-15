"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  catalogCreateDraftHasWork,
  catalogCreateDraftSummary,
  CATALOG_CREATE_DRAFT_EVENT,
  clearCatalogProductCreateDraft,
  loadCatalogProductCreateDraft,
} from "../_lib/catalog-product-create-draft";
import { CATALOG_BTN_GHOST, CATALOG_BTN_PRIMARY } from "./catalog-chrome";

type Props = {
  businessId: string;
  hidden: boolean;
  onContinue: () => void;
  onDiscard: () => void;
};

export function CatalogCreateDraftBanner({
  businessId,
  hidden,
  onContinue,
  onDiscard,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const draft = loadCatalogProductCreateDraft(businessId);
      setSummary(
        draft && catalogCreateDraftHasWork(draft)
          ? catalogCreateDraftSummary(draft)
          : null,
      );
    };
    refresh();
    window.addEventListener(CATALOG_CREATE_DRAFT_EVENT, refresh);
    return () => window.removeEventListener(CATALOG_CREATE_DRAFT_EVENT, refresh);
  }, [businessId]);

  if (hidden || !summary) return null;

  const discard = () => {
    clearCatalogProductCreateDraft(businessId);
    onDiscard();
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[color-mix(in_srgb,var(--catalog-ink,#121A16)_10%,transparent)] bg-[color-mix(in_srgb,var(--catalog-primary,#1D4B3B)_6%,white)] px-3 py-2">
      <p className="min-w-0 flex-1 text-[12.5px] text-[var(--catalog-ink,#121A16)]">
        <span className="font-semibold">Draft.</span>{" "}
        <span className="text-[color-mix(in_srgb,var(--catalog-ink,#121A16)_72%,transparent)]">
          {summary} is saved on this device until you finish it.
        </span>
      </p>
      <Button type="button" className={CATALOG_BTN_PRIMARY} onClick={onContinue}>
        Continue
      </Button>
      <Button type="button" variant="ghost" className={CATALOG_BTN_GHOST} onClick={discard}>
        Discard
      </Button>
    </div>
  );
}
