import { notFound } from "next/navigation";

import { ButcheryCutLanding } from "@/components/storefront/templates/landing/butchery-cut";

export default function ButcheryCutPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <ButcheryCutLanding
      storeName="Nairobi Butchery"
      templateId="butchery-cut"
      primaryHex="#292524"
      accentHex="#EA580C"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      landingContent={{
        headline: "Nairobi Butchery cuts",
        subheadline:
          "Order by phone — we cut to your preference, wrap fresh, and hold for pickup.",
        ctaLabel: "Call to order",
        hours: "Tue–Sun 6:00–18:00",
        address: "Counter service · no appointment needed",
        phone: "+254712000000",
        whatsapp: "254712000000",
        vitrineImageUrl:
          "https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_1000,g_center/sample.jpg",
      }}
      categories={[
        { id: "1", name: "Beef stew", slug: "beef", parentId: null },
        { id: "2", name: "Goat chops", slug: "goat", parentId: null },
        { id: "3", name: "Chicken", slug: "chicken", parentId: null },
        { id: "4", name: "Mince", slug: "mince", parentId: null },
        { id: "5", name: "Offal", slug: "offal", parentId: null },
        { id: "6", name: "Sausages", slug: "sausages", parentId: null },
      ]}
    />
  );
}
