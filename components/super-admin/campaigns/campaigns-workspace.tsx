"use client";

import { Menu, PanelRight, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  createSaEmailCampaign,
  fetchSaEmailCampaign,
  fetchSaEmailCampaigns,
  fetchSaEmailRecipients,
  previewSaEmailCampaign,
  sendSaEmailCampaign,
  type SaEmailCampaignDetail,
  type SaEmailCampaignSummary,
  type SaEmailPreview,
  type SaEmailRecipientRow,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import { CampaignsAiPanel } from "./campaigns-ai-panel";
import { CampaignsAnalytics } from "./campaigns-analytics";
import { CampaignsComposer } from "./campaigns-composer";
import { CampaignsLibraryNav } from "./campaigns-library-nav";
import {
  FILTERS,
  SAMPLE_MERCHANTS,
  TEMPLATES,
  type CampaignNavId,
  type CampaignType,
  type GeneratedCampaign,
  type IntentId,
  type SampleMerchant,
  type WorkspaceMode,
  generateCampaign,
  interpretAsk,
  mapApiStatus,
  rewriteBody,
} from "./campaigns-model";
import { CampaignsOverview } from "./campaigns-overview";
import { CampaignsPeople } from "./campaigns-people";
import { CampaignsTemplates } from "./campaigns-templates";

export function CampaignsCommandCentre({
  initialMode,
  campaignId,
}: {
  initialMode: WorkspaceMode;
  campaignId?: string;
}) {
  const router = useRouter();
  const [nav, setNav] = useState<CampaignNavId>(
    initialMode === "compose"
      ? "drafts"
      : initialMode === "people"
        ? "people"
        : "overview",
  );
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [rows, setRows] = useState<SaEmailCampaignSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusChip, setStatusChip] = useState("all");
  const [typeChip, setTypeChip] = useState<CampaignType | "all">("all");
  const [ask, setAsk] = useState("");
  const [askResult, setAskResult] = useState<ReturnType<typeof interpretAsk> | null>(null);
  const [intent, setIntent] = useState<IntentId | null>(
    initialMode === "compose" ? "activate" : null,
  );
  const [pickingIntent, setPickingIntent] = useState(initialMode === "compose" && !campaignId);
  const [campaignName, setCampaignName] = useState("Finish setting up your Kiosk store");
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null);
  const [subject, setSubject] = useState("Your Kiosk store is almost ready");
  const [previewText, setPreviewText] = useState(
    "Your products, M-Pesa and online store are waiting for you.",
  );
  const [body, setBody] = useState(generateCampaign("finish setup", "activate").body);
  const [cta, setCta] = useState("Continue setup");
  const [activeFilters, setActiveFilters] = useState<string[]>(["setup"]);
  const [composerTab, setComposerTab] = useState<"write" | "design" | "preview">("write");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [merchantId, setMerchantId] = useState(SAMPLE_MERCHANTS[1]?.id ?? "m2");
  const [aiPrompt, setAiPrompt] = useState(
    "Write an email to merchants who signed up but haven't finished setting up their store.",
  );
  const [sendMode, setSendMode] = useState<"now" | "schedule" | "smart">("smart");
  const [scheduleAt, setScheduleAt] = useState("2026-08-26T09:00");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<SaEmailPreview | null>(null);
  const [detail, setDetail] = useState<SaEmailCampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<SaEmailRecipientRow[]>([]);
  const [liveAudience, setLiveAudience] = useState<number | null>(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<
    SampleMerchant | SaEmailRecipientRow | null
  >(SAMPLE_MERCHANTS[0] ?? null);
  const [ab, setAb] = useState({
    on: false,
    a: "Your Kiosk store is almost ready",
    b: "You're only 5 minutes away from selling online",
  });
  const [dynamicIfStorefront, setDynamicIfStorefront] = useState(true);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const result = await fetchSaEmailCampaigns(0, 80);
      setRows(result.rows);
      setTotal(result.total);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const segment = FILTERS.find((f) => activeFilters.includes(f.id) && f.segment)?.segment;
    if (!segment) {
      setLiveAudience(null);
      return;
    }
    let cancelled = false;
    void fetchSaEmailRecipients({ segment }, 0, 500)
      .then((r) => {
        if (cancelled) return;
        setRecipients(r.rows);
        setLiveAudience(r.total);
      })
      .catch(() => {
        if (!cancelled) setLiveAudience(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFilters]);

  useEffect(() => {
    if (!campaignId) return;
    void fetchSaEmailCampaign(campaignId)
      .then((c) => {
        setDetail(c);
        setCampaignName(c.name);
        setSubject(c.subject);
        setBody(c.bodyMarkdown);
        setCta(c.ctaLabel);
        setMode("analytics");
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Could not load campaign."),
      );
  }, [campaignId]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const st = mapApiStatus(row.status);
      if (nav === "drafts" && st !== "draft") return false;
      if (nav === "scheduled" && st !== "scheduled") return false;
      if (nav === "sending" && st !== "sending") return false;
      if (nav === "sent" && st !== "sent") return false;
      if (nav === "archived" && st !== "archived") return false;
      if (statusChip !== "all" && st !== statusChip) return false;
      if (typeChip !== "all" && row.segmentKey && typeChip === "onboarding") {
        if (!row.segmentKey.includes("stuck") && !row.segmentKey.includes("unverified")) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${row.name} ${row.subject} ${row.segmentKey}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, nav, statusChip, typeChip, search]);

  const goNav = (id: CampaignNavId) => {
    setNav(id);
    setLeftOpen(false);
    if (id === "overview") {
      setMode("overview");
      router.push(APP_ROUTES.superAdminCampaigns);
    } else if (id === "templates") setMode("templates");
    else if (id === "automations") setMode("automations");
    else if (id === "people" || id === "audiences") setMode("people");
    else setMode("overview");
  };

  const applyGenerated = (gen: GeneratedCampaign) => {
    setSubject(gen.subject);
    setPreviewText(gen.previewText);
    setBody(gen.body);
    setCta(gen.cta);
  };

  const startCreate = () => {
    setPickingIntent(true);
    setIntent(null);
    setCopiedFrom(null);
    setMode("compose");
    setNav("drafts");
    router.push(APP_ROUTES.superAdminCampaignNew);
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number], asCopy = false) => {
    setCampaignName(tpl.name);
    setSubject(tpl.subject);
    setPreviewText(tpl.previewText);
    setBody(tpl.body);
    setCta(tpl.cta);
    setCopiedFrom(asCopy ? tpl.name : null);
    setPickingIntent(false);
    setMode("compose");
    router.push(APP_ROUTES.superAdminCampaignNew);
  };

  const segmentKey =
    FILTERS.find((f) => activeFilters.includes(f.id) && f.segment)?.segment ??
    "stuck_signup";

  const payload = {
    name: campaignName.trim() || "Untitled campaign",
    segmentKey,
    subject: subject.trim(),
    bodyMarkdown: body,
    ctaLabel: cta.trim() || "Continue",
  };

  const onPreview = async () => {
    setBusy(true);
    try {
      setPreview(await previewSaEmailCampaign(payload));
      setComposerTab("preview");
    } catch (e) {
      showThemedErrorToast(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const performSend = async () => {
    setBusy(true);
    try {
      const draft = await createSaEmailCampaign(payload);
      const sent = await sendSaEmailCampaign(draft.id);
      showThemedSuccessToast(
        `Sent ${sent.recipientsSent} · failed ${sent.recipientsFailed} · skipped ${sent.recipientsSkipped}`,
      );
      router.push(`${APP_ROUTES.superAdminCampaigns}/${sent.id}`);
    } catch (e) {
      showThemedErrorToast(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSend = () => {
    showThemedConfirmToast({
      id: "send-kiosk-campaign",
      title: "Send this campaign?",
      description:
        sendMode === "smart"
          ? "Smart send: tomorrow 9:00 AM based on previous engagement. From: Kiosk <hello@kiosk.ke>."
          : sendMode === "schedule"
            ? `Scheduled for ${scheduleAt}. From: Kiosk <hello@kiosk.ke>.`
            : "From: Kiosk <hello@kiosk.ke>. This send cannot be run twice.",
      confirmLabel: "Send",
      onConfirm: () => void performSend(),
    });
  };

  const runAsk = () => {
    const result = interpretAsk(ask);
    setAskResult(result);
    setActiveFilters(result.filters);
    setIntent(result.intent);
    applyGenerated(generateCampaign(ask, result.intent));
    setPickingIntent(false);
    setMode("compose");
  };

  const sentCount = rows.filter((r) => mapApiStatus(r.status) === "sent").length;
  const sendingCount = rows.filter((r) => mapApiStatus(r.status) === "sending").length;
  const scheduledCount = rows.filter((r) => mapApiStatus(r.status) === "scheduled").length;
  const activeCount = Math.max(
    sendingCount + scheduledCount,
    rows.filter((r) => mapApiStatus(r.status) !== "sent").length,
  );

  const left = (
    <CampaignsLibraryNav
      nav={nav}
      typeChip={typeChip}
      liveAudience={liveAudience}
      activeCount={activeCount}
      scheduledCount={scheduledCount}
      onNav={goNav}
      onCreate={startCreate}
      onType={(t) => {
        setTypeChip(t);
        setNav("all");
        setMode("overview");
      }}
    />
  );

  const right = (
    <CampaignsAiPanel
      mode={mode}
      person={selectedPerson}
      prompt={aiPrompt}
      onPrompt={setAiPrompt}
      onGenerate={() => applyGenerated(generateCampaign(aiPrompt, intent ?? "custom"))}
      onRewrite={(m) => setBody((b) => rewriteBody(b, m))}
      liveAudience={liveAudience}
      filters={activeFilters}
      onUseSuggestion={(ids) => {
        setActiveFilters(ids);
        setMode("compose");
        setPickingIntent(false);
      }}
    />
  );

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] min-h-[640px] flex-col bg-[#FBFBFA] sm:-mx-6 lg:-mx-8">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/70 bg-white px-3">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="xl:hidden"
          aria-label="Campaigns library"
          onClick={() => setLeftOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
        <Sparkles className="size-3.5 text-emerald-700" aria-hidden />
        <label className="sr-only" htmlFor="ask-kiosk">
          Ask Kiosk
        </label>
        <input
          id="ask-kiosk"
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runAsk();
          }}
          placeholder="Ask Kiosk — find merchants, draft a campaign, recommend a send time…"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={runAsk}>
          Ask
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="xl:hidden"
          aria-label="Context panel"
          onClick={() => setRightOpen(true)}
        >
          <PanelRight className="size-4" />
        </Button>
      </div>

      {askResult ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-emerald-50/80 px-4 py-2 text-sm">
          <span className="font-medium text-foreground">
            {askResult.count.toLocaleString()} merchants found.
          </span>
          <span className="text-muted-foreground">{askResult.summary}</span>
          <Button type="button" size="sm" className="h-7" onClick={() => setMode("compose")}>
            Create campaign
          </Button>
          <button
            type="button"
            className="ml-auto text-xs text-muted-foreground"
            onClick={() => setAskResult(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {loadError ? (
        <div className="px-4 pt-3">
          <AuthAlert variant="error">{loadError}</AuthAlert>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[240px] shrink-0 border-r border-border/70 xl:block">{left}</aside>
        <section className="min-w-0 flex-1 overflow-y-auto">
          {mode === "overview" ? (
            <CampaignsOverview
              loading={loading}
              total={total}
              rows={filteredRows}
              search={search}
              onSearch={setSearch}
              statusChip={statusChip}
              onStatus={setStatusChip}
              typeChip={typeChip}
              onType={setTypeChip}
              onCreate={startCreate}
              onOpen={(id) => router.push(`${APP_ROUTES.superAdminCampaigns}/${id}`)}
              onReuse={(row) => {
                setCopiedFrom(row.name);
                setCampaignName(`${row.name} (copy)`);
                setSubject(row.subject);
                setPickingIntent(false);
                setMode("compose");
                router.push(APP_ROUTES.superAdminCampaignNew);
              }}
              library={nav === "library"}
              activeCount={activeCount}
              scheduledCount={scheduledCount}
              sentCount={sentCount}
            />
          ) : null}
          {mode === "compose" ? (
            <CampaignsComposer
              pickingIntent={pickingIntent}
              onPickIntent={(id) => {
                setIntent(id);
                setPickingIntent(false);
                const item = {
                  activate: ["setup"],
                  upgrade: ["gt-500", "plan"],
                  storefront: ["any-products", "unpublished"],
                  catalog: ["no-products", "setup"],
                  feature: ["verified"],
                  reengage: ["last-login"],
                  custom: [] as string[],
                }[id];
                setActiveFilters(item);
                applyGenerated(generateCampaign(id, id));
                setCampaignName(
                  id === "activate"
                    ? "Activate merchants"
                    : id === "storefront"
                      ? "Grow online stores"
                      : id === "reengage"
                        ? "Re-engage inactive merchants"
                        : "Campaign",
                );
              }}
              name={campaignName}
              onName={setCampaignName}
              copiedFrom={copiedFrom}
              subject={subject}
              onSubject={setSubject}
              previewText={previewText}
              onPreviewText={setPreviewText}
              body={body}
              onBody={setBody}
              cta={cta}
              onCta={setCta}
              filters={activeFilters}
              onToggleFilter={(id) =>
                setActiveFilters((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
              liveAudience={liveAudience}
              recipients={recipients}
              tab={composerTab}
              onTab={setComposerTab}
              device={previewDevice}
              onDevice={setPreviewDevice}
              merchantId={merchantId}
              onMerchant={setMerchantId}
              preview={preview}
              onPreview={() => void onPreview()}
              onSend={onSend}
              busy={busy}
              sendMode={sendMode}
              onSendMode={setSendMode}
              scheduleAt={scheduleAt}
              onScheduleAt={setScheduleAt}
              ab={ab}
              onAb={setAb}
              dynamicIfStorefront={dynamicIfStorefront}
              onDynamic={setDynamicIfStorefront}
            />
          ) : null}
          {mode === "analytics" && detail ? <CampaignsAnalytics detail={detail} /> : null}
          {mode === "people" ? (
            <CampaignsPeople
              query={peopleQuery}
              onQuery={setPeopleQuery}
              recipients={recipients}
              selected={selectedPerson}
              onSelect={setSelectedPerson}
            />
          ) : null}
          {mode === "templates" ? (
            <CampaignsTemplates
              onUse={(t) => applyTemplate(t)}
              onCopy={(t) => applyTemplate(t, true)}
            />
          ) : null}
          {mode === "automations" ? <CampaignsTemplates automations /> : null}
        </section>
        <aside className="hidden w-[320px] shrink-0 xl:block">{right}</aside>
      </div>

      {leftOpen ? (
        <MobileDrawer onClose={() => setLeftOpen(false)} side="left">
          {left}
        </MobileDrawer>
      ) : null}
      {rightOpen ? (
        <MobileDrawer onClose={() => setRightOpen(false)} side="right">
          {right}
        </MobileDrawer>
      ) : null}
    </div>
  );
}

function MobileDrawer({
  children,
  onClose,
  side,
}: {
  children: React.ReactNode;
  onClose: () => void;
  side: "left" | "right";
}) {
  return (
    <div className="fixed inset-0 z-50 xl:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 w-[min(320px,90vw)] overflow-y-auto bg-white shadow-xl",
          side === "left" ? "left-0" : "right-0",
        )}
      >
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="absolute right-2 top-2 z-10"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
        {children}
      </div>
    </div>
  );
}
