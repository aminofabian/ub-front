import { notFound } from "next/navigation";

import { FreshMarketLanding } from "@/components/storefront/templates/landing/fresh-market";

export default function FreshMarketPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <FreshMarketLanding
      storeName="Green Crate Market"
      templateId="fresh-market"
      primaryHex="#15803D"
      accentHex="#FACC15"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      landingContent={{
        headline: "Green Crate Market",
        subheadline:
          "Farm-fresh picks, stacked daily. Come early for the best crates and weekend boxes.",
        ctaLabel: "Order today's box",
        hours: "Open daily 6:30–19:00",
        address: "Market row, stall 12, Nairobi",
        phone: "+254712000000",
        whatsapp: "254712000000",
        vitrineImageUrl:
          "https://res.cloudinary.com/demo/image/upload/c_fill,w_1400,h_900,g_center/sample.jpg",
      }}
      categories={[
        { id: "1", name: "Seasonal produce", slug: "produce", parentId: null },
        { id: "2", name: "Dairy & eggs", slug: "dairy", parentId: null },
        { id: "3", name: "Fresh herbs", slug: "herbs", parentId: null },
        { id: "4", name: "Weekly specials", slug: "specials", parentId: null },
      ]}
    />
  );
}
