"use client";

import { Megaphone, Sparkles, X } from "lucide-react";

import {
  SupSection,
  SupWorkflowRail,
} from "@/app/(dashboard)/suppliers/_components/supplier-layout-primitives";
import { FormDrawer, FormDrawerMessageBanner } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  BranchRecord,
  NotificationCampaignRecipientScope,
} from "@/lib/api";
import {
  EXAMPLE_FLASH_SALE,
  EXAMPLE_WEEKLY_DEALS,
  type PromoCampaignFormSample,
} from "@/lib/promo-campaign-samples";
import { cn } from "@/lib/utils";

import { ShopperPreview } from "./promo-shopper-preview";
import {
  supFieldLabel,
  supInput,
  supSelect,
  supTextarea,
} from "./promotions-ui-tokens";

export type PromoFormState = {
  name: string;
  campaignType: "FLASH_SALE" | "WEEKLY_DEALS";
  title: string;
  body: string;
  actionUrl: string;
  recipientScope: NotificationCampaignRecipientScope;
  catalogBranchId: string;
  scheduledAtLocal: string;
};

type PromoCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PromoFormState;
  setForm: React.Dispatch<React.SetStateAction<PromoFormState>>;
  usingExample: boolean;
  setUsingExample: (v: boolean) => void;
  branches: BranchRecord[];
  busy: boolean;
  errorText: string | null;
  onSaveDraft: () => void;
  onSchedule: () => void;
};

