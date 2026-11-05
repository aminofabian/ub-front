"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import {
  type CreateSaBusinessPayload,
  type SaBusinessRow,
  type SaSupportPresencePayload,
  createSaBusiness,
  deleteSaBusiness,
  ensureSaTenantSupportThread,
  fetchAllSaBusinesses,
  fetchSaEmailRecipients,
  fetchSaSupportPresence,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  BusinessesTheatre,
  type BusinessesPanel,
  type TenantArrival,
} from "./_components/businesses-theatre";
import {
  DEFAULT_FILTERS,
  EMPTY_PRESENCE,
  type TenantFilters,
  buildPresenceIndex,
  filterTenants,
  filtersFromSearch,
  filtersToSearch,
  formatAgo,
  presenceOf,
  segmentCounts,
  sortTenants,
  whatsappHref,
} from "./_components/tenant-filters";

/** How long a tenant is flagged "just came online" after it arrives. */
const ARRIVAL_HIGHLIGHT_MS = 45_000;
const ARRIVAL_LISTED_MS = 120_000;

const PRIMARY_BTN =
  "h-8 rounded-[2px] bg-primary px-3.5 text-primary-foreground shadow-none hover:bg-[#163B2E]";

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function formatTenantDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function tenantManageHref(b: SaBusinessRow) {
  const q = new URLSearchParams({
    name: b.name,
    slug: b.slug,
    tier: b.subscriptionTier,
    active: b.active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(b.id)}?${q.toString()}`;
}

function panelFromHash(hash: string): BusinessesPanel | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (id === "create") return { kind: "create" };
  if (id.startsWith("business-")) {
    const businessId = id.slice("business-".length);
    if (businessId) return { kind: "business", id: businessId };
  }
  return null;
}

export default function SuperAdminBusinessesPage() {
  const [rows, setRows] = useState<SaBusinessRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [countryCode, setCountryCode] = useState("KE");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [tier, setTier] = useState("starter");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters live in the address bar (?live=online&state=stuck…) so a view can
  // be bookmarked or sent to a teammate. This page only renders client-side
  // after the session check, so reading `window` here is safe.
  const [filters, setFilters] = useState<TenantFilters>(() =>
    typeof window === "undefined"
      ? DEFAULT_FILTERS
      : filtersFromSearch(window.location.search),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stuckIds, setStuckIds] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<BusinessesPanel | null>(null);
  const [presencePayload, setPresencePayload] =
    useState<SaSupportPresencePayload | null>(null);
  const [presenceAt, setPresenceAt] = useState<number | null>(null);
  const [presenceFailed, setPresenceFailed] = useState(false);
  const [onlineSeries, setOnlineSeries] = useState<number[]>([]);
  const [arrivals, setArrivals] = useState<{ id: string; at: number }[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(() => new Set());
  const [chatBusyId, setChatBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const router = useRouter();
  const slugTouched = useRef(false);
  const copyTimer = useRef<number | null>(null);
  const loadedOnce = useRef(false);
  const rowsRef = useRef<SaBusinessRow[]>([]);
  const watchedRef = useRef<Set<string>>(new Set());
  const prevOnlineRef = useRef<Set<string> | null>(null);

  const reloadPresence = useCallback(async () => {
    try {
      const payload = await fetchSaSupportPresence();
      const at = Date.now();

      // Who came online since the last answer. The first answer is only the
      // baseline, so opening the page never announces everyone already on.
      const online = new Set<string>();
      buildPresenceIndex(payload).byId.forEach((live, id) => {
        if (live.online) online.add(id);
      });
      const before = prevOnlineRef.current;
      prevOnlineRef.current = online;
      if (before) {
        const joined = [...online].filter((id) => !before.has(id));
        if (joined.length > 0) {
          setArrivals((list) => [
            ...list.filter((item) => !joined.includes(item.id)),
            ...joined.map((id) => ({ id, at })),
          ]);
          const heard = joined.filter((id) => watchedRef.current.has(id));
          if (heard.length > 0) {
            for (const id of heard) {
              const name =
                rowsRef.current.find((row) => row.id === id)?.name ??
                "A tenant";
              showThemedSuccessToast(`${name} is online.`);
            }
            setWatchedIds((current) => {
              const next = new Set(current);
              heard.forEach((id) => next.delete(id));
              return next;
            });
          }
        }
      }

      setPresencePayload(payload);
      setPresenceAt(at);
      setPresenceFailed(false);
      setNow(at);
      setOnlineSeries((series) => [...series, payload.tenantsOnline].slice(-90));
    } catch {
      /* keep the last good snapshot; the live clock shows it going stale */
      setPresenceFailed(true);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoadError("");
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    try {
      const [tenants, stuck] = await Promise.all([
        fetchAllSaBusinesses(100),
        fetchSaEmailRecipients({ segment: "stuck_signup" }, 0, 500).catch(
          () => ({
            rows: [] as { businessId: string }[],
            total: 0,
          }),
        ),
      ]);
      setRows(tenants);
      setStuckIds(new Set(stuck.rows.map((row) => row.businessId)));
      setNow(Date.now());
      void reloadPresence();
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load businesses.",
      );
    } finally {
      loadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [reloadPresence]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Who is on the app: open realtime sockets, same source as Support. Polls
  // while the tab is visible and catches up the moment it is shown again.
  useEffect(() => {
    void reloadPresence();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void reloadPresence();
    }, 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void reloadPresence();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reloadPresence]);

  // Browser back often restores this page from bfcache with stale rows.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void reload();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && loadedOnce.current) {
        void reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    const apply = () => {
      const next = panelFromHash(window.location.hash);
      if (next) setSelected(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    watchedRef.current = watchedIds;
  }, [watchedIds]);

  // Mirror the filters into the address bar without adding history entries.
  useEffect(() => {
    const query = filtersToSearch(filters);
    const { pathname, search, hash } = window.location;
    const next = `${pathname}${query ? `?${query}` : ""}${hash}`;
    if (next !== `${pathname}${search}${hash}`) {
      window.history.replaceState(null, "", next);
    }
  }, [filters]);

  const presenceIndex = useMemo(
    () =>
      presencePayload ? buildPresenceIndex(presencePayload) : EMPTY_PRESENCE,
    [presencePayload],
  );
  const filterContext = useMemo(
    () => ({ stuckIds, presence: presenceIndex, now }),
    [stuckIds, presenceIndex, now],
  );
  const counts = useMemo(
    () => segmentCounts(rows, filterContext),
    [rows, filterContext],
  );
  const visibleRows = useMemo(
    () =>
      sortTenants(
        filterTenants(rows, filters, filterContext),
        filters.sort,
        filterContext,
      ),
    [rows, filters, filterContext],
  );
  const onlineIds = useMemo(
    () =>
      rows
        .filter((row) => presenceOf(presenceIndex, row.id).online)
        .map((row) => row.id),
    [rows, presenceIndex],
  );
  const recentArrivals = useMemo<TenantArrival[]>(() => {
    const byId = new Map(rows.map((row) => [row.id, row] as const));
    return arrivals
      .flatMap((item) => {
        const row = byId.get(item.id);
        return row && now - item.at < ARRIVAL_LISTED_MS
          ? [{ id: item.id, name: row.name, at: item.at }]
          : [];
      })
      .sort((a, b) => b.at - a.at);
  }, [arrivals, rows, now]);
  const arrivedIds = useMemo(
    () =>
      new Set(
        recentArrivals
          .filter((item) => now - item.at < ARRIVAL_HIGHLIGHT_MS)
          .map((item) => item.id),
      ),
    [recentArrivals, now],
  );

  const updateFilters = useCallback((patch: Partial<TenantFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);
  // Clearing filters leaves the chosen sort order alone.
  const resetFilters = useCallback(() => {
    setFilters((current) => ({ ...DEFAULT_FILTERS, sort: current.sort }));
  }, []);

  const tiers = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const value = row.subscriptionTier.trim();
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const selectedBusiness =
    selected?.kind === "business"
      ? (rows.find((r) => r.id === selected.id) ?? null)
      : null;

  const onCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError("");
    setBusy(true);
    const payload: CreateSaBusinessPayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      currency: currency.trim() || undefined,
      countryCode: countryCode.trim().toUpperCase() || undefined,
      timezone: timezone.trim() || undefined,
      subscriptionTier: tier.trim() || undefined,
      primaryDomain: primaryDomain.trim() || undefined,
    };
    try {
      await createSaBusiness(payload);
      setName("");
      setSlug("");
      setPrimaryDomain("");
      slugTouched.current = false;
      await reload();
      setSelected(null);
      showThemedSuccessToast("Tenant created.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignore */
    }
  }

  const performDeleteTenant = async (b: SaBusinessRow) => {
    setDeleteError("");
    setDeletingId(b.id);
    try {
      await deleteSaBusiness(b.id);
      setSelectedIds((prev) => prev.filter((id) => id !== b.id));
      if (selected?.kind === "business" && selected.id === b.id) {
        setSelected(null);
      }
      showThemedSuccessToast(`Tenant “${b.name}” removed.`);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setDeleteError(message);
      showThemedErrorToast(message);
    } finally {
      setDeletingId(null);
    }
  };

  const onDeleteTenant = (b: SaBusinessRow) => {
    showThemedConfirmToast({
      id: `delete-sa-business-${b.id}`,
      title: `Remove tenant “${b.name}”?`,
      description: `Slug: ${b.slug}. This archives the business and all users under it. It cannot be undone from the console.`,
      confirmLabel: "Remove tenant",
      onConfirm: () => performDeleteTenant(b),
    });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((item) => item !== id),
    );
  };

  const selectVisible = (checked: boolean) => {
    setSelectedIds(checked ? visibleRows.map((row) => row.id) : []);
  };

  // "Tell me when they come online": a notice fires once, on their next arrival.
  const toggleWatch = (row: SaBusinessRow) => {
    const watching = watchedIds.has(row.id);
    setWatchedIds((current) => {
      const next = new Set(current);
      if (watching) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
    if (!watching) {
      showThemedSuccessToast(
        `Watching ${row.name}. You will get a notice when they come online.`,
      );
    }
  };

  const onMessageTenant = async (b: SaBusinessRow) => {
    if (chatBusyId) return;
    setChatBusyId(b.id);
    try {
      const detail = await ensureSaTenantSupportThread(b.id);
      const conversationId = detail.conversation?.id?.trim();
      if (!conversationId) {
        throw new Error("Could not open the support thread.");
      }
      router.push(
        `${APP_ROUTES.superAdminSupport}?c=${encodeURIComponent(conversationId)}`,
      );
    } catch (err) {
      showThemedErrorToast(
        err instanceof Error
          ? err.message
          : "Could not start a chat with this tenant.",
      );
      setChatBusyId(null);
    }
  };

  const selectedLive = selectedBusiness
    ? presenceOf(presenceIndex, selectedBusiness.id)
    : null;
  const selectedLiveText = selectedLive
    ? selectedLive.online
      ? `Online${selectedLive.sessions > 0 ? ` · ${selectedLive.sessions} live` : ""}${selectedLive.onSupport ? " · on support" : ""}`
      : selectedLive.lastSeenAt
        ? `Seen ${formatAgo(selectedLive.lastSeenAt, now)}`
        : "Offline"
    : "—";
  const selectedWhatsapp = selectedBusiness
    ? whatsappHref(selectedBusiness.ownerPhone)
    : null;

  const modalBody =
    selected?.kind === "create" ? (
      <form
        id="sa-create-tenant"
        className="space-y-3"
        onSubmit={(e) => void onCreate(e)}
      >
        <div className="space-y-1.5">
          <Label htmlFor="sa-new-name" className={dashboardLabelClass()}>
            Name
          </Label>
          <Input
            id="sa-new-name"
            className={dashboardInputClass()}
            value={name}
            onChange={(ev) => {
              const next = ev.target.value;
              setName(next);
              if (!slugTouched.current) setSlug(slugifyName(next));
            }}
            autoComplete="off"
            autoFocus
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sa-new-slug" className={dashboardLabelClass()}>
            Slug
          </Label>
          <Input
            id="sa-new-slug"
            className={dashboardInputClass()}
            value={slug}
            onChange={(ev) => {
              slugTouched.current = true;
              setSlug(ev.target.value);
            }}
            placeholder="acme-kiosk"
            pattern="[a-zA-Z0-9-]+"
            required
          />
          {slug.trim() ? (
            <p className={cn(dashboardHintClass(), "font-mono text-[10px]")}>
              {slugDerivedShopUrl(slug)}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sa-new-domain" className={dashboardLabelClass()}>
            Custom domain{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="sa-new-domain"
            className={dashboardInputClass()}
            value={primaryDomain}
            onChange={(ev) => setPrimaryDomain(ev.target.value)}
            placeholder="shop.acme.co.ke"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sa-new-currency" className={dashboardLabelClass()}>
              Currency
            </Label>
            <Input
              id="sa-new-currency"
              className={dashboardInputClass()}
              value={currency}
              onChange={(ev) => setCurrency(ev.target.value)}
              maxLength={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-new-country" className={dashboardLabelClass()}>
              Country
            </Label>
            <Input
              id="sa-new-country"
              className={dashboardInputClass()}
              value={countryCode}
              onChange={(ev) => setCountryCode(ev.target.value)}
              maxLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-new-tz" className={dashboardLabelClass()}>
              Timezone
            </Label>
            <Input
              id="sa-new-tz"
              className={dashboardInputClass()}
              value={timezone}
              onChange={(ev) => setTimezone(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sa-new-tier" className={dashboardLabelClass()}>
              Tier
            </Label>
            <Input
              id="sa-new-tier"
              className={dashboardInputClass()}
              value={tier}
              onChange={(ev) => setTier(ev.target.value)}
            />
          </div>
        </div>
        {formError ? (
          <DashboardFeedback kind="error" text={formError} />
        ) : null}
      </form>
    ) : selectedBusiness ? (
      <div className="space-y-3">
        <dl className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] text-[12px]">
          {(
            [
              [
                "Status",
                `${selectedBusiness.active ? "Active" : "Inactive"}${stuckIds.has(selectedBusiness.id) ? " · stuck" : ""}`,
              ],
              ["Live", selectedLiveText],
              ["Tier", selectedBusiness.subscriptionTier],
              [
                "Owner",
                selectedBusiness.ownerName?.trim() ||
                  selectedBusiness.ownerEmail?.trim() ||
                  "—",
              ],
              ...(selectedBusiness.ownerEmail?.trim() &&
              selectedBusiness.ownerName?.trim()
                ? [["Email", selectedBusiness.ownerEmail.trim()] as const]
                : []),
              ["Phone", selectedBusiness.ownerPhone?.trim() || "—"],
              ["Created", formatTenantDateTime(selectedBusiness.createdAt)],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="max-w-[65%] break-words text-right font-medium">
                {label === "Tier" ? (
                  <span className="capitalize">{value}</span>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2 last:pb-0">
            <dt className="shrink-0 text-muted-foreground">ID</dt>
            <dd className="flex min-w-0 items-center gap-1.5">
              <code className="truncate font-mono text-[11px]">
                {selectedBusiness.id}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 rounded-[2px] px-1.5"
                onClick={() => void copyId(selectedBusiness.id)}
                aria-label="Copy tenant ID"
              >
                {copiedId === selectedBusiness.id ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 rounded-[2px]"
            disabled={chatBusyId !== null}
            onClick={() => void onMessageTenant(selectedBusiness)}
          >
            {chatBusyId === selectedBusiness.id ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <MessagesSquare className="size-3.5" />
            )}
            Message
          </Button>
          {selectedWhatsapp ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 rounded-[2px]"
              asChild
            >
              <a href={selectedWhatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 rounded-[2px]"
            asChild
          >
            <a
              href={slugDerivedShopUrl(selectedBusiness.slug)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
              Open shop
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-[2px]"
            asChild
          >
            <Link href={`${tenantManageHref(selectedBusiness)}#sa-subscription`}>
              Plan
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-[2px] text-[#9a2e16] hover:text-[#9a2e16]"
            disabled={deletingId !== null}
            onClick={() => onDeleteTenant(selectedBusiness)}
          >
            {deletingId === selectedBusiness.id ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Remove
          </Button>
        </div>
      </div>
    ) : (
      <p className={dashboardHintClass()}>
        Tenant not in this list. Refresh and try again.
      </p>
    );

  const modalFooter =
    selected?.kind === "create" ? (
      <Button
        type="submit"
        form="sa-create-tenant"
        className={PRIMARY_BTN}
        disabled={busy}
      >
        {busy ? "Creating…" : "Create"}
      </Button>
    ) : selectedBusiness ? (
      <Button type="button" className={PRIMARY_BTN} asChild>
        <Link href={tenantManageHref(selectedBusiness)}>Manage</Link>
      </Button>
    ) : undefined;

  const selectionBar =
    selectedIds.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2 rounded-[2px] border border-border bg-[rgba(29,75,59,0.06)] px-2.5 py-2 sm:px-3">
        <p className="mr-auto text-[12px] font-semibold tabular-nums">
          {selectedIds.length} selected
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 rounded-[2px]"
          asChild
        >
          <Link
            href={`${APP_ROUTES.superAdminCampaignNew}?segment=selected_tenants&businessIds=${encodeURIComponent(selectedIds.join(","))}`}
          >
            <Mail className="size-3.5" />
            Email selected
          </Link>
        </Button>
        {onlineIds.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-[2px]"
            onClick={() => setSelectedIds(onlineIds)}
          >
            Select online
          </Button>
        ) : null}
        {stuckIds.size > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-[2px]"
            onClick={() => setSelectedIds([...stuckIds])}
          >
            Select stuck
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 rounded-[2px]"
          onClick={() => setSelectedIds([])}
        >
          Clear
        </Button>
      </div>
    ) : null;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Building2}
        title="Tenants"
        description="Who is online, who is stuck, who just joined."
      >
        <button
          type="button"
          disabled={refreshing || loading}
          onClick={() => void reload()}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-[2px] border border-border bg-card text-muted-foreground",
            "transition-colors hover:border-primary hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh tenants"
        >
          <RefreshCw
            className={cn("size-3.5", refreshing && "animate-spin")}
            aria-hidden
          />
        </button>
        {stuckIds.size > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-[2px]"
            asChild
          >
            <Link
              href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}
            >
              <Mail className="size-3.5" />
              Email stuck
              <span className="tabular-nums">({stuckIds.size})</span>
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          onClick={() => {
            setSelected({ kind: "create" });
            history.replaceState(null, "", "#create");
          }}
        >
          New tenant
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {deleteError ? (
        <DashboardFeedback kind="error" text={deleteError} />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {copiedId ? "Tenant ID copied to clipboard." : ""}
      </p>

      <BusinessesTheatre
        rows={visibleRows}
        totalCount={rows.length}
        counts={counts}
        stuckIds={stuckIds}
        presence={presenceIndex}
        presenceAt={presenceAt}
        presenceFailed={presenceFailed}
        onlineSeries={onlineSeries}
        arrivals={recentArrivals}
        arrivedIds={arrivedIds}
        watchedIds={watchedIds}
        onToggleWatch={toggleWatch}
        now={now}
        filters={filters}
        onFiltersChange={updateFilters}
        onResetFilters={resetFilters}
        tiers={tiers}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelected={toggleSelected}
        onSelectVisible={selectVisible}
        selected={selected}
        selectedBusiness={selectedBusiness}
        onSelect={setSelected}
        onClearSelection={() => {
          setSelected(null);
          setFormError("");
          slugTouched.current = false;
        }}
        modalBody={modalBody}
        modalFooter={modalFooter}
        selectionBar={selectionBar}
      />
    </div>
  );
}
