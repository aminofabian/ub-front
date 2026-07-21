"use client";

import dynamic from "next/dynamic";

const CustomerTabPortal = dynamic(
  () =>
    import("@/components/credits/customer-tab-portal").then(
      (mod) => mod.CustomerTabPortal,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f1ea] text-sm text-stone-500">
        Loading your tab…
      </div>
    ),
  },
);

type Branding = {
  shopName: string;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
};

export function CustomerTabPortalLoader({
  phoneSegment,
  branding,
}: {
  phoneSegment: string;
  branding: Branding;
}) {
  return <CustomerTabPortal phoneSegment={phoneSegment} branding={branding} />;
}
