"use client";

import type { MarketplaceAttachResult } from "@/lib/marketplace-api";

import type { SupplierProfileDraft } from "./supplier-profile-shared";
import { SupplierProfileFields } from "./supplier-profile-shared";
import { MarketplaceAddSupplierBanner } from "./MarketplaceAddSupplierBanner";
import { SupplierDuplicateCheckPanel } from "./SupplierDuplicateCheckPanel";

export function NewSupplierForm({
  draft,
  onDraftChange,
  lookupSupplierNumber,
  onLookupSupplierNumberChange,
  canViewMarketplace,
  canConnectMarketplace,
  onBrowseMarketplace,
  onAttached,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
  lookupSupplierNumber: string;
  onLookupSupplierNumberChange: (value: string) => void;
  canViewMarketplace: boolean;
  canConnectMarketplace: boolean;
  onBrowseMarketplace?: () => void;
  onAttached?: (result: MarketplaceAttachResult) => void;
}) {
  return (
    <div className="overflow-hidden border border-border bg-card">
      <MarketplaceAddSupplierBanner
        canViewMarketplace={canViewMarketplace}
        onBrowseMarketplace={onBrowseMarketplace}
      />

      <SupplierProfileFields
        mode="create"
        draft={draft}
        onDraftChange={onDraftChange}
        slotAfterIdentity={
          <SupplierDuplicateCheckPanel
            name={draft.name}
            taxId={draft.vatPin}
            phone={draft.contactPhone}
            email={draft.contactEmail}
            supplierNumber={lookupSupplierNumber}
            onSupplierNumberChange={onLookupSupplierNumberChange}
            canViewMarketplace={canViewMarketplace}
            canConnectMarketplace={canConnectMarketplace}
            onAttached={onAttached}
          />
        }
      />
    </div>
  );
}
