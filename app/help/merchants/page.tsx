import type { Metadata } from "next";

import { HelpAudiencePage } from "@/components/help/help-pages";
import { helpAudienceMetadata } from "@/lib/help/seo";

export const metadata: Metadata = helpAudienceMetadata("merchants");

export default function MerchantsHelpPage() {
  return <HelpAudiencePage audience="merchants" />;
}
