"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  DashboardFeedback,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { errorText } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSmsAutomations,
  updateSmsAutomations,
  type SmsAutomations,
  type SmsOrderNoticeKey,
} from "@/lib/sms-hub-api";
import { smsSize } from "@/lib/sms-segments";
import { cn } from "@/lib/utils";

const ORDER_NOTICES: Array<{ key: SmsOrderNoticeKey; title: string; standard: string }> = [
  {
    key: "stk_sent",
    title: "M-Pesa prompt sent",
    standard: "Hi {name}, we sent an M-Pesa prompt for order #{order_no} ({amount}). Enter your PIN to pay.",
  },
  {
    key: "payment_received",
    title: "Payment received",
    standard: "Hi {name}, we received payment for order #{order_no} ({amount}). We'll pack it next.",
  },
  {
    key: "confirmed",
    title: "Order confirmed",
    standard: "Hi {name}, order #{order_no} is confirmed. We're packing it now.",
  },
  {
    key: "dispatched",
    title: "Ready or on the way",
    standard: "Hi {name}, order #{order_no} is on the way. (Pickup orders say it is ready for pickup.)",
  },
  {
    key: "completed",
    title: "Delivered or complete",
    standard: "Hi {name}, order #{order_no} has been delivered. (Pickup orders say it is complete.)",
  },
];

type Props = { canManage: boolean };

