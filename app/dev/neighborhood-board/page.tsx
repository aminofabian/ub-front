import { notFound } from "next/navigation";

import { NeighborhoodBoardLanding } from "@/components/storefront/templates/landing/neighborhood-board";

export default function NeighborhoodBoardPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <NeighborhoodBoardLanding
      storeName="Mama Grace Provisions"
      templateId="neighborhood-board"
      primaryHex="#B45309"
      accentHex="#D97706"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      landingContent={{
        headline: "We're on your corner",
        subheadline:
          "Fresh produce, pantry staples, and household basics — the kind of shop where we know your name.",
        ctaLabel: "Order on WhatsApp",
        hours: "Mon–Sat 7:00–21:00 · Sun 8:00–18:00",
        address: "Kibera Road, near the stage, Nairobi",
        phone: "+254712000000",
        whatsapp: "254712000000",
        vitrineImageUrl:
          "https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,g_center/sample.jpg",
      }}
    />
  );
}
