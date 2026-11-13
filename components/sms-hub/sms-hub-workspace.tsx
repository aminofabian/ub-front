"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
} from "@/components/dashboard-page-ui";
import { useSmsCreditBalance } from "@/components/messaging/sms-credits-header";
import { SmsHubActivity } from "@/components/sms-hub/sms-hub-activity";
import { SmsHubAutomations } from "@/components/sms-hub/sms-hub-automations";
import {
  SmsHubCampaigns,
  type CampaignRequest,
} from "@/components/sms-hub/sms-hub-campaigns";
import { SmsHubContacts } from "@/components/sms-hub/sms-hub-contacts";
import { SmsHubOverview } from "@/components/sms-hub/sms-hub-overview";
import {
  SMS_INK,
  SMS_MUTED,
  SMS_RULE,
  SMS_WARN_TEXT,
  errorText,
  formatNumber,
} from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSmsAutomations,
  fetchSmsHubSummary,
  type SmsAutomations,
  type SmsHubSummary,
  type SmsReach,
} from "@/lib/sms-hub-api";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "contacts" | "automations" | "campaigns" | "activity";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "contacts", label: "Contacts" },
  { key: "automations", label: "Automatic texts" },
  { key: "campaigns", label: "Campaigns" },
  { key: "activity", label: "Sent messages" },
];

export function SmsHubWorkspace() {
  const { loading, canViewCustomers, canManageCustomers } = useDashboard();
  const { balance } = useSmsCreditBalance();
  const [tab, setTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<SmsHubSummary | null>(null);
  const [automations, setAutomations] = useState<SmsAutomations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaignRequest, setCampaignRequest] = useState<CampaignRequest | null>(null);
  const [contactsReach, setContactsReach] = useState<SmsReach | null>(null);
  const [contactsKey, setContactsKey] = useState(0);

  const loadSummary = useCallback(() => {
    fetchSmsHubSummary()
      .then(setSummary)
      .catch((err) => setError(errorText(err, "Could not load the SMS summary.")));
  }, []);

  const loadAutomations = useCallback(() => {
    fetchSmsAutomations()
      .then(setAutomations)
      .catch(() => {
        // The Automatic texts tab reports its own load errors.
      });
  }, []);

  useEffect(() => {
    if (loading || !canViewCustomers) return;
    loadSummary();
    loadAutomations();
  }, [loading, canViewCustomers, loadSummary, loadAutomations]);

  const go = useCallback(
    (next: TabKey) => {
      setTab(next);
      if (next === "overview") {
        loadSummary();
        loadAutomations();
      }
    },
    [loadSummary, loadAutomations],
  );

  const openContacts = useCallback((reach: SmsReach | null) => {
    setContactsReach(reach);
    setContactsKey((k) => k + 1);
    setTab("contacts");
  }, []);

  const requestCampaign = useCallback((request: CampaignRequest) => {
    setCampaignRequest(request);
    setTab("campaigns");
  }, []);

  const consumeCampaignRequest = useCallback(() => setCampaignRequest(null), []);

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

  const metered = Boolean(balance?.meteringEnabled);

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "gap-3 px-3 pt-3 sm:px-4")}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className={cn("font-serif text-[1.75rem] font-semibold leading-none tracking-[-0.01em]", SMS_INK)}>
            SMS
          </h1>
          <p className={cn("mt-1.5 text-[13.5px]", SMS_MUTED)}>
            Who you can text, what sends itself, and the offers you send to a group.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {metered && balance ? (
            <div className="text-right">
              <p className={cn("text-[12px] leading-none", SMS_MUTED)}>Credits left</p>
              <p
                className={cn(
                  "mt-1 font-mono text-[18px] font-medium leading-none tabular-nums",
                  balance.lowBalance ? SMS_WARN_TEXT : SMS_INK,
                )}
              >
                {formatNumber(balance.available)}
              </p>
            </div>
          ) : null}
          {canManageCustomers ? (
            <Button
              type="button"
              className="rounded-[2px]"
              onClick={() => requestCampaign({ kind: "new" })}
            >
              <Plus className="size-4" aria-hidden />
              New campaign
            </Button>
          ) : null}
        </div>
      </header>

      <div
        role="tablist"
        aria-label="SMS sections"
        className={cn("flex h-11 items-stretch gap-1 overflow-x-auto border-b", SMS_RULE)}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = t.key === "contacts" ? summary?.contacts.total : undefined;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`sms-tab-${t.key}`}
              aria-selected={active}
              aria-controls={`sms-panel-${t.key}`}
              onClick={() => go(t.key)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[14px] transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]",
                active
                  ? "border-[var(--op-accent,#1d4b3b)] font-semibold text-[var(--op-accent,#1d4b3b)]"
                  : cn("border-transparent hover:text-[var(--op-ink,#121a16)]", SMS_MUTED),
              )}
            >
              {t.label}
              {count !== undefined ? (
                <span className="font-mono text-[12px] font-normal tabular-nums opacity-70">
                  {formatNumber(count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {summary && !summary.smsConfigured ? (
        <DashboardFeedback
          kind="warning"
          text="SMS is not set up for this shop yet, so nothing can be sent. You can still record who agreed to offers and write drafts."
        />
      ) : null}

      <div role="tabpanel" id={`sms-panel-${tab}`} aria-labelledby={`sms-tab-${tab}`}>
        {tab === "overview" ? (
          <SmsHubOverview
            summary={summary}
            automations={automations}
            balance={balance}
            canManage={canManageCustomers}
            onOpenContacts={openContacts}
            onOpenAutomations={() => go("automations")}
            onOpenCampaigns={() => go("campaigns")}
            onOpenCampaign={(id) => requestCampaign({ kind: "open", id })}
            onOpenActivity={() => go("activity")}
            onNewCampaign={() => requestCampaign({ kind: "new" })}
          />
        ) : null}
        {tab === "contacts" ? (
          <>
            <SmsHubContacts
              key={contactsKey}
              initialReach={contactsReach}
              canManage={canManageCustomers}
              onChanged={loadSummary}
              onTextSelected={(ids) => requestCampaign({ kind: "selected", customerIds: ids })}
            />
            <p className={cn("px-1 pt-3 text-[13px]", SMS_MUTED)}>
              To collect more numbers, turn on adding a customer at checkout for cash and M-Pesa sales in{" "}
              <Link className="text-[var(--op-accent,#1d4b3b)] underline-offset-4 hover:underline" href={APP_ROUTES.businessSettings}>
                Business settings
              </Link>
              .
            </p>
          </>
        ) : null}
        {tab === "automations" ? (
          <SmsHubAutomations canManage={canManageCustomers} onSaved={setAutomations} />
        ) : null}
        {tab === "campaigns" ? (
          <SmsHubCampaigns
            canManage={canManageCustomers}
            sendWindow={summary?.sendWindow ?? "8:00 am to 6:00 pm"}
            optOutFooter={automations?.optOutFooter ?? "Reply STOP to opt out"}
            request={campaignRequest}
            onRequestConsumed={consumeCampaignRequest}
          />
        ) : null}
        {tab === "activity" ? <SmsHubActivity /> : null}
      </div>
    </div>
  );
}
