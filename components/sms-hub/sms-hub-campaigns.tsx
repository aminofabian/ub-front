"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { useSmsCreditBalance } from "@/components/messaging/sms-credits-header";
import { SmsHubActivity } from "@/components/sms-hub/sms-hub-activity";
import {
  CAMPAIGN_STATUS_LABEL,
  Chip,
  SMS_ROW,
  SMS_TD,
  SMS_TH,
  campaignTone,
  errorText,
  formatWhen,
  plural,
} from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import type { CustomerEmailAudienceFilter } from "@/lib/api";
import {
  cancelSmsCampaign,
  createSmsCampaign,
  fetchSmsCampaign,
  fetchSmsCampaigns,
  previewSmsAudience,
  scheduleSmsCampaign,
  sendSmsCampaign,
  type SmsAudiencePreview,
  type SmsCampaignDetail,
  type SmsCampaignSummary,
  type SmsRecipientMethod,
} from "@/lib/sms-hub-api";
import { smsSize } from "@/lib/sms-segments";
import { cn } from "@/lib/utils";

type View =
  | { kind: "list" }
  | { kind: "compose"; customerIds: string[] | null }
  | { kind: "detail"; id: string };

type Props = {
  canManage: boolean;
  sendWindow: string;
  optOutFooter: string;
  /** Customers ticked on the Contacts tab; opens the composer for them. */
  composeFor: string[] | null;
  onComposeConsumed: () => void;
};

export function SmsHubCampaigns({
  canManage,
  sendWindow,
  optOutFooter,
  composeFor,
  onComposeConsumed,
}: Props) {
  const [view, setView] = useState<View>({ kind: "list" });

  useEffect(() => {
    if (composeFor && composeFor.length > 0) {
      setView({ kind: "compose", customerIds: composeFor });
      onComposeConsumed();
    }
  }, [composeFor, onComposeConsumed]);

  if (view.kind === "compose") {
    return (
      <CampaignComposer
        customerIds={view.customerIds}
        optOutFooter={optOutFooter}
        onBack={() => setView({ kind: "list" })}
        onCreated={(id) => setView({ kind: "detail", id })}
      />
    );
  }
  if (view.kind === "detail") {
    return (
      <CampaignDetail
        id={view.id}
        canManage={canManage}
        sendWindow={sendWindow}
        onBack={() => setView({ kind: "list" })}
      />
    );
  }
  return (
    <CampaignList
      canManage={canManage}
      onNew={() => setView({ kind: "compose", customerIds: null })}
      onOpen={(id) => setView({ kind: "detail", id })}
    />
  );
}

function CampaignList({
  canManage,
  onNew,
  onOpen,
}: {
  canManage: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<SmsCampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSmsCampaigns({ size: 50 })
      .then((page) => {
        if (!cancelled) setRows(page.content ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, "Could not load campaigns."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-1">
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={cn(DASHBOARD_TABLE_HEAD, "flex items-center justify-between gap-2")}>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : plural(rows.length, "campaign")}
          </p>
          {canManage ? (
            <Button type="button" size="sm" onClick={onNew}>
              <Plus className="size-3.5" />
              New campaign
            </Button>
          ) : null}
        </div>
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem]">
              <thead>
                <tr className={SMS_ROW}>
                  <th className={SMS_TH}>Campaign</th>
                  <th className={SMS_TH}>Status</th>
                  <th className={cn(SMS_TH, "text-right")}>Sent</th>
                  <th className={cn(SMS_TH, "text-right")}>Credits</th>
                  <th className={SMS_TH}>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={SMS_ROW}>
                    <td className={SMS_TD}>
                      <button
                        type="button"
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => onOpen(c.id)}
                      >
                        {c.name}
                      </button>
                      <span className="mt-0.5 block max-w-[28rem] truncate text-xs text-muted-foreground">
                        {c.body}
                      </span>
                    </td>
                    <td className={SMS_TD}>
                      <Chip className={campaignTone(c.status)}>{CAMPAIGN_STATUS_LABEL[c.status]}</Chip>
                    </td>
                    <td className={cn(SMS_TD, "text-right tabular-nums")}>
                      {c.recipientsSent} / {c.recipientsTargeted}
                    </td>
                    <td className={cn(SMS_TD, "text-right tabular-nums")}>{c.creditsUsed}</td>
                    <td className={cn(SMS_TD, "whitespace-nowrap text-muted-foreground")}>
                      {formatWhen(c.completedAt ?? c.scheduledAt ?? c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No campaigns yet. A campaign is one text to a group of customers who agreed to offers.
          </p>
        ) : null}
      </section>
    </div>
  );
}

