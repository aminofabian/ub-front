"use client";

import dynamic from "next/dynamic";

const StaffPayPortal = dynamic(
  () =>
    import("@/components/payroll/staff-pay-portal").then(
      (mod) => mod.StaffPayPortal,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your pay details…
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

export function StaffPayPortalLoader({
  branding,
  phoneSegment,
  backHref,
}: {
  branding: Branding;
  phoneSegment?: string | null;
  backHref?: string | null;
}) {
  return (
    <StaffPayPortal
      branding={branding}
      phoneSegment={phoneSegment}
      backHref={backHref}
    />
  );
}
