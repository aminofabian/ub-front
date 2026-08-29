import { notFound } from "next/navigation";

import { BrandPosterLanding } from "@/components/storefront/templates/landing/brand-poster";

export default function BrandPosterNightPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <BrandPosterLanding
      storeName="Paper & Co"
      templateId="brand-poster"
      primaryHex="#C4A574"
      accentHex="#8B3A2E"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      landingContent={{
        headline: "Opening this autumn",
        subheadline:
          "Handmade stationery, thoughtful gifts, and a quiet corner to browse.",
        ctaLabel: "Message us",
        hours: "Mon–Sat · 9am–6pm",
        address: "14 Riverside Lane, Westlands, Nairobi",
        phone: "+254712000000",
        whatsapp: "254712000000",
        vitrineImageUrl:
          "https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_520,g_center/sample.jpg",
        posterTagline: "Est. 2024 · Nairobi",
        posterEditionText: "No. 01",
        posterTone: "night",
        posterSecondaryImageUrl:
          "https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_500,g_center/balloons.jpg",
      }}
    />
  );
}
