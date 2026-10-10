"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, RefreshCw } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchAllSaBusinesses,
  fetchPlatformIntegrations,
  fetchSaCrmWebhookEvents,
  fetchSaWhatsAppNumbers,
  fetchSaWhatsAppSettings,
  routeSaWhatsAppNumber,
  setSaWhatsAppNumberStatus,
  updatePlatformIntegrations,
  updateSaWhatsAppSettings,
  type PlatformIntegrationsRecord,
  type SaBusinessRow,
  type SaCrmWebhookEventRow,
  type SaWhatsAppNumberRow,
  type SaWhatsAppNumbersResponse,
  type SaWhatsAppSettings,
  type UpdatePlatformIntegrationsPayload,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

export default function SuperAdminWhatsAppNumbersPage() {
  const [data, setData] = useState<SaWhatsAppNumbersResponse | null>(null);
  const [settings, setSettings] = useState<SaWhatsAppSettings | null>(null);
  const [integ, setInteg] = useState<PlatformIntegrationsRecord | null>(null);
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaGraphVersion, setMetaGraphVersion] = useState("v25.0");
  const [metaWebhookVerifyToken, setMetaWebhookVerifyToken] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaBusy, setMetaBusy] = useState(false);
  const [businesses, setBusinesses] = useState<SaBusinessRow[]>([]);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [displayNumber, setDisplayNumber] = useState("");
  const [label, setLabel] = useState("");
  const [events, setEvents] = useState<SaCrmWebhookEventRow[]>([]);
  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsUnroutedOnly, setEventsUnroutedOnly] = useState(false);

  const load = useCallback(async () => {
    setBooting(true);
    setError("");
    try {
      const [numbers, biz, channelSettings, integrations] = await Promise.all([
        fetchSaWhatsAppNumbers(),
        fetchAllSaBusinesses().catch(() => [] as SaBusinessRow[]),
        fetchSaWhatsAppSettings().catch(() => null),
        fetchPlatformIntegrations().catch(() => null),
      ]);
      setData(numbers);
      setBusinesses(biz);
      setSettings(channelSettings);
      setInteg(integrations);
      if (integrations) {
        setMetaPhoneNumberId(integrations.whatsappMetaPhoneNumberId ?? "");
        setMetaGraphVersion(integrations.whatsappMetaGraphVersion || "v25.0");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load WhatsApp numbers.");
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const businessOptions = useMemo(
    () => businesses.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  const onRoute = async () => {
    if (!phoneNumberId.trim() || !businessId) {
      setError("Enter a phone number ID and choose a shop.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await routeSaWhatsAppNumber(phoneNumberId.trim(), {
        businessId,
        displayNumber: displayNumber.trim() || undefined,
        label: label.trim() || undefined,
      });
      setNotice("Number routed.");
      setPhoneNumberId("");
      setDisplayNumber("");
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not route the number.");
    } finally {
      setBusy(false);
    }
  };

  const onSaveMeta = async () => {
    setMetaBusy(true);
    setError("");
    setNotice("");
    try {
      const payload: UpdatePlatformIntegrationsPayload = {
        whatsappMetaPhoneNumberId: metaPhoneNumberId.trim(),
        whatsappMetaGraphVersion: metaGraphVersion.trim() || "v25.0",
      };
      if (metaAccessToken.trim()) {
        payload.whatsappMetaAccessToken = metaAccessToken.trim();
      }
      if (metaWebhookVerifyToken.trim()) {
        payload.whatsappMetaWebhookVerifyToken = metaWebhookVerifyToken.trim();
      }
      if (metaAppSecret.trim()) {
        payload.whatsappMetaAppSecret = metaAppSecret.trim();
      }
      const saved = await updatePlatformIntegrations(payload);
      setInteg(saved);
      setMetaAccessToken("");
      setMetaWebhookVerifyToken("");
      setMetaAppSecret("");
      setNotice("Meta keys saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the Meta keys.");
    } finally {
      setMetaBusy(false);
    }
  };

  const onToggleSetting = async (key: "inboundEnabled" | "outboundEnabled") => {
    if (!settings) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await updateSaWhatsAppSettings({
        inboundEnabled:
          key === "inboundEnabled" ? !settings.inboundEnabled : settings.inboundEnabled,
        outboundEnabled:
          key === "outboundEnabled" ? !settings.outboundEnabled : settings.outboundEnabled,
      });
      setSettings(next);
      setNotice(
        `Channel updated (inbound ${next.inboundEnabled ? "on" : "off"}, outbound ${next.outboundEnabled ? "on" : "off"}).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the channel.");
    } finally {
      setBusy(false);
    }
  };

  const onStatus = async (row: SaWhatsAppNumberRow, action: "pause" | "resume") => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setSaWhatsAppNumberStatus(row.phoneNumberId, action);
      setNotice(action === "pause" ? "Number paused." : "Number resumed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the number.");
    } finally {
      setBusy(false);
    }
  };

  const loadEvents = useCallback(async () => {
    setEventsBusy(true);
    try {
      setEvents(
        await fetchSaCrmWebhookEvents({
          limit: 60,
          unroutedOnly: eventsUnroutedOnly,
        }),
      );
    } catch {
      // surfaced by the api layer
    } finally {
      setEventsBusy(false);
    }
  }, [eventsUnroutedOnly]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const rows = data?.numbers ?? [];

  return (
    <div className={cn("mx-auto flex w-full flex-col gap-3", DASHBOARD_MAX_WIDE)}>
      <DashboardPageHero
        icon={MessageCircle}
        title="WhatsApp numbers"
        description="Route Meta WhatsApp numbers to shops. Keys live in Platform → Integrations."
      />

      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      {notice ? (
        <p className="text-[13px] text-[var(--pos-primary,#0f766e)]">{notice}</p>
      ) : null}

      <section className={cn("flex flex-wrap items-center gap-2 border bg-white px-3 py-2", HAIRLINE)}>
        <span className="text-[13px] font-medium">Platform Meta</span>
        {data ? (
          <span
            className={cn(
              "text-[12px]",
              data.platformConfigured
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-amber-800",
            )}
          >
            {data.platformConfigured ? "configured" : "not configured"}
            {data.defaultPhoneNumberId ? " · default " + data.defaultPhoneNumberId : ""}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-8 rounded-none"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 size-4" />
          )}
          Refresh
        </Button>
      </section>

      {booting ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className={cn("border bg-white p-3", HAIRLINE)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold">Channel</span>
              <Button
                type="button"
                variant={settings?.inboundEnabled ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-none"
                disabled={busy || !settings}
                onClick={() => void onToggleSetting("inboundEnabled")}
              >
                Inbound: {settings?.inboundEnabled ? "on" : "off"}
              </Button>
              <Button
                type="button"
                variant={settings?.outboundEnabled ? "default" : "ghost"}
                size="sm"
                className="h-8 rounded-none"
                disabled={busy || !settings}
                onClick={() => void onToggleSetting("outboundEnabled")}
              >
                Outbound: {settings?.outboundEnabled ? "on" : "off"}
              </Button>
              <span className={dashboardHintClass()}>
                Inbound receives messages and runs auto-replies; outbound actually sends.
              </span>
            </div>
          </section>

          <section className={cn("border bg-white p-3", HAIRLINE)}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-semibold">Meta keys</h2>
              <span
                className={cn(
                  "text-[12px]",
                  settings?.metaConfigured ? "text-[var(--pos-primary,#0f766e)]" : "text-amber-800",
                )}
              >
                {settings?.metaConfigured ? "configured" : "not configured — the channel stays idle"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={dashboardLabelClass()} htmlFor="meta-token">
                  Access token
                </label>
                <input
                  id="meta-token"
                  type="password"
                  className={dashboardInputClass()}
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  placeholder={
                    integ?.hasWhatsappMetaAccessToken
                      ? "•••••• stored — paste to replace"
                      : "System User token"
                  }
                />
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="meta-pnid">
                  Phone number ID
                </label>
                <input
                  id="meta-pnid"
                  className={dashboardInputClass()}
                  value={metaPhoneNumberId}
                  onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                />
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="meta-graph">
                  Graph API version
                </label>
                <input
                  id="meta-graph"
                  className={dashboardInputClass()}
                  value={metaGraphVersion}
                  onChange={(e) => setMetaGraphVersion(e.target.value)}
                  placeholder="v25.0"
                />
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="meta-verify">
                  Webhook verify token
                </label>
                <input
                  id="meta-verify"
                  type="password"
                  className={dashboardInputClass()}
                  value={metaWebhookVerifyToken}
                  onChange={(e) => setMetaWebhookVerifyToken(e.target.value)}
                  placeholder={
                    integ?.hasWhatsappMetaWebhookVerifyToken
                      ? "•••••• stored — paste to replace"
                      : "you invent this"
                  }
                />
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="meta-secret">
                  App secret
                </label>
                <input
                  id="meta-secret"
                  type="password"
                  className={dashboardInputClass()}
                  value={metaAppSecret}
                  onChange={(e) => setMetaAppSecret(e.target.value)}
                  placeholder={
                    integ?.hasWhatsappMetaAppSecret
                      ? "•••••• stored — paste to replace"
                      : "Meta app secret"
                  }
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="h-8 rounded-none"
                disabled={metaBusy}
                onClick={() => void onSaveMeta()}
              >
                {metaBusy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null} Save keys
              </Button>
              <span className={dashboardHintClass()}>
                Callback URL <code className="font-mono text-[10px]">/webhooks/whatsapp</code> · subscribe to{" "}
                <b>messages</b>. Secrets are write-only — leave a field blank to keep the stored value.
              </span>
            </div>
          </section>

          <section className={cn("border bg-white p-3", HAIRLINE)}>
            <h2 className="mb-2 text-[13px] font-semibold">Route a number to a shop</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={dashboardLabelClass()} htmlFor="pnid">
                  Phone number ID
                </label>
                <input
                  id="pnid"
                  className={dashboardInputClass()}
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                />
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="shop">
                  Shop
                </label>
                <select
                  id="shop"
                  className={dashboardSelectClass()}
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                >
                  <option value="">Choose a shop…</option>
                  {businessOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="display">
                  Display number (optional)
                </label>
                <input
                  id="display"
                  className={dashboardInputClass()}
                  value={displayNumber}
                  onChange={(e) => setDisplayNumber(e.target.value)}
                  placeholder="254712345678"
                />
              </div>
              <div>
                <label className={dashboardLabelClass()} htmlFor="lab">
                  Label (optional)
                </label>
                <input
                  id="lab"
                  className={dashboardInputClass()}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Main line"
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="h-8 rounded-none"
                disabled={busy}
                onClick={() => void onRoute()}
              >
                {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null} Assign
              </Button>
              <span className={dashboardHintClass()}>
                Assigning an existing number reassigns it to the chosen shop.
              </span>
            </div>
          </section>

          <section className={cn("overflow-x-auto border bg-white", HAIRLINE)}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Number ID</th>
                  <th className="px-3 py-2">Display</th>
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Keys</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                      No numbers routed yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.phoneNumberId} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-[12px]">{row.phoneNumberId}</td>
                      <td className="px-3 py-2">{row.displayNumber ?? "—"}</td>
                      <td className="px-3 py-2">{row.businessName ?? row.businessId ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "text-[12px]",
                            row.status === "active"
                              ? "text-[var(--pos-primary,#0f766e)]"
                              : "text-amber-800",
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-none border px-1.5 text-[10px]",
                            row.ownCredentials
                              ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                              : "text-muted-foreground",
                          )}
                          title={
                            row.ownCredentials
                              ? "Uses the shop's own Meta app credentials"
                              : "Uses the platform Meta app"
                          }
                        >
                          {row.ownCredentials ? "own app" : "platform"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.status === "active" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-none"
                            disabled={busy}
                            onClick={() => void onStatus(row, "pause")}
                          >
                            Pause
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-none"
                            disabled={busy}
                            onClick={() => void onStatus(row, "resume")}
                          >
                            Resume
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className={cn("border bg-white p-3", HAIRLINE)}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-semibold">Recent inbound webhooks</h2>
              <Button
                type="button"
                variant={eventsUnroutedOnly ? "default" : "ghost"}
                size="sm"
                className="h-7 rounded-none"
                disabled={eventsBusy}
                onClick={() => setEventsUnroutedOnly((v) => !v)}
              >
                Unrouted only: {eventsUnroutedOnly ? "on" : "off"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7 rounded-none"
                disabled={eventsBusy}
                onClick={() => void loadEvents()}
              >
                {eventsBusy ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 size-3.5" />
                )}
                Refresh
              </Button>
            </div>
            <p className={dashboardHintClass()}>
              Raw Meta envelopes. Rows marked <b>unrouted</b> have no shop — the
              message never reaches an inbox. Copy the phone number ID into
              “Route a number to a shop” above to fix.
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1.5">When</th>
                    <th className="px-2 py-1.5">Phone number ID</th>
                    <th className="px-2 py-1.5">Shop</th>
                    <th className="px-2 py-1.5">wamid</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                        {eventsUnroutedOnly
                          ? "No unrouted webhooks."
                          : "No inbound webhooks yet."}
                      </td>
                    </tr>
                  ) : (
                    events.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-2 py-1.5 font-mono">
                          {e.phoneNumberId ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {e.businessId ? (
                            e.businessName ?? e.businessId
                          ) : (
                            <span className="text-amber-800">unrouted</span>
                          )}
                        </td>
                        <td className="max-w-[16rem] truncate px-2 py-1.5 font-mono text-[11px]">
                          {e.wamid ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