type GroupKey = "recent" | "lapsed" | "spent" | "frequent" | "wholesale";

const GROUPS: Array<{ key: GroupKey; label: string; unit?: string; initial?: number }> = [
  { key: "recent", label: "Bought in the last … days", unit: "days", initial: 30 },
  { key: "lapsed", label: "Has not bought for … days", unit: "days", initial: 60 },
  { key: "spent", label: "Spent more than KES …", unit: "KES", initial: 5000 },
  { key: "frequent", label: "Bought more than … times", unit: "times", initial: 5 },
  { key: "wholesale", label: "Wholesale buyers" },
];

/** ISO date `days` ago in Africa/Nairobi (UTC+3, no daylight saving). */
function nairobiDateDaysAgo(days: number): string {
  const ms = Date.now() + 3 * 3_600_000 - days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function groupFilter(key: GroupKey, n: number): CustomerEmailAudienceFilter {
  const one = (condition: NonNullable<CustomerEmailAudienceFilter["conditions"]>[number]) => ({
    matchMode: "ALL" as const,
    conditions: [condition],
  });
  switch (key) {
    case "recent":
      return one({ field: "last_purchase_date", op: "last_x_days", days: n });
    case "lapsed":
      return one({ field: "last_purchase_date", op: "before", value: nairobiDateDaysAgo(n) });
    case "spent":
      return one({ field: "total_purchase_amount", op: "gt", value: String(n) });
    case "frequent":
      return one({ field: "number_of_purchases", op: "gt", value: String(n) });
    default:
      return one({ field: "wholesale", op: "eq", value: "true" });
  }
}

function CampaignComposer({
  customerIds,
  optOutFooter,
  onBack,
  onCreated,
}: {
  customerIds: string[] | null;
  optOutFooter: string;
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const hasSelection = customerIds !== null && customerIds.length > 0;
  const [name, setName] = useState("");
  const [body, setBody] = useState("Hi {first_name}, ");
  const [method, setMethod] = useState<SmsRecipientMethod>(hasSelection ? "specific" : "all_eligible");
  const [group, setGroup] = useState<GroupKey>("recent");
  const [groupValue, setGroupValue] = useState("30");
  const [preview, setPreview] = useState<SmsAudiencePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { balance } = useSmsCreditBalance();

  const groupDef = GROUPS.find((g) => g.key === group) ?? GROUPS[0];
  const groupNumber = Math.max(1, Math.floor(Number(groupValue) || 0));

  const audience = useMemo(() => {
    if (method === "specific") return { recipientMethod: method, customerIds: customerIds ?? [] };
    if (method === "filtered") {
      return { recipientMethod: method, filter: groupFilter(group, groupNumber) };
    }
    return { recipientMethod: method };
  }, [method, customerIds, group, groupNumber]);

  useEffect(() => {
    let cancelled = false;
    setPreviewing(true);
    const t = window.setTimeout(() => {
      previewSmsAudience(audience)
        .then((res) => {
          if (!cancelled) {
            setPreview(res);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setPreview(null);
            setError(errorText(err, "Could not check this audience."));
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [audience]);

  // Approximate: the real text swaps each customer's name in, so length varies a little.
  const sample = `${body
    .trim()
    .split("{first_name}")
    .join("Wanjiku")
    .split("{name}")
    .join("Wanjiku Kamau")
    .split("{shop}")
    .join("your shop")} ${optOutFooter}`;
  const size = smsSize(sample);
  const recipients = preview?.finalRecipients ?? 0;
  const credits = recipients * size.parts;
  const short =
    balance && balance.meteringEnabled && recipients > 0 && balance.available < credits;

  const insert = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const canSave = name.trim().length > 0 && body.trim().length > 0 && recipients > 0 && !saving;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createSmsCampaign({
        name: name.trim(),
        body: body.trim(),
        ...audience,
      });
      onCreated(created.id);
    } catch (err) {
      setError(errorText(err, "Could not save this campaign."));
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div>
        <Button type="button" size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
          All campaigns
        </Button>
      </div>
      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <section className={DASHBOARD_SECTION_SURFACE}>
        <h2 className="text-base font-semibold">1. Who gets it</h2>
        <fieldset className="mt-2 flex flex-col gap-2">
          <legend className="sr-only">Audience</legend>
          {hasSelection ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sms-audience"
                checked={method === "specific"}
                onChange={() => setMethod("specific")}
              />
              The {plural(customerIds?.length ?? 0, "customer")} you selected
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="sms-audience"
              checked={method === "all_eligible"}
              onChange={() => setMethod("all_eligible")}
            />
            Everyone who agreed to offers
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="sms-audience"
              checked={method === "filtered"}
              onChange={() => setMethod("filtered")}
            />
            A group
          </label>
          {method === "filtered" ? (
            <div className="ml-6 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className={dashboardLabelClass()}>Group</span>
                <select
                  className={dashboardSelectClass()}
                  value={group}
                  onChange={(e) => {
                    const next = e.target.value as GroupKey;
                    setGroup(next);
                    const def = GROUPS.find((g) => g.key === next);
                    if (def?.initial) setGroupValue(String(def.initial));
                  }}
                >
                  {GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              {groupDef.unit ? (
                <label className="flex w-32 flex-col gap-1">
                  <span className={dashboardLabelClass()}>{groupDef.unit}</span>
                  <input
                    className={dashboardInputClass()}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={groupValue}
                    onChange={(e) => setGroupValue(e.target.value)}
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <div className="mt-3 text-sm" aria-live="polite">
          {previewing ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Checking who this reaches…
            </span>
          ) : preview ? (
            <>
              <p>
                <span className="font-semibold tabular-nums">{plural(preview.finalRecipients, "customer")}</span>{" "}
                will get this text.
                {preview.automaticallyExcluded > 0
                  ? ` ${plural(preview.automaticallyExcluded, "other")} in this audience will not.`
                  : ""}
              </p>
              {preview.excludedSample.length > 0 ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-muted-foreground">Who is left out, and why</summary>
                  <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                    {preview.excludedSample.slice(0, 12).map((p) => (
                      <li key={p.customerId}>
                        {p.name}: {p.skipReason}
                      </li>
                    ))}
                    {preview.automaticallyExcluded > 12 ? (
                      <li>…and {preview.automaticallyExcluded - 12} more</li>
                    ) : null}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <h2 className="text-base font-semibold">2. What it says</h2>
        <label className="mt-2 flex max-w-md flex-col gap-1">
          <span className={dashboardLabelClass()}>Campaign name (only you see this)</span>
          <input
            className={dashboardInputClass()}
            value={name}
            maxLength={255}
            placeholder="e.g. November bread offer"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="mt-3 flex flex-col gap-1">
          <span className={dashboardLabelClass()}>Message</span>
          <textarea
            ref={bodyRef}
            className={dashboardTextareaClass()}
            rows={4}
            maxLength={600}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={dashboardHintClass()}>Insert:</span>
          {["{first_name}", "{name}", "{shop}"].map((token) => (
            <Button key={token} type="button" size="xs" variant="outline" onClick={() => insert(token)}>
              {token}
            </Button>
          ))}
        </div>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          &ldquo;{optOutFooter}&rdquo; is added to the end of every offer.
        </p>
        <p className="mt-2 text-sm" aria-live="polite">
          About <span className="font-semibold tabular-nums">{size.units}</span> characters,{" "}
          <span className="font-semibold tabular-nums">{size.parts}</span> SMS credit
          {size.parts === 1 ? "" : "s"} per customer.
          {size.encoding === "UNICODE"
            ? " This text has emoji or special letters, so each credit holds 70 characters instead of 160."
            : ""}
        </p>
        <p className="mt-1 text-sm">
          Total: about <span className="font-semibold tabular-nums">{credits.toLocaleString("en-KE")}</span>{" "}
          credits
          {balance?.meteringEnabled
            ? ` (you have ${balance.available.toLocaleString("en-KE")})`
            : ""}
          .
        </p>
        {short ? (
          <DashboardFeedback
            kind="warning"
            className="mt-2"
            text="You do not have enough SMS credits for this audience. Buy credits from the SMS balance in the header, or pick a smaller group."
          />
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-2 px-1 py-2">
        <Button type="button" disabled={!canSave} onClick={() => void save()}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save and review
        </Button>
        <span className={dashboardHintClass()}>Nothing is sent yet. You choose when on the next screen.</span>
      </div>
    </div>
  );
}

function CampaignDetail({
  id,
  canManage,
  sendWindow,
  onBack,
}: {
  id: string;
  canManage: boolean;
  sendWindow: string;
  onBack: () => void;
}) {
  const [campaign, setCampaign] = useState<SmsCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [when, setWhen] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      setCampaign(await fetchSmsCampaign(id));
    } catch (err) {
      setError(errorText(err, "Could not load this campaign."));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const live = campaign?.status === "QUEUED" || campaign?.status === "RUNNING";
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, [live, load]);

  const act = async (fn: () => Promise<SmsCampaignDetail>) => {
    setBusy(true);
    setError(null);
    try {
      setCampaign(await fn());
      setConfirmCancel(false);
    } catch (err) {
      setError(errorText(err, "That did not work. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (!campaign) {
    return (
      <div className="flex flex-col gap-1">
        <div>
          <Button type="button" size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-3.5" />
            All campaigns
          </Button>
        </div>
        {error ? (
          <DashboardFeedback kind="error" text={error} />
        ) : (
          <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading campaign…
          </p>
        )}
      </div>
    );
  }

  const needsPhrase = campaign.recipientMethod === "all_eligible";
  const phraseOk = !needsPhrase || confirm.trim() === "SEND";
  const isDraft = campaign.status === "DRAFT";
  const canCancel =
    campaign.status === "DRAFT" ||
    campaign.status === "QUEUED" ||
    campaign.status === "SCHEDULED" ||
    campaign.status === "RUNNING";
  const started = campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED" && campaign.status !== "CANCELLED";

  return (
    <div className="flex flex-col gap-1">
      <div>
        <Button type="button" size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-3.5" />
          All campaigns
        </Button>
      </div>
      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      <section className={DASHBOARD_SECTION_SURFACE}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{campaign.name}</h2>
          <Chip className={campaignTone(campaign.status)}>{CAMPAIGN_STATUS_LABEL[campaign.status]}</Chip>
        </div>
        <p className="mt-2 max-w-prose whitespace-pre-wrap rounded-[2px] border border-border bg-background p-3 text-sm">
          {campaign.text}
        </p>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          Shown with a sample name. {plural(campaign.partsPerMessage, "SMS credit")} per customer.
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <Stat label={isDraft || campaign.status === "SCHEDULED" ? "Will get it" : "Still to send"} value={campaign.recipientsPending} />
          <Stat label="Sent" value={campaign.recipientsSent} />
          <Stat label="Left out" value={campaign.recipientsSkipped} />
          <Stat label="Failed" value={campaign.recipientsFailed} />
          <Stat
            label={started ? "Credits used" : "Credits needed (about)"}
            value={started ? campaign.creditsUsed : campaign.estimatedCredits}
          />
          {campaign.boughtWithin48Hours !== null ? (
            <Stat label="Bought within 48 hours" value={campaign.boughtWithin48Hours} />
          ) : null}
        </dl>
        {campaign.status === "SCHEDULED" && campaign.scheduledAt ? (
          <p className="mt-2 text-sm">Goes out {formatWhen(campaign.scheduledAt)}.</p>
        ) : null}
      </section>

      {canManage && isDraft ? (
        <section className={DASHBOARD_SECTION_SURFACE}>
          <h2 className="text-base font-semibold">Send</h2>
          <p className={cn(dashboardHintClass(), "mt-1")}>
            Offers go out between {sendWindow}. A time outside those hours moves to the next opening.
          </p>
          {needsPhrase ? (
            <label className="mt-2 flex max-w-xs flex-col gap-1">
              <span className={dashboardLabelClass()}>
                This goes to everyone who agreed to offers. Type SEND to confirm.
              </span>
              <input
                className={dashboardInputClass()}
                value={confirm}
                autoComplete="off"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          ) : null}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Button
              type="button"
              disabled={busy || !phraseOk || campaign.recipientsPending === 0}
              onClick={() => void act(() => sendSmsCampaign(campaign.id, confirm.trim() || undefined))}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Send now to {plural(campaign.recipientsPending, "customer")}
            </Button>
            <div className="flex items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className={dashboardLabelClass()}>Or send later</span>
                <input
                  className={dashboardInputClass()}
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !phraseOk || !when || campaign.recipientsPending === 0}
                onClick={() => {
                  const at = new Date(when);
                  if (Number.isNaN(at.getTime())) {
                    setError("Choose a date and time.");
                    return;
                  }
                  void act(() => scheduleSmsCampaign(campaign.id, at.toISOString(), confirm.trim() || undefined));
                }}
              >
                Schedule
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {canManage && canCancel ? (
        <div className="flex flex-wrap items-center gap-2 px-1 py-1">
          {confirmCancel ? (
            <>
              <span className="text-sm">
                {campaign.status === "RUNNING"
                  ? "Stop sending? Texts already sent cannot be recalled."
                  : "Cancel this campaign? Nothing will be sent."}
              </span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void act(() => cancelSmsCampaign(campaign.id))}
              >
                Yes, cancel it
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmCancel(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmCancel(true)}>
              Cancel campaign
            </Button>
          )}
        </div>
      ) : null}

      <section className={DASHBOARD_TABLE_SURFACE}>
        <div className={DASHBOARD_TABLE_HEAD}>
          <h2 className="text-sm font-semibold">Customers</h2>
          <p className="text-xs text-muted-foreground">
            {campaign.recipientsTargeted > campaign.recipients.length
              ? `First ${campaign.recipients.length} of ${campaign.recipientsTargeted}`
              : plural(campaign.recipients.length, "customer")}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem]">
            <thead>
              <tr className={SMS_ROW}>
                <th className={SMS_TH}>Customer</th>
                <th className={SMS_TH}>Number</th>
                <th className={SMS_TH}>Result</th>
              </tr>
            </thead>
            <tbody>
              {campaign.recipients.map((r) => (
                <tr key={r.id} className={SMS_ROW}>
                  <td className={SMS_TD}>{r.customerName ?? "Customer"}</td>
                  <td className={cn(SMS_TD, "font-mono tabular-nums")}>{r.phone ? `+${r.phone}` : "—"}</td>
                  <td className={SMS_TD}>
                    {r.status === "SENT"
                      ? `Sent ${formatWhen(r.sentAt)}`
                      : r.status === "SKIPPED"
                        ? `Left out: ${r.skipReason ?? "not eligible"}`
                        : r.status === "FAILED"
                          ? `Failed: ${r.error ?? "could not send"}`
                          : r.status === "SENDING"
                            ? "Sending…"
                            : "Waiting"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {started ? <SmsHubActivity campaignId={campaign.id} /> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value.toLocaleString("en-KE")}</dd>
    </div>
  );
}
