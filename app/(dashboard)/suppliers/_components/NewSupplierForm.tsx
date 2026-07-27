"use client";

import type {
  MarketplaceAttachResult,
  SupplierDuplicateMatch,
} from "@/lib/marketplace-api";

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
  onIdentityConflictChange,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
  lookupSupplierNumber: string;
  onLookupSupplierNumberChange: (value: string) => void;
  canViewMarketplace: boolean;
  canConnectMarketplace: boolean;
  onBrowseMarketplace?: () => void;
  onAttached?: (result: MarketplaceAttachResult) => void;
  onIdentityConflictChange?: (match: SupplierDuplicateMatch | null) => void;
}) {
  const lookupPhone = draft.contactPhone.trim() || draft.payoutPhone.trim();

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
            phone={lookupPhone}
            email={draft.contactEmail}
            supplierNumber={lookupSupplierNumber}
            onSupplierNumberChange={onLookupSupplierNumberChange}
            canViewMarketplace={canViewMarketplace}
            canConnectMarketplace={canConnectMarketplace}
            onAttached={onAttached}
            onIdentityConflictChange={onIdentityConflictChange}
          />
        }
      />
    </div>
  );
}