export function PromoCreateDrawer({
  open,
  onOpenChange,
  form,
  setForm,
  usingExample,
  setUsingExample,
  branches,
  busy,
  errorText,
  onSaveDraft,
  onSchedule,
}: PromoCreateDrawerProps) {
  const scopeNeedsBranch = form.recipientScope === "BRANCH_ACTIVE_BUYERS_90D";
  const notificationType =
    form.campaignType === "WEEKLY_DEALS" ? "promo.weekly_deals" : "promo.flash_sale";

  const loadExample = (sample: PromoCampaignFormSample) => {
    setForm({
      name: sample.name,
      campaignType: sample.campaignType,
      title: sample.title,
      body: sample.body,
      actionUrl: sample.actionUrl,
      recipientScope: sample.recipientScope,
      catalogBranchId: "",
      scheduledAtLocal: "",
    });
    setUsingExample(true);
  };

  const showTemplates = !form.name && !form.title && !usingExample;

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      width="large"
      contextLabel="Promotions"
      title="Create promotion"
      description="Shoppers see a short alert in their account — clear, friendly, and on-brand."
      icon={<Megaphone className="size-5 text-primary" aria-hidden />}
      banner={errorText ? <FormDrawerMessageBanner text={errorText} /> : null}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Save as draft</span> to finish
            later, or pick a send time and tap{" "}
            <span className="font-medium text-foreground">Schedule send</span>.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-4"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 font-medium shadow-sm"
              disabled={busy}
              onClick={onSaveDraft}
            >
              {busy ? "Saving…" : "Save as draft"}
            </Button>
            <Button
              type="button"
              className="h-10 gap-2 px-5 font-semibold shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              disabled={busy || !form.scheduledAtLocal}
              onClick={onSchedule}
            >
              {busy ? "Scheduling…" : "Schedule send"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <SupWorkflowRail
          steps={[
            { n: 1, label: "Audience" },
            { n: 2, label: "Message" },
            { n: 3, label: "Schedule" },
          ]}
          activeLabel={
            form.scheduledAtLocal
              ? "Scheduled"
              : form.title.trim()
                ? "Message ready"
                : "Setup"
          }
        />

        {showTemplates ? (
          <div className="overflow-hidden rounded-xl border border-dashed border-border/60 bg-gradient-to-br from-muted/30 via-background to-transparent shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Start from a template</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Proven copy for minimart and shop owners — edit anything before sending.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-lg border-amber-500/25 bg-amber-500/5 font-medium hover:bg-amber-500/10"
                  onClick={() => loadExample(EXAMPLE_FLASH_SALE)}
                >
                  <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                  Flash sale
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 rounded-lg border-indigo-500/25 bg-indigo-500/5 font-medium hover:bg-indigo-500/10"
                  onClick={() => loadExample(EXAMPLE_WEEKLY_DEALS)}
                >
                  Weekly deals
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {usingExample ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <span className="text-amber-950 dark:text-amber-100">
              Template loaded — customize, then save or schedule.
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setForm({
                  name: "",
                  campaignType: "FLASH_SALE",
                  title: "",
                  body: "",
                  actionUrl: "/shop",
                  recipientScope: "ALL_BUYERS",
                  catalogBranchId: "",
                  scheduledAtLocal: "",
                });
                setUsingExample(false);
              }}
            >
              <X className="size-3" aria-hidden />
              Clear
            </button>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(220px,280px)]">
          <div className="space-y-5">
            <SupSection
              title="Audience & setup"
              hint="Only you see the internal name — shoppers see the headline and message."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promo-name" className={supFieldLabel}>
                    Internal name
                  </Label>
                  <input
                    id="promo-name"
                    className={supInput}
                    value={form.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }));
                      setUsingExample(false);
                    }}
                    placeholder="March weekend push"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="promo-type" className={supFieldLabel}>
                      Promotion style
                    </Label>
                    <select
                      id="promo-type"
                      className={supSelect}
                      value={form.campaignType}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          campaignType: e.target.value as "FLASH_SALE" | "WEEKLY_DEALS",
                        }));
                        setUsingExample(false);
                      }}
                    >
                      <option value="FLASH_SALE">Flash sale — urgent, limited time</option>
                      <option value="WEEKLY_DEALS">Weekly deals — regular digest</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-scope" className={supFieldLabel}>
                      Who receives it
                    </Label>
                    <select
                      id="promo-scope"
                      className={supSelect}
                      value={form.recipientScope}
                      onChange={(e) => {
                        const scope = e.target.value as NotificationCampaignRecipientScope;
                        setForm((f) => ({
                          ...f,
                          recipientScope: scope,
                          catalogBranchId:
                            scope === "BRANCH_ACTIVE_BUYERS_90D" ? f.catalogBranchId : "",
                        }));
                        setUsingExample(false);
                      }}
                    >
                      <option value="ALL_BUYERS">All registered shoppers</option>
                      <option value="ACTIVE_BUYERS_90D">Ordered in the last 90 days</option>
                      <option value="INACTIVE_BUYERS_30D">No order in 30+ days (win-back)</option>
                      <option value="BRANCH_ACTIVE_BUYERS_90D">
                        Ordered at a branch (90 days)
                      </option>
                    </select>
                  </div>
                </div>
                {scopeNeedsBranch ? (
                  <div className="space-y-2">
                    <Label htmlFor="promo-branch" className={supFieldLabel}>
                      Branch
                    </Label>
                    <select
                      id="promo-branch"
                      className={supSelect}
                      value={form.catalogBranchId}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, catalogBranchId: e.target.value }));
                        setUsingExample(false);
                      }}
                    >
                      <option value="">Select a branch…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="promo-schedule" className={supFieldLabel}>
                    Schedule send
                  </Label>
                  <input
                    id="promo-schedule"
                    type="datetime-local"
                    className={supInput}
                    value={form.scheduledAtLocal}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, scheduledAtLocal: e.target.value }));
                      setUsingExample(false);
                    }}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Leave empty to save a draft. Pick a future time, then tap Schedule send.
                  </p>
                </div>
              </div>
            </SupSection>

            <SupSection
              title="Shopper message"
              hint="Keep it short — one clear offer and a reason to open your shop."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promo-title" className={supFieldLabel}>
                    Headline
                  </Label>
                  <input
                    id="promo-title"
                    className={supInput}
                    value={form.title}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, title: e.target.value }));
                      setUsingExample(false);
                    }}
                    placeholder="20% off this weekend"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-body" className={supFieldLabel}>
                    Short message
                  </Label>
                  <textarea
                    id="promo-body"
                    rows={3}
                    className={supTextarea}
                    value={form.body}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, body: e.target.value }));
                      setUsingExample(false);
                    }}
                    placeholder="A sentence or two — warm, clear, no jargon."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo-url" className={supFieldLabel}>
                    Link when tapped
                  </Label>
                  <input
                    id="promo-url"
                    className={supInput}
                    value={form.actionUrl}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, actionUrl: e.target.value }));
                      setUsingExample(false);
                    }}
                    placeholder="/shop"
                  />
                </div>
              </div>
            </SupSection>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <SupSection
              title="Live preview"
              hint="How the alert appears in the shopper account."
              bodyClassName="p-4 sm:p-5"
            >
              <ShopperPreview
                notificationType={notificationType}
                title={form.title}
                body={form.body}
                actionUrl={form.actionUrl}
              />
            </SupSection>
          </div>
        </div>
      </div>
    </FormDrawer>
  );
}
