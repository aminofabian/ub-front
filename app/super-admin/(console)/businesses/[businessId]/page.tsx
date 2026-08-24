"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Globe, Mail, Plus, Users } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast, showThemedErrorToast, showThemedSuccessToast } from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { encodeAuthHandoffPayload } from "@/lib/auth-handoff";
import {
  APP_ROUTES,
  hostDerivedShopUrl,
  slugDerivedShopUrl,
} from "@/lib/config";
import {
  type SaBusinessUserRow,
  type SaDomainRow,
  addSaDomain,
  fetchSaBusiness,
  fetchSaBusinessUsers,
  fetchSaDomains,
  impersonateSaBusiness,
  patchSaBusiness,
  patchSaBusinessUserStatus,
  setSaPrimaryDomain,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const SELECT_CLASS = cn(
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm shadow-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const USER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "locked", label: "Locked" },
] as const;

function userStatusVariant(status: string): "success" | "warning" | "secondary" {
  const value = status.toLowerCase();
  if (value === "active") return "success";
  if (value === "invited") return "warning";
  return "secondary";
}

function tenantQuery(next: {
  businessId: string;
  name: string;
  slug: string;
  tier: string;
  active: boolean;
}) {
  const q = new URLSearchParams({
    name: next.name,
    slug: next.slug,
    tier: next.tier,
    active: next.active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(next.businessId)}?${q.toString()}`;
}

function BusinessDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessIdRaw = params.businessId;
  const businessId =
    typeof businessIdRaw === "string"
      ? businessIdRaw
      : Array.isArray(businessIdRaw)
        ? businessIdRaw[0]
        : "";
  const titleName = searchParams.get("name") ?? "";
  const slugFromQuery = searchParams.get("slug") ?? "";

  const [domains, setDomains] = useState<SaDomainRow[]>([]);
  const [users, setUsers] = useState<SaBusinessUserRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [bizName, setBizName] = useState(titleName);
  const [bizSlug, setBizSlug] = useState(slugFromQuery);
  const [bizTier, setBizTier] = useState(searchParams.get("tier") ?? "");
  const [bizActive, setBizActive] = useState(searchParams.get("active") !== "0");
  const [globalCatalogCode, setGlobalCatalogCode] = useState("");
  const [bizCountry, setBizCountry] = useState("KE");
  const [bizCurrency, setBizCurrency] = useState("KES");
  const [bizTimezone, setBizTimezone] = useState("Africa/Nairobi");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const [bizLoaded, setBizLoaded] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const loadBusiness = useCallback(async () => {
    if (!businessId) return;
    try {
      const row = await fetchSaBusiness(businessId);
      setBizName(row.name);
      setBizSlug(row.slug);
      setBizTier(row.subscriptionTier ?? "");
      setBizActive(row.active);
      setGlobalCatalogCode(row.globalCatalogCode ?? "");
      setBizCountry(row.countryCode || "KE");
      setBizCurrency(row.currency || "KES");
      setBizTimezone(row.timezone || "Africa/Nairobi");
    } catch {
      /* name/tier still come from query params as fallback */
    } finally {
      setBizLoaded(true);
    }
  }, [businessId]);

  const loadDomains = useCallback(async () => {
    if (!businessId) {
      return;
    }
    setError("");
    try {
      setDomains(await fetchSaDomains(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load domains.");
    }
  }, [businessId]);

  const loadUsers = useCallback(async () => {
    if (!businessId) {
      return;
    }
    try {
      const rows = await fetchSaBusinessUsers(businessId);
      setUsers(rows);
      const owner = rows.find(
        (u) => u.roleKey === "owner" && u.status.toLowerCase() === "active",
      );
      setSelectedUserId((prev) => {
        if (prev && rows.some((u) => u.id === prev)) return prev;
        return owner?.id ?? rows.find((u) => u.status.toLowerCase() === "active")?.id ?? "";
      });
    } catch {
      /* users are optional for domain management */
    }
  }, [businessId]);

  useEffect(() => {
    void loadBusiness();
    void loadDomains();
    void loadUsers();
  }, [loadBusiness, loadDomains, loadUsers]);

  useEffect(() => {
    setBizName(titleName);
  }, [titleName]);

  useEffect(() => {
    if (slugFromQuery) setBizSlug(slugFromQuery);
  }, [slugFromQuery]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const primaryDomain = useMemo(
    () => domains.find((d) => d.primary && d.active)?.domain ?? null,
    [domains],
  );

  const onAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addSaDomain(businessId, newDomain);
      setNewDomain("");
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add domain failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSetPrimary = async (domainId: string) => {
    if (!businessId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setSaPrimaryDomain(businessId, domainId);
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set primary.");
    } finally {
      setBusy(false);
    }
  };

  const onSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      return;
    }
    setError("");
    try {
      const nextCountry = bizCountry.trim().toUpperCase();
      const nextCurrency = bizCurrency.trim().toUpperCase();
      const nextTimezone = bizTimezone.trim();
      const loaded = await fetchSaBusiness(businessId);
      const regionChanged =
        nextCountry !== (loaded.countryCode || "").toUpperCase() ||
        nextCurrency !== (loaded.currency || "").toUpperCase();

      const applySave = async (acknowledgeRegionRisk?: boolean) => {
        setBusy(true);
        setError("");
        try {
          await patchSaBusiness(businessId, {
            name: bizName.trim() || undefined,
            subscriptionTier: bizTier.trim() || undefined,
            active: bizActive,
            globalCatalogCode: globalCatalogCode.trim(),
            countryCode: nextCountry || undefined,
            currency: nextCurrency || undefined,
            timezone: nextTimezone || undefined,
            acknowledgeRegionRisk,
          });
          router.replace(
            tenantQuery({
              businessId,
              name: bizName.trim(),
              slug: bizSlug,
              tier: bizTier.trim(),
              active: bizActive,
            }),
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Update failed.");
        } finally {
          setBusy(false);
        }
      };

      if (regionChanged) {
        showThemedConfirmToast({
          id: `sa-business-region-${businessId}`,
          title: "Change country or currency?",
          description:
            "Existing amounts are re-labeled without converting them (e.g. 1,200 KES becomes 1,200 UGX).\n\nIf this shop already has products or sales, the API will require this confirmation.",
          confirmLabel: "Continue",
          confirmVariant: "default",
          onConfirm: () => void applySave(true),
        });
        return;
      }
      await applySave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const onOpenTenant = async (asOwner: boolean, userId?: string) => {
    if (!businessId) return;
    setImpersonating(true);
    setError("");
    try {
      const impersonateUserId = asOwner ? undefined : userId || selectedUserId || undefined;
      const result = await impersonateSaBusiness(businessId, impersonateUserId);
      const slug = result.slug?.trim() || bizSlug.trim() || slugFromQuery.trim();
      const shopBase =
        hostDerivedShopUrl(result.primaryDomain || primaryDomain) ||
        (slug ? slugDerivedShopUrl(slug) : "");
      if (!shopBase) {
        throw new Error(
          "Could not resolve tenant URL. Add a primary domain or ensure the slug is set.",
        );
      }
      const nextPath = APP_ROUTES.business;
      const fragment = encodeAuthHandoffPayload({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tenantId: result.businessId,
        nextPath,
        impersonating: true,
        impersonationUserEmail: result.user.email,
        impersonationUserName: result.user.name,
      });
      const nextEnc = encodeURIComponent(nextPath);
      const slugEnc = encodeURIComponent(slug || result.slug);
      window.location.assign(
        `${shopBase}${APP_ROUTES.authHandoff}?next=${nextEnc}&slug=${slugEnc}#${fragment}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open tenant session.",
      );
      setImpersonating(false);
    }
  };

  async function copyId() {
    if (!businessId) return;
    try {
      await navigator.clipboard.writeText(businessId);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  const onChangeUserStatus = (userId: string, nextStatus: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user || user.status === nextStatus || locked) return;
    const current = user.status.toLowerCase();
    const deactivating = current === "active" && nextStatus !== "active";
    const apply = async () => {
      setBusy(true);
      setError("");
      try {
        await patchSaBusinessUserStatus(businessId, userId, nextStatus);
        await loadUsers();
        showThemedSuccessToast(`${user.name || user.email} is now ${nextStatus}.`);
      } catch (err) {
        showThemedErrorToast(
          err instanceof Error ? err.message : "Status update failed.",
        );
      } finally {
        setBusy(false);
      }
    };
    if (deactivating) {
      showThemedConfirmToast({
        id: `sa-user-status-${userId}`,
        title: `Set ${user.name || user.email} to ${nextStatus}?`,
        description:
          "Their sessions will be revoked and sign-in blocked until this is reverted.",
        confirmLabel: `Set to ${nextStatus}`,
        confirmVariant: "destructive",
        onConfirm: () => void apply(),
      });
      return;
    }
    void apply();
  };

  if (!businessId) {
    return <AuthAlert variant="error">Missing business id.</AuthAlert>;
  }

  const activeUsers = users.filter((u) => u.status.toLowerCase() === "active");
  const locked = busy || impersonating;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title={bizName || "Tenant"}
        description={
          bizSlug || "Support session, people, domains, and tenant settings."
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void copyId()}
            >
              {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy ID"}
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 shadow-sm"
              disabled={locked}
              onClick={() => void onOpenTenant(true)}
            >
              <ExternalLink className="size-3.5" />
              {impersonating ? "Opening…" : "Open as owner"}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={bizActive ? "success" : "secondary"}>{bizActive ? "Active" : "Inactive"}</Badge>
        {bizTier ? (
          <Badge variant="outline" className="capitalize">
            {bizTier}
          </Badge>
        ) : null}
        {primaryDomain ? (
          <span className="font-mono text-xs text-muted-foreground">{primaryDomain}</span>
        ) : bizLoaded ? (
          <span className="text-xs text-muted-foreground">No primary domain</span>
        ) : null}
      </div>

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <p className="sr-only" aria-live="polite">
        {copied ? "Tenant ID copied to clipboard." : ""}
      </p>

      <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:px-5">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
          A support session lasts 15 minutes, is audit-logged, and leaves this console for the tenant host.
        </p>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="sa-impersonate-user">
            Open as a specific user
          </label>
          <select
            id="sa-impersonate-user"
            className={cn(SELECT_CLASS, "sm:w-[min(100%,20rem)]")}
            value={selectedUserId}
            onChange={(ev) => setSelectedUserId(ev.target.value)}
            disabled={locked || activeUsers.length === 0}
          >
            {activeUsers.length === 0 ? (
              <option value="">No active users</option>
            ) : (
              activeUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} · {u.roleKey}
                </option>
              ))
            )}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={locked || !selectedUserId || activeUsers.length === 0}
            onClick={() => void onOpenTenant(false)}
          >
            Open as selected
          </Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm xl:col-span-3">
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Display name, plan, region, and catalog override.
            </p>
          </div>
          <form className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-5" onSubmit={onSaveBusiness}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sa-biz-name">Display name</Label>
              <Input
                id="sa-biz-name"
                value={bizName}
                onChange={(ev) => setBizName(ev.target.value)}
                disabled={locked}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sa-biz-tier">Subscription tier</Label>
              <Input
                id="sa-biz-tier"
                value={bizTier}
                onChange={(ev) => setBizTier(ev.target.value)}
                placeholder="starter"
                disabled={locked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-biz-country">Country</Label>
              <Input
                id="sa-biz-country"
                className="font-mono uppercase"
                value={bizCountry}
                onChange={(ev) => setBizCountry(ev.target.value)}
                maxLength={2}
                placeholder="KE"
                disabled={locked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-biz-currency">Currency</Label>
              <Input
                id="sa-biz-currency"
                className="font-mono uppercase"
                value={bizCurrency}
                onChange={(ev) => setBizCurrency(ev.target.value)}
                maxLength={3}
                placeholder="KES"
                disabled={locked}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sa-biz-tz">Timezone</Label>
              <Input
                id="sa-biz-tz"
                value={bizTimezone}
                onChange={(ev) => setBizTimezone(ev.target.value)}
                placeholder="Africa/Nairobi"
                disabled={locked}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sa-biz-catalog">Global catalog code</Label>
              <Input
                id="sa-biz-catalog"
                className="font-mono"
                value={globalCatalogCode}
                onChange={(ev) => setGlobalCatalogCode(ev.target.value)}
                placeholder="Leave blank for country default"
                disabled={locked}
              />
              <p className="text-xs text-muted-foreground">Overrides regional resolution. Blank clears the override.</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">
              Changing country or currency re-labels existing amounts without converting them. Shops
              with products or sales require confirmation.
            </p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5 sm:col-span-2">
              <Label htmlFor="sa-biz-active" className="cursor-pointer">
                Active
              </Label>
              <Switch
                id="sa-biz-active"
                checked={bizActive}
                disabled={locked}
                onCheckedChange={setBizActive}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={locked}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm xl:col-span-2">
          <div className="border-b border-border/60 px-4 py-4 sm:px-5">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Domains</h2>
            <p className="mt-1 text-sm text-muted-foreground">Hostnames for this tenant. One is primary.</p>
          </div>
          <form className="flex gap-2 border-b border-border/60 px-4 py-3 sm:px-5" onSubmit={onAddDomain}>
            <Label className="sr-only" htmlFor="sa-new-domain">
              New domain
            </Label>
            <Input
              id="sa-new-domain"
              value={newDomain}
              onChange={(ev) => setNewDomain(ev.target.value)}
              placeholder="shop.example.co.ke"
              disabled={locked}
            />
            <Button type="submit" size="sm" className="shrink-0 gap-1.5" disabled={locked || !newDomain.trim()}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </form>
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Globe className="mb-3 size-8 text-muted-foreground/45" aria-hidden />
              <p className="text-sm font-medium text-foreground">No domains</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Add a hostname above, or recreate the tenant with a primary domain.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {domains.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{d.domain}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.primary ? <Badge variant="default">Primary</Badge> : null}
                      <Badge variant={d.active ? "success" : "secondary"}>
                        {d.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {!d.primary ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={locked}
                      onClick={() => void onSetPrimary(d.id)}
                    >
                      Make primary
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-4 sm:px-5">
          <h2 className="font-heading text-lg font-semibold tracking-tight">People</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change a person&apos;s status (e.g. invited → active), email them directly, or
            open the shop as them. Moving someone out of Active revokes their sessions.
          </p>
        </div>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <Users className="mb-3 size-8 text-muted-foreground/45" aria-hidden />
            <p className="text-sm font-medium text-foreground">No users on this tenant</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/50 lg:hidden">
              {users.map((u) => {
                const isActive = u.status.toLowerCase() === "active";
                return (
                  <li key={u.id} className="space-y-2 px-4 py-3.5 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{u.name || "Unnamed"}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant={userStatusVariant(u.status)}>{u.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.roleName || u.roleKey}
                      {u.branchName ? ` · ${u.branchName}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <select
                        aria-label={`Change status for ${u.name || u.email}`}
                        className={cn(SELECT_CLASS, "h-8 w-auto py-0")}
                        value={u.status}
                        disabled={locked}
                        onChange={(ev) => onChangeUserStatus(u.id, ev.target.value)}
                      >
                        {USER_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={locked || !isActive}
                        onClick={() => void onOpenTenant(false, u.id)}
                      >
                        Open as
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
                        <Link
                          href={`${APP_ROUTES.superAdminCampaignNew}?segment=selected_users&userIds=${encodeURIComponent(u.id)}`}
                        >
                          <Mail className="size-3.5" />
                          Email
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/35 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((u) => {
                    const isActive = u.status.toLowerCase() === "active";
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-muted/35">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{u.name || "Unnamed"}</p>
                          <p className="font-mono text-xs text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {u.roleName || u.roleKey}
                          {u.branchName ? (
                            <span className="mt-0.5 block text-xs">{u.branchName}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={userStatusVariant(u.status)}>{u.status}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <select
                            aria-label={`Change status for ${u.name || u.email}`}
                            className={cn(SELECT_CLASS, "mr-1.5 inline-block h-8 w-auto py-0")}
                            value={u.status}
                            disabled={locked}
                            onChange={(ev) => onChangeUserStatus(u.id, ev.target.value)}
                          >
                            {USER_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={locked || !isActive}
                            onClick={() => void onOpenTenant(false, u.id)}
                          >
                            Open as
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="ml-1 gap-1.5" asChild>
                            <Link
                              href={`${APP_ROUTES.superAdminCampaignNew}?segment=selected_users&userIds=${encodeURIComponent(u.id)}`}
                            >
                              <Mail className="size-3.5" />
                              Email
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function SuperAdminBusinessDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-14 animate-pulse rounded-2xl bg-muted/40" />
          <div className="grid gap-6 xl:grid-cols-5">
            <div className="h-80 animate-pulse rounded-2xl bg-muted/40 xl:col-span-3" />
            <div className="h-80 animate-pulse rounded-2xl bg-muted/40 xl:col-span-2" />
          </div>
        </div>
      }
    >
      <BusinessDetailInner />
    </Suspense>
  );
}
