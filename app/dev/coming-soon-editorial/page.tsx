import { notFound } from "next/navigation";

import { ComingSoonEditorialLanding } from "@/components/storefront/templates/landing/coming-soon-editorial";
import type { PublicCatalogItemCard, PublicCategory } from "@/lib/public-storefront";

const DEMO_ITEMS: PublicCatalogItemCard[] = [
  {
    id: "1",
    sku: "NB-A5",
    name: "Linen notebook",
    variantName: null,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_400,g_center/sample.jpg",
    price: 850,
  },
  {
    id: "2",
    sku: "PEN-01",
    name: "Gel pen set",
    variantName: null,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_400,g_center/balloons.jpg",
    price: 420,
  },
  {
    id: "3",
    sku: "WRAP-12",
    name: "Gift wrap roll",
    variantName: null,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_400,g_center/sample.jpg",
    price: 300,
  },
  {
    id: "4",
    sku: "CARD-08",
    name: "Greeting cards",
    variantName: null,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_400,g_center/balloons.jpg",
    price: 250,
  },
];

const DEMO_CATEGORIES: PublicCategory[] = [
  { id: "c1", name: "Notebooks", slug: "notebooks", parentId: null },
  { id: "c2", name: "Pens", slug: "pens", parentId: null },
  { id: "c3", name: "Gift wrap", slug: "gift-wrap", parentId: null },
  { id: "c4", name: "Cards", slug: "cards", parentId: null },
];

export default function ComingSoonEditorialPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <ComingSoonEditorialLanding
      storeName="Paper & Co"
      templateId="coming-soon-editorial"
      primaryHex="#0F766E"
      accentHex="#5EEAD4"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      currency="KES"
      countryCode="KE"
      totalCount={48}
      areaLabel="Westlands, Nairobi"
      catalogItems={DEMO_ITEMS}
      featured={DEMO_ITEMS}
      categories={DEMO_CATEGORIES}
      landingContent={{
        headline: "Opening soon on the high street",
        subheadline:
          "Stationery, gifts, and everyday desk essentials — curated at a counter you can actually walk up to.",
        hours: "Mon–Sat · 9am–6pm",
        address: "14 Riverside Lane, Westlands",
        phone: "+254712000000",
        whatsapp: "254712000000",
        ctaLabel: "Message us",
        vitrineImageUrl:
          "https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_800,g_center/sample.jpg",
      }}
      heroFallbackUrl="https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_800,g_center/sample.jpg"
    />
  );
}
