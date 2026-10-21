"use client";

import * as React from "react";
import { Headset, Lock, ShoppingBag, Ticket } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { StorefrontBuyerInbox } from "@/components/support/storefront-buyer-inbox";
import { SupportChat } from "@/components/support/support-chat";
import { TenantServingTickets } from "@/components/support/tenant-serving-tickets";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Tab = "platform" | "storefront" | "tickets";

function parseTab(raw: string | null): Tab {
  if (raw === "storefront" || raw === "tickets" || raw === "platform") return raw;
  return "platform";
}

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me } = useDashboard();
  const tab = parseTab(searchParams.get("tab"));
  const conversationId = searchParams.get("c")?.trim() || null;
  const canViewStorefront = hasPermission(
    me?.permissions,
    Permission.MessagesRead,
  );
  const canReplyStorefront = hasPermission(
    me?.permissions,
    Permission.MessagesReply,
  );

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "platform") params.delete("tab");
    else params.set("tab", next);
    if (next !== "storefront") params.delete("c");
    const qs = params.toString();
    router.replace(qs ? `/support?${qs}` : "/support", { scroll: false });
  }

  return (
    <div
      className={cn(
        DASHBOARD_MAX,
        // Fill the dashboard main so the thread scrolls inside the chat and
        // the composer stays on screen. From xl, Ask Guide sits on the bottom
        // right — leave room so it does not cover the message box.
        "h-full min-h-0 overflow-hidden pb-0 xl:pb-16",
      )}
    >
      <DashboardPageHero
        icon={Headset}
        title="Support"
        description={
          tab === "platform"
            ? "A direct line to the Kiosk team — replies land here live."
            : tab === "tickets"
              ? "Kiosk tickets for this shop. Each issue has a number and an owner."
              : "Shoppers who started a chat on your storefront land here."
        }
      >
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("platform")}
            aria-pressed={tab === "platform"}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-3",
              tab === "platform"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Headset className="size-3.5" aria-hidden />
            <span className="sm:hidden">Support</span>
            <span className="hidden sm:inline">Kiosk support</span>
          </button>
          {canViewStorefront ? (
            <button
              type="button"
              onClick={() => setTab("storefront")}
              aria-pressed={tab === "storefront"}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-3",
                tab === "storefront"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ShoppingBag className="size-3.5" aria-hidden />
              <span className="sm:hidden">Buyers</span>
              <span className="hidden sm:inline">Storefront buyers</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTab("tickets")}
            aria-pressed={tab === "tickets"}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-3",
              tab === "tickets"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Ticket className="size-3.5" aria-hidden />
            Tickets
          </button>
        </div>
      </DashboardPageHero>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "platform" ? (
          <SupportChat />
        ) : tab === "tickets" ? (
          <TenantServingTickets />
        ) : canViewStorefront ? (
          <StorefrontBuyerInbox
            initialConversationId={conversationId}
            canReply={canReplyStorefront}
          />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center px-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-[15px] font-semibold text-foreground">
                Storefront buyer chats are restricted
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Ask the shop owner or an admin to grant you the Messages
                permission to read and reply to shoppers.
              </p>
              <button
                type="button"
                onClick={() => setTab("platform")}
                className="mt-4 inline-flex h-8 items-center justify-center rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Back to Kiosk support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
