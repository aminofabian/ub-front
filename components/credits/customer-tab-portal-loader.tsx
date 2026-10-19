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
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 bg-[#F4F1EA] px-6 text-center">
        <p
          className="text-[1.65rem] font-normal tracking-[-0.02em] text-[#121A16]"
          style={{
            fontFamily:
              'var(--font-cormorant), Georgia, "Times New Roman", serif',
          }}
        >
          Your tab
        </p>
        <p className="text-[13px] text-[#556159]">Opening the standing…</p>
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