export function SmsHubAutomations({ canManage }: Props) {
  const [data, setData] = useState<SmsAutomations | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [winbackDays, setWinbackDays] = useState("30");
  const [weeklyCap, setWeeklyCap] = useState("1");

  const adopt = (next: SmsAutomations) => {
    setData(next);
    setWinbackDays(String(next.winbackDays));
    setWeeklyCap(String(next.promoWeeklyCap));
    const d: Record<string, string> = {
      thankYou: next.thankYouTemplate ?? "",
      winback: next.winbackTemplate ?? "",
    };
    for (const n of ORDER_NOTICES) {
      d[n.key] = next.orderNotices[n.key]?.template ?? "";
    }
    setDrafts(d);
  };

  useEffect(() => {
    let cancelled = false;
    fetchSmsAutomations()
      .then((res) => {
        if (!cancelled) adopt(res);
      })
      .catch((err) => {
        if (!cancelled) setFeedback({ kind: "error", text: errorText(err, "Could not load automatic texts.") });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (key: string, body: Parameters<typeof updateSmsAutomations>[0], done: string) => {
    setSavingKey(key);
    setFeedback(null);
    try {
      adopt(await updateSmsAutomations(body));
      setFeedback({ kind: "success", text: done });
    } catch (err) {
      setFeedback({ kind: "error", text: errorText(err, "Could not save.") });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading automatic texts…
      </p>
    );
  }
  if (!data) {
    return feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null;
  }

  return (
    <div className="flex flex-col gap-1">
      {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

      <section className={DASHBOARD_SECTION_SURFACE}>
        <h2 className="text-base font-semibold">Order updates</h2>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          Sent to the customer as an online order moves along. These are service messages, so they go
          to anyone who gave a number, at any hour. Leave the wording blank to use the standard text.
          You can use {"{name}"}, {"{order_no}"}, {"{amount}"} and {"{shop}"}.
        </p>
        <ul className="mt-3 flex flex-col">
          {ORDER_NOTICES.map((n) => {
            const setting = data.orderNotices[n.key] ?? { enabled: true, template: null };
            const draft = drafts[n.key] ?? "";
            const changed = draft.trim() !== (setting.template ?? "");
            return (
              <li
                key={n.key}
                className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] py-3 first:border-0 first:pt-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={`notice-${n.key}`} className="text-sm font-medium">
                    {n.title}
                  </label>
                  <Switch
                    id={`notice-${n.key}`}
                    checked={setting.enabled}
                    disabled={!canManage || savingKey !== null}
                    onCheckedChange={(checked) =>
                      void save(
                        n.key,
                        { orderNotices: { [n.key]: { enabled: checked, template: setting.template } } },
                        checked ? `"${n.title}" is on.` : `"${n.title}" is off.`,
                      )
                    }
                  />
                </div>
                {setting.enabled ? (
                  <div className="mt-2">
                    <textarea
                      className={dashboardTextareaClass(!canManage)}
                      rows={2}
                      maxLength={320}
                      disabled={!canManage}
                      placeholder={n.standard}
                      value={draft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [n.key]: e.target.value }))}
                      aria-label={`Wording for ${n.title}`}
                    />
                    {canManage && changed ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-1.5"
                        disabled={savingKey !== null}
                        onClick={() =>
                          void save(
                            n.key,
                            { orderNotices: { [n.key]: { enabled: true, template: draft.trim() || null } } },
                            draft.trim() ? "Wording saved." : "Back to the standard wording.",
                          )
                        }
                      >
                        Save wording
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <h2 className="text-base font-semibold">Offers that send themselves</h2>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          These count as promotions. They only go to customers who agreed to offers, between{" "}
          {data.sendWindow}, and &ldquo;{data.optOutFooter}&rdquo; is added to each one. You can use{" "}
          {"{first_name}"}, {"{name}"} and {"{shop}"}.
        </p>

        <PromoRule
          id="thankYou"
          title="Thank you after a first purchase"
          description="Sent once, shortly after a customer's first purchase linked to their name."
          enabled={data.thankYouEnabled}
          draft={drafts.thankYou ?? ""}
          saved={data.thankYouTemplate ?? ""}
          standard={data.thankYouDefault}
          footer={data.optOutFooter}
          canManage={canManage}
          busy={savingKey !== null}
          onToggle={(checked) =>
            void save("thankYou", { thankYouEnabled: checked }, checked ? "Thank-you texts are on." : "Thank-you texts are off.")
          }
          onDraft={(v) => setDrafts((d) => ({ ...d, thankYou: v }))}
          onSave={() => void save("thankYou", { thankYouTemplate: (drafts.thankYou ?? "").trim() }, "Wording saved.")}
        />

        <PromoRule
          id="winback"
          title="We miss you"
          description="Sent once when a customer has not bought for a while."
          enabled={data.winbackEnabled}
          draft={drafts.winback ?? ""}
          saved={data.winbackTemplate ?? ""}
          standard={data.winbackDefault}
          footer={data.optOutFooter}
          canManage={canManage}
          busy={savingKey !== null}
          onToggle={(checked) =>
            void save("winback", { winbackEnabled: checked }, checked ? "We-miss-you texts are on." : "We-miss-you texts are off.")
          }
          onDraft={(v) => setDrafts((d) => ({ ...d, winback: v }))}
          onSave={() => void save("winback", { winbackTemplate: (drafts.winback ?? "").trim() }, "Wording saved.")}
        >
          <label className="mt-2 flex max-w-xs flex-col gap-1">
            <span className={dashboardLabelClass()}>Days without a purchase</span>
            <div className="flex items-center gap-2">
              <input
                className={dashboardInputClass(!canManage)}
                type="number"
                inputMode="numeric"
                min={7}
                max={365}
                disabled={!canManage}
                value={winbackDays}
                onChange={(e) => setWinbackDays(e.target.value)}
              />
              {canManage && Number(winbackDays) !== data.winbackDays ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={savingKey !== null}
                  onClick={() => void save("winbackDays", { winbackDays: Number(winbackDays) }, "Days saved.")}
                >
                  Save
                </Button>
              ) : null}
            </div>
          </label>
        </PromoRule>
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <h2 className="text-base font-semibold">Limits</h2>
        <label className="mt-2 flex max-w-xs flex-col gap-1">
          <span className={dashboardLabelClass()}>Offers one customer can get in a week</span>
          <div className="flex items-center gap-2">
            <input
              className={dashboardInputClass(!canManage)}
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              disabled={!canManage}
              value={weeklyCap}
              onChange={(e) => setWeeklyCap(e.target.value)}
            />
            {canManage && Number(weeklyCap) !== data.promoWeeklyCap ? (
              <Button
                type="button"
                size="sm"
                disabled={savingKey !== null}
                onClick={() => void save("weeklyCap", { promoWeeklyCap: Number(weeklyCap) }, "Limit saved.")}
              >
                Save
              </Button>
            ) : null}
          </div>
          <span className={dashboardHintClass()}>
            Covers campaigns and the offers above. Order updates are never limited.
          </span>
        </label>
      </section>

      <section className={DASHBOARD_SECTION_SURFACE}>
        <h2 className="text-base font-semibold">Texts to you and your staff</h2>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          New online orders, shift and supply alerts, the nightly restock list and scheduled report
          summaries are set up in their own pages.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={APP_ROUTES.businessConfiguration}>Owner alerts</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function PromoRule({
  id,
  title,
  description,
  enabled,
  draft,
  saved,
  standard,
  footer,
  canManage,
  busy,
  onToggle,
  onDraft,
  onSave,
  children,
}: {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  draft: string;
  saved: string;
  standard: string;
  footer: string;
  canManage: boolean;
  busy: boolean;
  onToggle: (checked: boolean) => void;
  onDraft: (value: string) => void;
  onSave: () => void;
  children?: ReactNode;
}) {
  const text = `${(draft.trim() || standard).trim()} ${footer}`;
  const size = smsSize(text);
  return (
    <div className="mt-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] pt-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor={`rule-${id}`} className="text-sm font-medium">
            {title}
          </label>
          <p className={dashboardHintClass()}>{description}</p>
        </div>
        <Switch
          id={`rule-${id}`}
          checked={enabled}
          disabled={!canManage || busy}
          onCheckedChange={onToggle}
        />
      </div>
      {enabled ? (
        <div className="mt-2">
          <textarea
            className={dashboardTextareaClass(!canManage)}
            rows={2}
            maxLength={320}
            disabled={!canManage}
            placeholder={standard}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            aria-label={`Wording for ${title}`}
          />
          <p className={cn(dashboardHintClass(), "mt-1")}>
            About {size.parts} SMS credit{size.parts === 1 ? "" : "s"} each
            {size.encoding === "UNICODE" ? " (emoji or special letters make texts cost more)" : ""}.
          </p>
          {canManage && draft.trim() !== saved ? (
            <Button type="button" size="sm" className="mt-1.5" disabled={busy} onClick={onSave}>
              Save wording
            </Button>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}
