"use client";

import { OverviewDesk } from "../(console)/_components/overview-desk";
import type { SaPlatformOverview } from "@/lib/super-admin-api";

const SAMPLE: SaPlatformOverview = {
  tenants: { total: 48, active: 36, inactive: 12, createdLast7Days: 4, kioskPayActive: 19 },
  stuckSignups: {
    total: 7,
    sample: [
      { businessId: "1", businessName: "Mama Njeri Groceries", slug: "mama-njeri", email: "njeri@example.com", name: "Njeri Wanjiku", onboardingStatus: "invited", continueKind: "signup", lastLoginAt: null },
      { businessId: "2", businessName: "Kilimani Pharmacy", slug: "kilimani-pharmacy", email: "desk@example.com", name: "Amina Hassan", onboardingStatus: "onboarding", continueKind: "signup", lastLoginAt: null },
      { businessId: "3", businessName: "Westlands Hardware", slug: "westlands-hardware", email: "shop@example.com", name: "Peter Otieno", onboardingStatus: "pending", continueKind: "signup", lastLoginAt: null },
    ],
  },
  commerce: {
    salesToday: 42, revenueToday: 18640, unitsSoldToday: 310,
    salesLast30Days: 980, revenueLast30Days: 412000, unitsSoldLast30Days: 6400,
    unitsSoldAllTime: 88000, salesAllTime: 12000, revenueAllTime: 5400000,
  },
  storefront: {
    paidOrdersLast30Days: 64, paidGmvLast30Days: 92000, unitsSoldLast30Days: 210,
    paidOrdersAllTime: 540, paidGmvAllTime: 610000,
  },
  support: { openTenantThreads: 5, openVisitorThreads: 2, waitingOnAdmin: 3 },
  bestSellers: [
    { itemId: "a", itemName: "Unga wa Dola 2kg", businessId: "9", businessName: "Palmart Githurai", unitsSold: 420, revenue: 63000, saleCount: 400 },
    { itemId: "b", itemName: "Kabras Sugar 1kg", businessId: "9", businessName: "Palmart Githurai", unitsSold: 310, revenue: 46500, saleCount: 300 },
    { itemId: "c", itemName: "Fresh milk 500ml", businessId: "8", businessName: "Ruiru Mini Mart", unitsSold: 260, revenue: 18200, saleCount: 250 },
  ],
  hotTenants: [
    { businessId: "9", businessName: "Palmart Githurai", slug: "palmart-githurai", salesLast7Days: 180, revenueLast7Days: 96400, unitsLast7Days: 900 },
    { businessId: "8", businessName: "Ruiru Mini Mart", slug: "ruiru-mini", salesLast7Days: 96, revenueLast7Days: 41200, unitsLast7Days: 400 },
  ],
  last14Days: Array.from({ length: 14 }, (_, i) => ({
    day: `2026-11-${String(i + 8).padStart(2, "0")}`,
    sales: [4, 8, 12, 6, 18, 22, 9, 14, 11, 19, 7, 16, 21, 13][i] ?? 0,
    revenue: 8000,
    units: 40,
  })),
  recentTenants: [
    { id: "4", name: "Ngong Road Butchery", slug: "ngong-butchery", active: true, subscriptionTier: "growth", createdAt: "2026-11-20T08:00:00Z" },
    { id: "5", name: "Thika Road Wines", slug: "thika-wines", active: false, subscriptionTier: "starter", createdAt: "2026-11-18T08:00:00Z" },
  ],
};

export default function DeskPreviewPage() {
  return (
    <div className="sa-console min-h-screen bg-[#e6e6e6] p-3 sm:p-6">
      <div className="mx-auto max-w-[1400px] rounded-[22px] bg-white px-4 py-5 sm:px-6">
        <h1 className="text-[1.65rem] font-bold tracking-[-0.035em]">Overview</h1>
        <p className="mb-5 mt-1 text-[13px] text-[#5c5c5c]">
          What needs you now, what the fleet sold, and who is stuck before first sale.
        </p>
        <OverviewDesk data={SAMPLE} loading={false} />
      </div>
    </div>
  );
}
