import { CustomerEmailCampaignDetailView } from "@/components/credits/customer-email-campaign-detail";

export default async function CustomerEmailCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerEmailCampaignDetailView campaignId={id} />;
}
