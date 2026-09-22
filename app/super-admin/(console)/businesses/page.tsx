"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  Mail,
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
  createSaBusiness,
  deleteSaBusiness,
  fetchAllSaBusinesses,
  fetchSaEmailRecipients,
  fetchSaSupportPresence,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  BusinessesTheatre,
  type BusinessesPanel,
  type StatusFilter,
} from "./_components/businesses-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

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

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<StatusFilter>("all");
  const [filterTier, setFilterTier] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stuckIds, setStuckIds] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<BusinessesPanel | null>(null);
  const [tenantsOnline, setTenantsOnline] = useState<number | null>(null);
  const [tenantsOnSupport, setTenantsOnSupport] = useState(0);

  const slugTouched = useRef(false);
  const copyTimer = useRef<number | null>(null);
  const loadedOnce = useRef(false);

  const reloadPresence = useCallback(async () => {
    try {
      const presence = await fetchSaSupportPresence();
      setTenantsOnline(presence.tenantsOnline);
      setTenantsOnSupport(presence.tenantsOnSupport);
    } catch {
      /* keep last good count */
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

  // Live “logged in” count from open realtime sockets (same source as Support).
  useEffect(() => {
    void reloadPresence();
    const timer = window.setInterval(() => {
      void reloadPresence();
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

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const row of rows) {
      if (row.active) active += 1;
      else inactive += 1;
    }
    return { all: rows.length, active, inactive, stuck: stuckIds.size };
  }, [rows, stuckIds]);

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
                className="h-7 shrink-0 rounded-none px-1.5"
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
            className="h-8 rounded-none"
            asChild
          >
            <Link href={`${tenantManageHref(selectedBusiness)}#sa-subscription`}>
              Plan
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-none text-[#9a2e16] hover:text-[#9a2e16]"
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
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-2.5 py-2 sm:px-3",
          HAIRLINE,
        )}
      >
        <p className="mr-auto text-[12px] font-semibold tabular-nums">
          {selectedIds.length} selected
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 rounded-none"
          asChild
        >
          <Link
            href={`${APP_ROUTES.superAdminCampaignNew}?segment=selected_tenants&businessIds=${encodeURIComponent(selectedIds.join(","))}`}
          >
            <Mail className="size-3.5" />
            Email selected
          </Link>
        </Button>
        {stuckIds.size > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-none"
            onClick={() => setSelectedIds([...stuckIds])}
          >
            Select stuck
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 rounded-none"
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
        eyebrow="Platform"
        title="Tenants"
        description="Search tenants, open one to manage, or create a new business."
      >
        <button
          type="button"
          disabled={refreshing || loading}
          onClick={() => void reload()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
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
            className="h-8 gap-1.5 rounded-none"
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
        rows={rows}
        stuckIds={stuckIds}
        counts={counts}
        tenantsOnline={tenantsOnline}
        tenantsOnSupport={tenantsOnSupport}
        tiers={tiers}
        loading={loading}
        statusFilter={filterActive}
        onStatusFilterChange={setFilterActive}
        tierFilter={filterTier}
        onTierFilterChange={setFilterTier}
        searchInput={search}
        onSearchInputChange={setSearch}
        selectedIds={selectedIds}
        onToggleSelected={toggleSelected}
        onSelectAllVisible={(checked) => {
          const q = search.trim().toLowerCase();
          const visible = rows.filter((b) => {
            const phone = b.ownerPhone?.trim().toLowerCase() ?? "";
            const ownerName = b.ownerName?.trim().toLowerCase() ?? "";
            const ownerEmail = b.ownerEmail?.trim().toLowerCase() ?? "";
            if (
              q &&
              !b.name.toLowerCase().includes(q) &&
              !b.slug.toLowerCase().includes(q) &&
              !b.id.toLowerCase().includes(q) &&
              !phone.includes(q) &&
              !ownerName.includes(q) &&
              !ownerEmail.includes(q)
            ) {
              return false;
            }
            if (filterActive === "active" && !b.active) return false;
            if (filterActive === "inactive" && b.active) return false;
            if (filterActive === "stuck" && !stuckIds.has(b.id)) return false;
            if (
              filterTier.trim() &&
              b.subscriptionTier.toLowerCase() !==
                filterTier.trim().toLowerCase()
            ) {
              return false;
            }
            return true;
          });
          setSelectedIds(checked ? visible.map((b) => b.id) : []);
        }}
        selected={selected}
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
