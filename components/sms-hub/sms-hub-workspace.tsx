"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Users } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { SmsHubActivity } from "@/components/sms-hub/sms-hub-activity";
import { SmsHubAutomations } from "@/components/sms-hub/sms-hub-automations";
import { SmsHubCampaigns } from "@/components/sms-hub/sms-hub-campaigns";
import { SmsHubContacts } from "@/components/sms-hub/sms-hub-contacts";
import { errorText } from "@/components/sms-hub/sms-hub-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSmsAutomations,
  fetchSmsHubSummary,
  type SmsHubSummary,
} from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

type TabKey = "contacts" | "automations" | "campaigns" | "activity";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "contacts", label: "Contacts" },
  { key: "automations", label: "Automatic texts" },
  { key: "campaigns", label: "Campaigns" },
  { key: "activity", label: "Sent messages" },
];

export function SmsHubWorkspace() {
  const { loading, canViewCustomers, canManageCustomers } = useDashboard();
  const [tab, setTab] = useState<TabKey>("contacts");
  const [summary, setSummary] = useState<SmsHubSummary | null>(null);
  const [optOutFooter, setOptOutFooter] = useState("Reply STOP to opt out");
  const [error, setError] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<string[] | null>(null);

  const loadSummary = useCallback(() => {
    fetchSmsHubSummary()
      .then(setSummary)
      .catch((err) => setError(errorText(err, "Could not load the SMS summary.")));
  }, []);

  useEffect(() => {
    if (loading || !canViewCustomers) return;
    loadSummary();
    fetchSmsAutomations()
      .then((a) => setOptOutFooter(a.optOutFooter))
      .catch(() => {
        // The default wording above is used until settings load.
      });
  }, [loading, canViewCustomers, loadSummary]);

  const consumeCompose = useCallback(() => setComposeFor(null), []);

  if (loading) {
    return <DashboardLoading label="Loading session…" />;
  }
  if (!canViewCustomers) {
    return (
      <DashboardAccessDenied
        title="SMS"
        description="You do not have access to this area."
        backHref={APP_ROUTES.business}
        backLabel="Business settings"
      />
    );
  }

  const contacts = summary?.contacts;

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero
        icon={MessageSquareText}
        title="SMS"
        description="Who you can text, what goes out on its own, and offers you send to a group."
      >
        <DashboardQuickLinks
          compact
          links={[
            {
              href: APP_ROUTES.customers,
              label: "Customers",
              desc: "Full directory",
              icon: Users,
            },
          ]}
        />
      </DashboardPageHero>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}

      {summary && !summary.smsConfigured ? (
        <DashboardFeedback
          kind="warning"
          text="SMS is not set up for this shop yet, so nothing can be sent. You can still record which customers agreed to offers and write drafts."
        />
      ) : null}

      <section className={cn(DASHBOARD_SECTION_SURFACE, "grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4")}>
        <Figure
          label="Can get offers"
          value={contacts ? contacts.canText : null}
          hint={contacts ? `of ${contacts.total.toLocaleString("en-KE")} customers` : undefined}
        />
        <Figure
          label="Order updates only"
          value={contacts ? contacts.receiptsOnly + contacts.optedOut : null}
          hint="have not agreed, or opted out"
        />
        <Figure
          label="No number to text"
          value={contacts ? contacts.noNumber : null}
          hint="includes M-Pesa masked numbers"
        />
        <Figure
          label="Sent in 30 days"
          value={summary ? summary.messagesLast30Days : null}
          hint={summary ? `${summary.creditsLast30Days.toLocaleString("en-KE")} credits` : undefined}
        />
      </section>

      {contacts && contacts.total > 0 && contacts.canText === 0 ? (
        <DashboardFeedback
          kind="warning"
          text="No customer has agreed to offers yet. Ask at the till, then tick them on the Contacts tab and choose “Mark as agreed to offers”. Order updates still go out without this."
        />
      ) : null}

      <div
        role="tablist"
        aria-label="SMS sections"
        className="flex gap-0.5 overflow-x-auto border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`sms-tab-${t.key}`}
              aria-selected={active}
              aria-controls={`sms-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-[var(--pos-primary,#1D4B3B)] font-semibold text-[var(--pos-primary,#1D4B3B)]"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`sms-panel-${tab}`} aria-labelledby={`sms-tab-${tab}`}>
        {tab === "contacts" ? (
          <>
            <SmsHubContacts
              canManage={canManageCustomers}
              onChanged={loadSummary}
              onTextSelected={(ids) => {
                setComposeFor(ids);
                setTab("campaigns");
              }}
            />
            <p className="px-1 pt-2 text-sm text-muted-foreground">
              To collect more numbers, turn on adding a customer at checkout for cash and M-Pesa sales in{" "}
              <Link className="text-primary hover:underline" href={APP_ROUTES.businessSettings}>
                Business settings
              </Link>
              .
            </p>
          </>
        ) : null}
        {tab === "automations" ? <SmsHubAutomations canManage={canManageCustomers} /> : null}
        {tab === "campaigns" ? (
          <SmsHubCampaigns
            canManage={canManageCustomers}
            sendWindow={summary?.sendWindow ?? "8:00 am to 6:00 pm"}
            optOutFooter={optOutFooter}
            composeFor={composeFor}
            onComposeConsumed={consumeCompose}
          />
        ) : null}
        {tab === "activity" ? <SmsHubActivity /> : null}
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">
        {value === null ? "…" : value.toLocaleString("en-KE")}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
