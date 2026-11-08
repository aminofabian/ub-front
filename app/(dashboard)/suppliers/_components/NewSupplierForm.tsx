"use client";

import type { SupplierDuplicateMatch } from "@/lib/marketplace-api";
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
  onChooseSupplier,
  onOpenSupplier,
  onIdentityConflictChange,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
  lookupSupplierNumber: string;
  onLookupSupplierNumberChange: (value: string) => void;
  canViewMarketplace: boolean;
  canConnectMarketplace: boolean;
  onBrowseMarketplace?: () => void;
  /** An existing supplier was picked from the suggestions. */
  onChooseSupplier?: (match: SupplierDuplicateMatch) => void;
  onOpenSupplier?: (localSupplierId: string) => void;
  onIdentityConflictChange?: (match: SupplierDuplicateMatch | null) => void;
}) {
  const lookupPhone = draft.contactPhone.trim() || draft.payoutPhone.trim();

  return (
    <div className="space-y-3">
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
            phone={lookupPhone}
            email={draft.contactEmail}
            supplierNumber={lookupSupplierNumber}
            onSupplierNumberChange={onLookupSupplierNumberChange}
            canViewMarketplace={canViewMarketplace}
            canConnectMarketplace={canConnectMarketplace}
            onChooseSupplier={onChooseSupplier}
            onOpenSupplier={onOpenSupplier}
            onIdentityConflictChange={onIdentityConflictChange}
          />
        }
      />
    </div>
  );
}
