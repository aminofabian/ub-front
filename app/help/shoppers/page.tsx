import type { Metadata } from "next";

import { HelpAudiencePage } from "@/components/help/help-pages";
import { helpAudienceMetadata } from "@/lib/help/seo";

export const metadata: Metadata = helpAudienceMetadata("shoppers");

export default function ShoppersHelpPage() {
  return <HelpAudiencePage audience="shoppers" />;
}
