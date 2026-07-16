"use client";

import type { SupplierProfileDraft } from "./supplier-profile-shared";
import { SupplierProfileFields } from "./supplier-profile-shared";
import { MarketplaceAddSupplierBanner } from "./MarketplaceAddSupplierBanner";
import { SupplierDuplicateCheckPanel } from "./SupplierDuplicateCheckPanel";

export function NewSupplierForm({
  draft,
  onDraftChange,
  canViewMarketplace,
  onBrowseMarketplace,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
  canViewMarketplace: boolean;
  onBrowseMarketplace?: () => void;
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
            canViewMarketplace={canViewMarketplace}
          />
        }
      />
    </div>
  );
}
