import { notFound } from "next/navigation";

import { ComingSoonShopLanding } from "@/components/storefront/templates/landing/coming-soon-shop";
import type { PublicCatalogItemCard, PublicCategory } from "@/lib/public-storefront";

const DEMO_ITEMS: PublicCatalogItemCard[] = [
  {
    id: "1",
    sku: "TEE-01",
    name: "Heavyweight tee",
    variantName: "Black / M",
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_750,g_center/sample.jpg",
    price: 3200,
  },
  {
    id: "2",
    sku: "TEE-02",
    name: "Heavyweight tee",
    variantName: "Sand / L",
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_750,g_center/balloons.jpg",
    price: 3200,
  },
  {
    id: "3",
    sku: "CAP-01",
    name: "Six-panel cap",
    variantName: null,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_750,g_center/sample.jpg",
    price: 1800,
  },
  {
    id: "4",
    sku: "TOT-01",
    name: "Canvas tote",
    variantName: null,
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_750,g_center/balloons.jpg",
    price: 2400,
  },
  {
    id: "5",
    sku: "SOX-01",
    name: "Ribbed socks",
    variantName: "2-pack",
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_750,g_center/sample.jpg",
    price: 900,
  },
  {
    id: "6",
    sku: "HOD-01",
    name: "Zip hoodie",
    variantName: "Charcoal / M",
    imageUrl:
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_600,h_750,g_center/balloons.jpg",
    price: 5800,
  },
];

const DEMO_CATEGORIES: PublicCategory[] = [
  { id: "c1", name: "Tees", slug: "tees", parentId: null },
  { id: "c2", name: "Headwear", slug: "headwear", parentId: null },
  { id: "c3", name: "Bags", slug: "bags", parentId: null },
];

export default function ComingSoonShopPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <ComingSoonShopLanding
      storeName="Blank Drop"
      templateId="coming-soon-shop"
      primaryHex="#171717"
      accentHex="#737373"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      currency="KES"
      countryCode="KE"
      totalCount={24}
      areaLabel="Westlands, Nairobi"
      catalogItems={DEMO_ITEMS}
      featured={DEMO_ITEMS}
      categories={DEMO_CATEGORIES}
      landingContent={{
        subheadline: "Browse the shelf. Bag opens on launch day.",
        hours: "Opening soon · Mon–Sat",
        address: "Westlands, Nairobi",
        phone: "+254712000000",
        whatsapp: "254712000000",
      }}
      heroFallbackUrl="https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_800,g_center/sample.jpg"
    />
  );
}
