"use client";

import type { SupplierProfileDraft } from "./supplier-profile-shared";
import { SupplierProfileFields } from "./supplier-profile-shared";
import { MarketplaceAddSupplierBanner } from "./MarketplaceAddSupplierBanner";
import { SupplierDuplicateCheckPanel } from "./SupplierDuplicateCheckPanel";
import { supKicker } from "./supplier-ui-tokens";

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
    <div className="space-y-8">
      <MarketplaceAddSupplierBanner
        canViewMarketplace={canViewMarketplace}
        onBrowseMarketplace={onBrowseMarketplace}
      />

      <section className="space-y-3 border-t border-border/45 pt-6">
        <div>
          <p className={supKicker}>Private supplier</p>
          <p className="mt-1 text-xs text-muted-foreground">
            For vendors without a marketplace profile, or one-off local records. Name
            is required; commercial fields can wait until after create.
          </p>
        </div>
      </section>

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
