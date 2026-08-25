"use client";

import { useParams } from "next/navigation";

import { AuthAlert } from "@/components/auth/auth-alert";
import { CampaignsCommandCentre } from "@/components/super-admin/campaigns/campaigns-workspace";

export default function SuperAdminCampaignDetailPage() {
  const params = useParams();
  const idRaw = params.id;
  const id = typeof idRaw === "string" ? idRaw : Array.isArray(idRaw) ? idRaw[0] : "";
  if (!id) {
    return <AuthAlert variant="error">Missing campaign id.</AuthAlert>;
  }
  return <CampaignsCommandCentre initialMode="analytics" campaignId={id} />;
}
