"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Megaphone, Sparkles, X } from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardNotice,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboard } from "@/components/dashboard-provider";
import {
  createNotificationCampaign,
  cancelNotificationCampaign,
  fetchBranches,
  fetchNotificationCampaigns,
  runNotificationCampaign,
  type BranchRecord,
  type NotificationCampaign,
  type NotificationCampaignRecipientScope,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { getNotificationPresentation } from "@/lib/notification-display";
import {
  EXAMPLE_FLASH_SALE,
  EXAMPLE_WEEKLY_DEALS,
  type PromoCampaignFormSample,
} from "@/lib/promo-campaign-samples";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function applySampleToForm(
  sample: PromoCampaignFormSample,
  setters: {
    setName: (v: string) => void;
    setCampaignType: (v: "FLASH_SALE" | "WEEKLY_DEALS") => void;
    setTitle: (v: string) => void;
    setBody: (v: string) => void;
    setActionUrl: (v: string) => void;
    setRecipientScope: (v: NotificationCampaignRecipientScope) => void;
  },
) {
  setters.setName(sample.name);
  setters.setCampaignType(sample.campaignType);
  setters.setTitle(sample.title);
  setters.setBody(sample.body);
  setters.setActionUrl(sample.actionUrl);
  setters.setRecipientScope(sample.recipientScope);
}

export default function PromoCampaignsPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.NotificationsPromotionsManage);

  const [rows, setRows] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState<"FLASH_SALE" | "WEEKLY_DEALS">("FLASH_SALE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionUrl, setActionUrl] = useState("/shop");
  const [recipientScope, setRecipientScope] =
    useState<NotificationCampaignRecipientScope>("ALL_BUYERS");
  const [catalogBranchId, setCatalogBranchId] = useState("");
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [usingExample, setUsingExample] = useState(false);

  const scopeNeedsBranch = recipientScope === "BRANCH_ACTIVE_BUYERS_90D";

  const formEmpty = !name.trim() && !title.trim() && !body.trim();

  const notificationType =
    campaignType === "WEEKLY_DEALS" ? "promo.weekly_deals" : "promo.flash_sale";

  const shopperPreview = useMemo(() => {
    if (!title.trim() && !body.trim()) {
      return null;
    }
    return getNotificationPresentation({
      notificationType,
      type: notificationType,
      title: title.trim(),
      body: body.trim(),
      payload: { title: title.trim(), body: body.trim(), actionUrl },
    });
  }, [notificationType, title, body, actionUrl]);

  const loadExample = (sample: PromoCampaignFormSample) => {
    applySampleToForm(sample, {
      setName,
      setCampaignType,
      setTitle,
      setBody,
      setActionUrl,
      setRecipientScope,
    });
    setUsingExample(true);
    setMessage("");
  };

  const clearForm = () => {
    setName("");
      setTitle("");
      setBody("");
      setActionUrl("/shop");
      setCampaignType("FLASH_SALE");
      setRecipientScope("ALL_BUYERS");
      setCatalogBranchId("");
      setScheduledAtLocal("");
      setUsingExample(false);
  };

  const branchName = (id: string | null | undefined) =>
    branches.find((b) => b.id === id)?.name ?? id ?? "—";

  const scopeLabel = (scope: string, branchId?: string | null) => {
    switch (scope) {
      case "ACTIVE_BUYERS_90D":
        return "Ordered in last 90 days";
      case "INACTIVE_BUYERS_30D":
        return "No order in 30+ days";
      case "BRANCH_ACTIVE_BUYERS_90D":
        return `Branch: ${branchName(branchId)} (90d)`;
      default:
        return "All registered shoppers";
    }
  };

  const markCustom = () => setUsingExample(false);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    try {
      setRows(await fetchNotificationCampaigns());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    void load();
    void fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [allowed, load]);

  type CampaignCreatePayload = {
    name: string;
    campaignType: "FLASH_SALE" | "WEEKLY_DEALS";
    title: string;
    body: string;
    actionUrl: string;
    recipientScope: NotificationCampaignRecipientScope;
    catalogBranchId?: string;
    scheduledAt?: string;
  };

  type BuildPayloadResult =
    | { error: string }
    | { payload: CampaignCreatePayload };

  const buildPayload = (schedule: boolean): BuildPayloadResult => {
    if (!name.trim() || !title.trim() || !body.trim()) {
      return { error: "Give your campaign a name, a headline, and a short message." };
    }
    if (scopeNeedsBranch && !catalogBranchId) {
      return { error: "Choose a branch for branch-targeted campaigns." };
    }
    let scheduledAt: string | undefined;
    if (schedule) {
      if (!scheduledAtLocal) {
        return { error: "Pick a date and time for the scheduled send." };
      }
      const when = new Date(scheduledAtLocal);
      if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        return { error: "Scheduled time must be in the future." };
      }
      scheduledAt = when.toISOString();
    }
    return {
      payload: {
        name: name.trim(),
        campaignType,
        title: title.trim(),
        body: body.trim(),
        actionUrl: actionUrl.trim() || "/shop",
        recipientScope,
        ...(scopeNeedsBranch ? { catalogBranchId } : {}),
        ...(scheduledAt ? { scheduledAt } : {}),
      },
    };
  };

  const onCreate = async (schedule: boolean) => {
    const built = buildPayload(schedule);
    if ("error" in built) {
      setMessage(built.error);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await createNotificationCampaign(built.payload);
      clearForm();
      await load();
      setMessage(
        schedule
          ? "Campaign scheduled — it will send automatically at the chosen time."
          : "Draft saved — use Send now when you are ready.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save campaign.");
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Promotions"
        description={
          <>
            You need permission{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              {Permission.NotificationsPromotionsManage}
            </code>
            . Owners have this by default.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  return (
    <div className={DASHBOARD_MAX}>
      <div className="space-y-8">
        <DashboardPageHero
          icon={Megaphone}
          eyebrow="Business"
          title="Promotions"
          description="Reach registered shoppers with flash sales and weekly deals. Quiet hours and daily limits still apply."
        />

        {message ? <DashboardNotice text={message} /> : null}

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Create a promotion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shoppers see a short alert in their account — like a gentle nudge back to your shop.
          </p>

          {formEmpty && !usingExample ? (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Need inspiration?</span>{" "}
                Load a sample weekend flash sale, edit it, and preview on the phone mockup.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => loadExample(EXAMPLE_FLASH_SALE)}
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  See an example
                </Button>
                <button
                  type="button"
                  className="text-xs text-[color:var(--auth-primary)] underline-offset-2 hover:underline"
                  onClick={() => loadExample(EXAMPLE_WEEKLY_DEALS)}
                >
                  Weekly deals sample
                </button>
              </div>
            </div>
          ) : null}

          <div className={cn("mt-6 grid gap-6", shopperPreview ? "lg:grid-cols-[1fr_240px]" : "")}>
            <div className="space-y-4">
              {usingExample ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                  <span className="text-amber-900 dark:text-amber-100">
                    Example loaded — tweak anything, then save as your own.
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={clearForm}
                  >
                    <X className="size-3" aria-hidden />
                    Clear & start fresh
                  </button>
                </div>
              ) : null}

              {!formEmpty && !usingExample ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full text-xs"
                  onClick={() => loadExample(EXAMPLE_FLASH_SALE)}
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  Load an example to compare
                </Button>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="camp-name">Internal name (only you see this)</Label>
                  <Input
                    id="camp-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      markCustom();
                    }}
                    placeholder="March weekend push"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camp-type">Style</Label>
                  <select
                    id="camp-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={campaignType}
                    onChange={(e) => {
                      setCampaignType(e.target.value as "FLASH_SALE" | "WEEKLY_DEALS");
                      markCustom();
                    }}
                  >
                    <option value="FLASH_SALE">Flash sale — urgent, limited time</option>
                    <option value="WEEKLY_DEALS">Weekly deals — regular digest</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camp-scope">Who receives it</Label>
                  <select
                    id="camp-scope"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={recipientScope}
                    onChange={(e) => {
                      setRecipientScope(e.target.value as NotificationCampaignRecipientScope);
                      if (e.target.value !== "BRANCH_ACTIVE_BUYERS_90D") {
                        setCatalogBranchId("");
                      }
                      markCustom();
                    }}
                  >
                    <option value="ALL_BUYERS">All registered shoppers</option>
                    <option value="ACTIVE_BUYERS_90D">Ordered in the last 90 days</option>
                    <option value="INACTIVE_BUYERS_30D">No order in 30+ days (win-back)</option>
                    <option value="BRANCH_ACTIVE_BUYERS_90D">
                      Ordered at a branch in the last 90 days
                    </option>
                  </select>
                </div>
                {scopeNeedsBranch ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="camp-branch">Branch</Label>
                    <select
                      id="camp-branch"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={catalogBranchId}
                      onChange={(e) => {
                        setCatalogBranchId(e.target.value);
                        markCustom();
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="camp-schedule">Schedule send (optional)</Label>
                  <Input
                    id="camp-schedule"
                    type="datetime-local"
                    value={scheduledAtLocal}
                    onChange={(e) => {
                      setScheduledAtLocal(e.target.value);
                      markCustom();
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to save a draft and send manually. Set a future time and use
                    Schedule send below.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="camp-title">Headline shoppers see</Label>
                  <Input
                    id="camp-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markCustom();
                    }}
                    placeholder="20% off this weekend"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="camp-body">Short message</Label>
                  <Textarea
                    id="camp-body"
                    rows={3}
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      markCustom();
                    }}
                    placeholder="A sentence or two — warm, clear, no jargon."
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="camp-url">Where the alert takes them</Label>
                  <Input
                    id="camp-url"
                    value={actionUrl}
                    onChange={(e) => {
                      setActionUrl(e.target.value);
                      markCustom();
                    }}
                    placeholder="/shop"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void onCreate(false)}
                >
                  {busy ? "Saving…" : "Save as draft"}
                </Button>
                <Button
                  type="button"
                  disabled={busy || !scheduledAtLocal}
                  onClick={() => void onCreate(true)}
                >
                  {busy ? "Scheduling…" : "Schedule send"}
                </Button>
                <p className="w-full text-xs text-muted-foreground">
                  Drafts can be sent immediately from the list. Scheduled campaigns run
                  automatically — quiet hours and daily promo caps still apply.
                </p>
              </div>
            </div>

            {shopperPreview ? (
              <aside className="lg:sticky lg:top-4 lg:self-start">
                <div className="mx-auto w-full max-w-[240px] rounded-[1.75rem] border-[3px] border-foreground/15 bg-muted/30 p-2 shadow-lg">
                  <div className="rounded-[1.35rem] bg-background px-3 pb-4 pt-6">
                    <p className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Shop account
                    </p>
                    <div
                      className={cn(
                        "mt-4 rounded-xl px-3 py-3",
                        "bg-[color-mix(in_srgb,var(--auth-primary)_10%,transparent)]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Bell
                          className="mt-0.5 size-4 shrink-0 text-[color:var(--auth-primary)]"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-snug text-foreground">
                            {shopperPreview.title}
                          </p>
                          {shopperPreview.body ? (
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {shopperPreview.body}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-center text-[10px] text-muted-foreground">
                      Preview only — not sent yet
                    </p>
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
        </section>

        <section className="overflow-x-auto rounded-md border">
          <h2 className="border-b bg-muted/30 px-4 py-3 text-sm font-semibold">
            Your campaigns
          </h2>
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Audience</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium text-right">Sent</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No campaigns saved yet — your drafts will show up here.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {scopeLabel(row.recipientScope, row.catalogBranchId)}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.scheduledAt
                        ? new Date(row.scheduledAt).toLocaleString()
                        : row.startedAt
                          ? new Date(row.startedAt).toLocaleString()
                          : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.recipientsSent}/{row.recipientsTargeted}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {row.status === "DRAFT" || row.status === "SCHEDULED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await runNotificationCampaign(row.id);
                                await load();
                              } catch (e) {
                                setMessage(
                                  e instanceof Error ? e.message : "Send failed.",
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Send now
                          </Button>
                        ) : null}
                        {row.status === "SCHEDULED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await cancelNotificationCampaign(row.id);
                                await load();
                              } catch (e) {
                                setMessage(
                                  e instanceof Error ? e.message : "Cancel failed.",
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
