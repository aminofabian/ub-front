"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Package,
  Palette,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { getOnboardingQuestionnaireState } from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";
import { HubSectionLabel } from "@/components/business-hub/hub-section-label";

const POST_SETUP_CHECKLIST_DISMISSED_KEY = "post-setup-checklist-dismissed";

type PostSetupChecklistProps = {
  /** When known, stock item is marked done once count > 0. */
  catalogueCount?: number | null;
};

export function PostSetupChecklist({
  catalogueCount = null,
}: PostSetupChecklistProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const state = getOnboardingQuestionnaireState();
    if (state.status !== "completed") {
      return;
    }
    if (localStorage.getItem(POST_SETUP_CHECKLIST_DISMISSED_KEY) === "1") {
      return;
    }
    const updated = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
    const hoursSince = (Date.now() - updated) / (1000 * 60 * 60);
    if (hoursSince <= 48) {
      setShow(true);
    }
  }, []);

  if (!show) {
    return null;
  }

  const stocked = catalogueCount != null && catalogueCount > 0;

  const items = [
    {
      href: APP_ROUTES.products,
      label: stocked ? "Products on the shelf" : "Add your first products",
      desc: stocked
        ? "Your catalog has products. You can sell from the till."
        : "Name them, set a price, say how many you have.",
      icon: Package,
      done: stocked,
    },
    {
      href: APP_ROUTES.businessSettings,
      label: "Set up the storefront",
      desc: "Turn on the public shop so customers can browse on a phone.",
      icon: Store,
      done: false,
    },
    {
      href: APP_ROUTES.businessThemes,
      label: "Choose a look",
      desc: "Pick a theme so the shop feels like yours.",
      icon: Palette,
      done: false,
    },
    {
      href: APP_ROUTES.users,
      label: "Invite your staff",
      desc: "Add cashiers and managers so your team can help run the shop.",
      icon: Users,
      done: false,
    },
    ...(stocked
      ? [
          {
            href: APP_ROUTES.cashier,
            label: "Open the till",
            desc: "Sell when you are ready. The pulse fills in as money moves.",
            icon: ShoppingCart,
            done: false,
          },
        ]
      : []),
  ];

  return (
    <section className="hub-rise hub-rise-delay-5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <HubSectionLabel title="Getting started" />
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(POST_SETUP_CHECKLIST_DISMISSED_KEY, "1");
            setShow(false);
          }}
          className="text-xs font-medium text-[#888888] hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
      <div className={cn(HUB_SURFACE, "divide-y divide-[#E6E1D8]")}>
        {items.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#FCFAF6]",
              item.done && "opacity-60",
            )}
          >
            <item.icon
              className={cn(
                "size-3.5 shrink-0",
                item.done ? "text-[#0D9488]" : "text-[#B08D48]",
              )}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#141414]">
                {item.done ? `✓ ${item.label}` : item.label}
              </p>
              <p className="text-xs text-[#888888]">{item.desc}</p>
            </div>
            <ArrowRight
              className="ml-auto size-3.5 shrink-0 text-[#CCCCCC]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
