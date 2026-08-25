"use client";

import * as React from "react";
import { Headset, ShoppingBag } from "lucide-react";

import { StorefrontBuyerInbox } from "@/components/support/storefront-buyer-inbox";
import { SupportChat } from "@/components/support/support-chat";
import { cn } from "@/lib/utils";

type Tab = "platform" | "storefront";

export default function SupportPage() {
  const [tab, setTab] = React.useState<Tab>("platform");

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Support</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tab === "platform"
              ? "A direct line to the Kiosk team — replies land here live."
              : "Shoppers who started a chat on your storefront land here."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
          <button
            type="button"
            onClick={() => setTab("platform")}
            aria-pressed={tab === "platform"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
              tab === "platform" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
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
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
              tab === "storefront" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ShoppingBag className="size-3.5" aria-hidden />
            Storefront buyers
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {tab === "platform" ? (
          <div className="h-[calc(100dvh-13.25rem)] min-h-[440px]">
            <SupportChat />
          </div>
        ) : (
          <StorefrontBuyerInbox />
        )}
      </div>
    </div>
  );
}
