import { notFound } from "next/navigation";

import { FrontWindowLanding } from "@/components/storefront/templates/landing/front-window";

export default function FrontWindowPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <FrontWindowLanding
      storeName="Paper & Co"
      templateId="front-window"
      primaryHex="#2F6F6A"
      landingContent={{
        phone: "+254712000000",
        whatsapp: "254712000000",
      }}
    />
  );
}
