"use client";

import { Button } from "@/components/ui/button";
import type { SaEmailRecipientRow } from "@/lib/super-admin-api";

import {
  AI_SUGGESTIONS,
  estimateAudience,
  rewriteBody,
} from "./campaigns-model";
import type { WorkspaceMode } from "./campaigns-model";

export function CampaignsAiPanel({
  mode,
  person,
  prompt,
  onPrompt,
  onGenerate,
  onRewrite,
  liveAudience,
  filters,
  onUseSuggestion,
}: {
  mode: WorkspaceMode;
  person: SaEmailRecipientRow | null;
  prompt: string;
  onPrompt: (v: string) => void;
  onGenerate: () => void;
  onRewrite: (m: Parameters<typeof rewriteBody>[1]) => void;
  liveAudience: number | null;
  filters: string[];
  onUseSuggestion: (ids: string[]) => void;
}) {
  const audience = estimateAudience(liveAudience);

  if (mode === "people" && person) {
    return <PersonCard person={person} />;
  }

  return (
    <div className="flex h-full flex-col border-l border-border/70 bg-white">
      <div className="border-b border-border/70 px-3 py-3">
        <p className="text-sm font-semibold">Kiosk AI</p>
        <p className="text-xs text-muted-foreground">
          Edits the campaign you&apos;re writing — not a sidecar draft.
        </p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div>
          <p className="mb-1.5 text-xs font-medium">What would you like to send?</p>
          <textarea
            value={prompt}
            onChange={(e) => onPrompt(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-border/80 px-3 py-2 text-[13px] outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
          />
          <Button type="button" size="sm" className="mt-2 w-full" onClick={onGenerate}>
            Generate campaign
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["shorter", "Make shorter"],
              ["friendlier", "Friendlier"],
              ["professional", "More professional"],
              ["persuasive", "More persuasive"],
              ["urgency", "Add urgency"],
              ["simplify", "Simplify"],
              ["kenyan", "Kenyan tone"],
              ["regenerate", "Regenerate"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => onRewrite(k)}
              className="rounded-md border border-border/80 px-2 py-1 text-[11px] hover:bg-[#F7F7F5]"
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium">Audience</p>
          <p className="text-2xl font-semibold tabular-nums">
            {audience.merchants.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">merchants · {filters.length} filters</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium">Audience suggestions</p>
          <ul className="space-y-2">
            {AI_SUGGESTIONS.map((s) => (
              <li key={s.id} className="rounded-lg border border-border/70 p-2.5">
                <p className="text-[13px] font-medium leading-snug">{s.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {s.why}
                </p>
                <button
                  type="button"
                  className="mt-1.5 text-[12px] font-medium text-emerald-800"
                  onClick={() => onUseSuggestion(s.filters)}
                >
                  Use audience
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: SaEmailRecipientRow }) {
  return (
    <div className="h-full overflow-y-auto border-l border-border/70 bg-white p-4 text-sm">
      <p className="font-semibold">{person.businessName}</p>
      <p className="text-muted-foreground">{person.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{person.email || "No email"}</p>
      <ul className="mt-4 space-y-1 text-muted-foreground">
        <li>Status: {person.userStatus}</li>
        <li>Onboarding: {person.onboardingStatus}</li>
        {person.lastLoginAt ? <li>Last login: {person.lastLoginAt}</li> : null}
        {person.skipReason ? <li>Skip: {person.skipReason}</li> : null}
      </ul>
    </div>
  );
}
