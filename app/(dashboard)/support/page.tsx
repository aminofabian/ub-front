"use client";

import * as React from "react";
import { Headset, ShoppingBag, Ticket } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  DASHBOARD_MAX,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { StorefrontBuyerInbox } from "@/components/support/storefront-buyer-inbox";
import { SupportChat } from "@/components/support/support-chat";
import { TenantServingTickets } from "@/components/support/tenant-serving-tickets";
import { cn } from "@/lib/utils";

type Tab = "platform" | "storefront" | "tickets";

function parseTab(raw: string | null): Tab {
  if (raw === "storefront" || raw === "tickets" || raw === "platform") return raw;
  return "platform";
}

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const conversationId = searchParams.get("c")?.trim() || null;

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "platform") params.delete("tab");
    else params.set("tab", next);
    if (next !== "storefront") params.delete("c");
    const qs = params.toString();
    router.replace(qs ? `/support?${qs}` : "/support", { scroll: false });
  }

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Headset}
        title="Support"
        description={
          tab === "platform"
            ? "A direct line to the Kiosk team — replies land here live."
            : tab === "tickets"
              ? "Palmart tickets for this shop. Each issue has a number and an owner."
              : "Shoppers who started a chat on your storefront land here."
        }
      >
        <div className="flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-0.5">
          <button
            type="button"
            onClick={() => setTab("platform")}
            aria-pressed={tab === "platform"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-none px-3 text-xs font-medium transition-colors",
              tab === "platform"
                ? "border border-[#0f766e] text-[#0f766e]"
                : "text-muted-foreground hover:text-[#0f766e]",
            )}
          >
            <Headset className="size-3.5" aria-hidden />
            Kiosk support
          </button>
          <button
            type="button"
            onClick={() => setTab("storefront")}
            aria-pressed={tab === "storefront"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-none px-3 text-xs font-medium transition-colors",
              tab === "storefront"
                ? "border border-[#0f766e] text-[#0f766e]"
                : "text-muted-foreground hover:text-[#0f766e]",
            )}
          >
            <ShoppingBag className="size-3.5" aria-hidden />
            Storefront buyers
          </button>
          <button
            type="button"
            onClick={() => setTab("tickets")}
            aria-pressed={tab === "tickets"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-none px-3 text-xs font-medium transition-colors",
              tab === "tickets"
                ? "border border-[#0f766e] text-[#0f766e]"
                : "text-muted-foreground hover:text-[#0f766e]",
            )}
          >
            <Ticket className="size-3.5" aria-hidden />
            Tickets
          </button>
        </div>
      </DashboardPageHero>
      <div className="min-h-0 flex-1">
        {tab === "platform" ? (
          <div className="h-[calc(100dvh-13.25rem)] min-h-[440px]">
            <SupportChat />
          </div>
        ) : tab === "tickets" ? (
          <TenantServingTickets />
        ) : (
          <StorefrontBuyerInbox initialConversationId={conversationId} />
        )}
      </div>
    </div>
  );
}
