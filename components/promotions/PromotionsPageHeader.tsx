"use client";

import { BarChart3, Megaphone, Plus, RefreshCw, Settings2 } from "lucide-react";

import {
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import {
  supBtnPrimary,
  supHeroGlowAccent,
  supHeroGlowPrimary,
  supHeroSection,
} from "./promotions-ui-tokens";

export function PromotionsPageHeader({
  loading,
  onRefresh,
  onCreate,
}: {
  loading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}) {
  return (
    <section className={cn(supHeroSection, "shrink-0")}>
      <div className={supHeroGlowPrimary} aria-hidden />
      <div className={supHeroGlowAccent} aria-hidden />
      <div className="relative">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <DashboardPageHero
            compact
            icon={Megaphone}
            eyebrow="Business"
            title="Promotions"
            description={
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Reach registered shoppers with flash sales and weekly deals. Create,
                schedule, pause, and review delivery — quiet hours and daily limits
                still apply automatically.
              </p>
            }
          />
          <div className="flex shrink-0 flex-wrap gap-2 lg:pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-1.5 rounded-lg px-3.5 font-medium shadow-sm"
              disabled={loading}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn("size-3.5", loading && "animate-spin")}
                aria-hidden
              />
              Refresh
            </Button>
            <Button
              type="button"
              className={cn(supBtnPrimary, "hidden sm:inline-flex")}
              onClick={onCreate}
            >
              <Plus className="size-4" aria-hidden />
              New promotion
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-border/45 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <DashboardQuickLinks
            compact
            links={[
              {
                href: APP_ROUTES.business,
                label: "Business",
                desc: "Settings",
                icon: Settings2,
              },
              {
                href: APP_ROUTES.analytics,
                label: "Analytics",
                desc: "Sales impact",
                icon: BarChart3,
              },
            ]}
          />
          <p className="hidden text-xs leading-relaxed text-muted-foreground sm:block sm:max-w-xs sm:text-right">
            Tip: start with a template, pick your audience, then save as draft or
            schedule for later.
          </p>
        </div>
      </div>
    </section>
  );
}
