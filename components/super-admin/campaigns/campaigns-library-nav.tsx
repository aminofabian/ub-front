"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { CampaignNavId, CampaignType } from "./campaigns-model";

const NAV: { id: CampaignNavId; label: string; section: string }[] = [
  { section: "Workspace", id: "overview", label: "Overview" },
  { section: "Workspace", id: "all", label: "All campaigns" },
  { section: "Workspace", id: "drafts", label: "Drafts" },
  { section: "Workspace", id: "scheduled", label: "Scheduled" },
  { section: "Workspace", id: "sending", label: "Sending" },
  { section: "Workspace", id: "sent", label: "Sent" },
  { section: "Workspace", id: "archived", label: "Archived" },
  { section: "Saved", id: "templates", label: "Templates" },
  { section: "Saved", id: "audiences", label: "Saved audiences" },
  { section: "Saved", id: "library", label: "Previous campaigns" },
  { section: "Saved", id: "ai-drafts", label: "AI drafts" },
  { section: "Automations", id: "automations", label: "Automations" },
  { section: "People", id: "people", label: "Merchants" },
];

const TYPES: { id: CampaignType; label: string }[] = [
  { id: "onboarding", label: "Onboarding" },
  { id: "announcement", label: "Product announcement" },
  { id: "re-engagement", label: "Re-engagement" },
  { id: "feature", label: "Feature announcement" },
  { id: "promotional", label: "Promotional" },
  { id: "educational", label: "Educational" },
  { id: "transactional", label: "Transactional" },
  { id: "custom", label: "Custom" },
];

export function CampaignsLibraryNav({
  nav,
  typeChip,
  liveAudience,
  activeCount,
  scheduledCount,
  onNav,
  onCreate,
  onType,
}: {
  nav: CampaignNavId;
  typeChip: CampaignType | "all";
  liveAudience: number | null;
  activeCount: number;
  scheduledCount: number;
  onNav: (id: CampaignNavId) => void;
  onCreate: () => void;
  onType: (t: CampaignType | "all") => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[#F7F7F5]">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-3">
        <p className="text-sm font-semibold text-foreground">Campaigns</p>
        <Button size="sm" className="h-8 gap-1 px-2.5 text-xs" type="button" onClick={onCreate}>
          <Plus className="size-3.5" />
          Create
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 text-[13px]">
        {["Workspace", "Saved", "Automations", "People"].map((section) => (
          <div key={section} className="mb-4">
            <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {section}
            </p>
            {NAV.filter((n) => n.section === section).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNav(item.id)}
                className={cn(
                  "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-muted-foreground transition-colors",
                  "hover:bg-white hover:text-foreground",
                  nav === item.id && "bg-white font-medium text-foreground shadow-sm",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="mb-4">
          <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Campaign types
          </p>
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onType(t.id)}
              className={cn(
                "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-muted-foreground hover:bg-white hover:text-foreground",
                typeChip === t.id && "bg-white font-medium text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="border-t border-border/70 px-3 py-3 text-[12px] text-muted-foreground">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide">Campaign health</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            {(liveAudience ?? 0).toLocaleString()} contacts
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            {activeCount} active campaigns
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-sky-600" />
            {scheduledCount} scheduled
          </li>
        </ul>
      </div>
    </div>
  );
}
