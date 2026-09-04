import { Suspense } from "react";

import { CustomerEmailCampaignComposer } from "@/components/credits/customer-email-campaign-composer";

export default function NewCustomerEmailCampaignPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CustomerEmailCampaignComposer />
    </Suspense>
  );
}
