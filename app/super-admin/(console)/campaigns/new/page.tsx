"use client";

import { Suspense } from "react";

import { CampaignsCommandCentre } from "@/components/super-admin/campaigns/campaigns-workspace";

export default function SuperAdminCampaignComposePage() {
  return (
    <Suspense fallback={null}>
      <CampaignsCommandCentre initialMode="compose" />
    </Suspense>
  );
}
