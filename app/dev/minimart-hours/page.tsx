import { notFound } from "next/navigation";

import { MinimartHoursLanding } from "@/components/storefront/templates/landing/minimart-hours";

export default function MinimartHoursPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <MinimartHoursLanding
      storeName="Corner Quick Stop"
      templateId="minimart-hours"
      primaryHex="#0369A1"
      accentHex="#38BDF8"
      logoUrl="https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fit/sample.jpg"
      landingContent={{
        subheadline: "Snacks, drinks, and everyday essentials — open late.",
        ctaLabel: "Message us",
        hours: "Open 6:00 – 22:00, every day",
        address: "Corner of 4th and Main, Westlands",
        phone: "+254712000000",
        whatsapp: "254712000000",
      }}
    />
  );
}
