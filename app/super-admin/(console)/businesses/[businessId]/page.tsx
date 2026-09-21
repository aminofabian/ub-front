"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, CreditCard, ExternalLink, Globe, Inbox, Mail, MessageCircle, Plus, Users } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSmsCreditsPanel } from "@/components/super-admin/sa-sms-credits-panel";
import { SaSubscriptionPanel } from "@/components/super-admin/sa-subscription-panel";
import {
  SaShopHeroButton,
  SaShopPanel,
  SaTenantShopFrame,
  type SaTenantShopBrand,
} from "@/components/super-admin/sa-tenant-shop-frame";
import { showThemedConfirmToast, showThemedErrorToast, showThemedSuccessToast } from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { encodeAuthHandoffPayload } from "@/lib/auth-handoff";
import {
  APP_ROUTES,
  PLATFORM_DOMAIN,
  apiUrl,
  hostDerivedShopUrl,
  slugDerivedShopUrl,
} from "@/lib/config";
import {
  type SaBusinessStats,
  type SaBusinessUserRow,
  type SaDomainRow,
  addSaDomain,
  ensureSaTenantSupportThread,
  ensureSaTenantWelcomeCard,
  fetchSaBusiness,
  sendSaOnboardingSequence,
  fetchSaBusinessStats,
  fetchSaBusinessUsers,
  fetchSaDomains,
  impersonateSaBusiness,
  patchSaBusiness,
  patchSaBusinessUserStatus,
  resendSaBusinessUserVerification,
  setSaPrimaryDomain,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const SELECT_CLASS = cn(
  "h-9 w-full min-w-0 rounded-[8px] border border-[color-mix(in_srgb,#15231f_14%,transparent)] bg-white px-2.5 text-sm outline-none",
  "focus-visible:border-[var(--sa-shop-primary,#2555a5)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--sa-shop-primary,#2555a5)_22%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const USER_STATUSES = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "locked", label: "Locked" },
] as const;

function statusOptionsFor(status: string) {
  const current = status.toLowerCase();
  if (current === "invited") {
    return USER_STATUSES.filter((s) => s.value !== "active");
  }
  return USER_STATUSES;
}

function userStatusVariant(status: string): "success" | "warning" | "secondary" {
  const value = status.toLowerCase();
  if (value === "active") return "success";
  if (value === "invited") return "warning";
  return "secondary";
}

function formatKes(amount: number | null | undefined, currency = "KES") {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return `${currency} —`;
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency.length === 3 ? currency : "KES",
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function formatInt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-KE").format(Number(n ?? 0));
}

function formatUnits(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(v);
}

function relativeWhen(iso: string | null | undefined) {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const delta = Date.now() - date.getTime();
  const mins = Math.round(delta / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function paymentStatusVariant(status: string): "success" | "warning" | "secondary" {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "success";
  if (s === "TESTED" || s === "TESTING") return "warning";
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
  const [startingChat, setStartingChat] = useState(false);
  const [postingWelcome, setPostingWelcome] = useState(false);
  const [sendingOnboarding, setSendingOnboarding] = useState(false);
  const [stats, setStats] = useState<SaBusinessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [brand, setBrand] = useState<SaTenantShopBrand | null>(null);
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
      if (row.branding) {
        setBrand({
          displayName: row.branding.displayName,
          logoUrl: row.branding.logoUrl,
          primaryColor: row.branding.primaryColor,
          accentColor: row.branding.accentColor,
          heroBannerUrls: row.branding.heroBannerUrls,
        });
      } else if (row.slug) {
        // Fall back to public host-resolve so the page picks up live storefront branding.
        try {
          const host = `${row.slug}.${PLATFORM_DOMAIN}`;
          const res = await fetch(
            `${apiUrl("/api/v1/public/host/resolve")}?host=${encodeURIComponent(host)}`,
            { headers: { Accept: "application/json" }, cache: "no-store" },
          );
          if (res.ok) {
            const ctx = (await res.json()) as {
              branding?: SaTenantShopBrand | null;
            };
            if (ctx.branding) setBrand(ctx.branding);
          }
        } catch {
          /* keep page usable without branding */
        }
      }
    } catch {
      /* name/tier still come from query params as fallback */
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

  const loadStats = useCallback(async () => {
    if (!businessId) return;
    setStatsLoading(true);
    try {
      setStats(await fetchSaBusinessStats(businessId));
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadBusiness();
    void loadDomains();
    void loadUsers();
    void loadStats();
  }, [loadBusiness, loadDomains, loadUsers, loadStats]);

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
          const updated = await patchSaBusiness(businessId, {
            name: bizName.trim() || undefined,
            subscriptionTier: bizTier.trim() || undefined,
            active: bizActive,
            globalCatalogCode: globalCatalogCode.trim(),
            countryCode: nextCountry || undefined,
            currency: nextCurrency || undefined,
            timezone: nextTimezone || undefined,
            acknowledgeRegionRisk,
          });
          setBizActive(updated.active);
          setBizName(updated.name);
          setBizTier(updated.subscriptionTier ?? "");
          router.replace(
            tenantQuery({
              businessId,
              name: updated.name,
              slug: updated.slug || bizSlug,
              tier: updated.subscriptionTier ?? bizTier.trim(),
              active: updated.active,
            }),
          );
          showThemedSuccessToast(
            updated.active
              ? "Tenant is Active — staff can sign in again."
              : "Tenant is Off — staff are locked out.",
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

  async function onMessageTenant() {
    if (!businessId || startingChat) return;
    setStartingChat(true);
    setError("");
    try {
      const detail = await ensureSaTenantSupportThread(businessId);
      const conversationId = detail.conversation?.id?.trim();
      if (!conversationId) {
        throw new Error("Could not open the support thread.");
      }
      router.push(
        `${APP_ROUTES.superAdminSupport}?c=${encodeURIComponent(conversationId)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start chat with tenant.");
      setStartingChat(false);
    }
  }

  async function onPostWelcomeCard() {
    if (!businessId || postingWelcome) return;
    setPostingWelcome(true);
    setError("");
    try {
      const result = await ensureSaTenantWelcomeCard(businessId);
      if (result.posted) {
        showThemedSuccessToast("Welcome posted to their support chat.");
      } else {
        showThemedSuccessToast("Welcome already in their support chat.");
      }
    } catch (err) {
      showThemedErrorToast(
        err instanceof Error ? err.message : "Could not post welcome.",
      );
    } finally {
      setPostingWelcome(false);
    }
  }

  async function onSendOnboardingSequence() {
    if (!businessId || sendingOnboarding) return;
    showThemedConfirmToast({
      id: `sa-onboarding-send-${businessId}`,
      title: "Send onboarding to this tenant?",
      description:
        "Posts the welcome message and teaching tips into their support chat, inbox, and owner email (no WhatsApp).",
      confirmLabel: "Send all",
      onConfirm: () => {
        void (async () => {
          setSendingOnboarding(true);
          setError("");
          try {
            const result = await sendSaOnboardingSequence(businessId);
            const tips = result.chatTipsPosted?.length ?? 0;
            const mail = result.emailsSent?.length ?? 0;
            showThemedSuccessToast(
              `Sent: welcome${result.welcomePosted ? "" : " (kept)"}, ${tips} chat tip${tips === 1 ? "" : "s"}, ${mail} email${mail === 1 ? "" : "s"}.`,
            );
          } catch (err) {
            showThemedErrorToast(
              err instanceof Error ? err.message : "Could not send onboarding.",
            );
          } finally {
            setSendingOnboarding(false);
          }
        })();
      },
    });
  }

  const onChangeUserStatus = (userId: string, nextStatus: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user || user.status === nextStatus || locked) return;
    const current = user.status.toLowerCase();
    if (current === "invited" && nextStatus === "active") {
      showThemedErrorToast(
        "Email verification isn’t a toggle. Resend the inbox link — they have to tap it.",
      );
      return;
    }
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

  const onResendVerification = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user || locked) return;
    showThemedConfirmToast({
      id: `sa-resend-verify-${userId}`,
      title: `Resend verification to ${user.email}?`,
      description:
        "They stay invited until they tap the link. This does not mark them verified.",
      confirmLabel: "Send inbox link",
      onConfirm: () => {
        void (async () => {
          setBusy(true);
          setError("");
          try {
            await resendSaBusinessUserVerification(businessId, userId);
            showThemedSuccessToast(`Verification email sent to ${user.email}.`);
          } catch (err) {
            showThemedErrorToast(
              err instanceof Error ? err.message : "Could not resend verification.",
            );
          } finally {
            setBusy(false);
          }
        })();
      },
    });
  };

  if (!businessId) {
    return <AuthAlert variant="error">Missing business id.</AuthAlert>;
  }

  const activeUsers = users.filter((u) => u.status.toLowerCase() === "active");
  const locked =
    busy || impersonating || startingChat || postingWelcome || sendingOnboarding;

  const shopUrl =
    hostDerivedShopUrl(primaryDomain) ||
    (bizSlug ? slugDerivedShopUrl(bizSlug) : null);
  const catalogHint = statsLoading
    ? null
    : `${formatInt(stats?.webPublishedProducts)} on storefront · ${formatInt(stats?.totalProducts)} in catalog`;

  return (
    <SaTenantShopFrame
      name={bizName || titleName || "Tenant"}
      slug={bizSlug || slugFromQuery}
      shopUrl={shopUrl}
      active={bizActive}
      tier={bizTier}
      onboardingStatus={stats?.onboardingStatus}
      brand={brand}
      catalogHint={catalogHint}
      headerActions={
        <>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 rounded-[8px]" asChild>
            <a href="#sa-subscription">
              <CreditCard className="size-3.5" />
              Plan
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-[8px]"
            onClick={() => void copyId()}
          >
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "ID"}
          </Button>
        </>
      }
      heroActions={
        <>
          <SaShopHeroButton disabled={locked} onClick={() => void onOpenTenant(true)}>
            <ExternalLink className="size-3.5" />
            {impersonating ? "Opening…" : "Open as owner"}
          </SaShopHeroButton>
          <SaShopHeroButton tone="ghost" disabled={locked} onClick={() => void onMessageTenant()}>
            <MessageCircle className="size-3.5" />
            {startingChat ? "Opening…" : "Message"}
          </SaShopHeroButton>
          <SaShopHeroButton tone="ghost" disabled={locked} onClick={() => void onPostWelcomeCard()}>
            <Mail className="size-3.5" />
            {postingWelcome ? "Posting…" : "Welcome"}
          </SaShopHeroButton>
          <SaShopHeroButton tone="ghost" disabled={locked} onClick={() => onSendOnboardingSequence()}>
            <Users className="size-3.5" />
            {sendingOnboarding ? "Sending…" : "Onboarding"}
          </SaShopHeroButton>
        </>
      }
    >
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      <p className="sr-only" aria-live="polite">
        {copied ? "Tenant ID copied to clipboard." : ""}
      </p>

      {businessId ? (
        <div id="sa-subscription" className="scroll-mt-20">
          <SaSubscriptionPanel businessId={businessId} onTierChange={setBizTier} />
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#15231f]">Tenant pulse</h2>
            <p className="text-[12px] text-[#5b6470]">
              Sales, catalog, payments, and last activity — what you need before opening a session
            </p>
          </div>
          <p className="text-[11px] text-[#5b6470]">
            Last sale {relativeWhen(stats?.lastSaleAt)} · Last login {relativeWhen(stats?.lastUserLoginAt)}
          </p>
        </div>

        <div
          className="grid overflow-hidden rounded-[10px] border bg-white sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
        >
          <PulseCell
            label="Revenue today"
            value={statsLoading ? "—" : formatKes(stats?.sales.revenueToday, bizCurrency)}
            hint={
              statsLoading
                ? "…"
                : `${formatInt(stats?.sales.salesToday)} sales · ${formatUnits(stats?.sales.unitsToday)} units`
            }
          />
          <PulseCell
            label="Revenue · 30 days"
            value={statsLoading ? "—" : formatKes(stats?.sales.revenueLast30Days, bizCurrency)}
            hint={
              statsLoading
                ? "…"
                : `${formatInt(stats?.sales.salesLast30Days)} sales · ${formatUnits(stats?.sales.unitsLast30Days)} units`
            }
          />
          <PulseCell
            label="Items in catalog"
            value={statsLoading ? "—" : formatInt(stats?.totalProducts)}
            hint={
              statsLoading
                ? "…"
                : `${formatInt(stats?.webPublishedProducts)} on storefront · ${formatInt(stats?.totalBranches)} branches`
            }
          />
          <PulseCell
            label="All-time till sales"
            value={statsLoading ? "—" : formatKes(stats?.sales.revenueAllTime, bizCurrency)}
            hint={
              statsLoading
                ? "…"
                : `${formatInt(stats?.sales.salesAllTime)} sales · ${formatUnits(stats?.sales.unitsAllTime)} units`
            }
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <SaShopPanel title="Team & shifts">
            <dl className="grid grid-cols-2 gap-3 px-4 py-4 sm:px-5">
              <MiniStat label="Users" value={statsLoading ? "—" : formatInt(stats?.totalUsers)} />
              <MiniStat label="Active" value={statsLoading ? "—" : formatInt(stats?.activeUsers)} />
              <MiniStat label="Open shifts" value={statsLoading ? "—" : formatInt(stats?.openShifts)} />
              <MiniStat label="7d sales" value={statsLoading ? "—" : formatInt(stats?.sales.salesLast7Days)} />
            </dl>
          </SaShopPanel>

          <SaShopPanel title="Storefront" description="Paid web / WhatsApp orders">
            <dl className="space-y-2.5 px-4 py-4 sm:px-5">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-[#5b6470]">GMV · 30d</dt>
                <dd className="text-sm font-semibold tabular-nums">
                  {statsLoading ? "—" : formatKes(stats?.storefront.paidGmvLast30Days, bizCurrency)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs text-[#5b6470]">Orders · 30d</dt>
                <dd className="text-sm tabular-nums">
                  {statsLoading ? "—" : formatInt(stats?.storefront.paidOrdersLast30Days)}
                </dd>
              </div>
              <div
                className="flex items-baseline justify-between gap-2 border-t pt-2.5"
                style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
              >
                <dt className="text-xs text-[#5b6470]">Orders all-time</dt>
                <dd className="text-sm tabular-nums text-[#5b6470]">
                  {statsLoading ? "—" : formatInt(stats?.storefront.paidOrdersAllTime)}
                </dd>
              </div>
            </dl>
          </SaShopPanel>

          <SaShopPanel
            title="Payment methods"
            description="Configured gateways for this shop"
            headerRight={
              <Badge variant={stats?.kioskPayActive ? "success" : "secondary"} className="shrink-0 rounded-[6px]">
                Kiosk Pay · {stats?.kioskPayStatus ?? "—"}
              </Badge>
            }
          >
            {statsLoading ? (
              <div className="space-y-2 px-4 py-4 sm:px-5" aria-hidden>
                <div className="h-8 animate-pulse rounded-[8px] bg-muted" />
                <div className="h-8 animate-pulse rounded-[8px] bg-muted" />
              </div>
            ) : !stats?.paymentMethods.length ? (
              <p className="px-4 py-4 text-sm text-[#5b6470] sm:px-5">
                No gateway configs yet — cash / manual may still work at the till.
              </p>
            ) : (
              <ul className="space-y-1.5 px-4 py-3 sm:px-5">
                {stats.paymentMethods.map((m) => (
                  <li
                    key={`${m.gatewayType}-${m.label}`}
                    className="flex items-center justify-between gap-2 rounded-[8px] border px-2.5 py-2"
                    style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.label || m.gatewayType}</p>
                      <p className="truncate font-mono text-[10px] uppercase text-[#5b6470]">
                        {m.gatewayType}
                        {m.isDefault ? " · default" : ""}
                      </p>
                    </div>
                    <Badge variant={paymentStatusVariant(m.status)} className="shrink-0 rounded-[6px] capitalize">
                      {m.status.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </SaShopPanel>
        </div>
      </section>

      <section
        className="flex flex-col gap-3 rounded-[10px] border bg-white px-4 py-3 sm:flex-row sm:items-center sm:px-5"
        style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
      >
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#5b6470]">
          A support session lasts four hours, stays alive while the tab is open, is audit-logged, and leaves this console for the tenant host.
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
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-[8px] text-white"
            style={{ backgroundColor: "var(--sa-shop-primary, #2555a5)" }}
            disabled={locked || !selectedUserId || activeUsers.length === 0}
            onClick={() => void onOpenTenant(false)}
          >
            Open as selected
          </Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-5">
        <SaShopPanel
          className="xl:col-span-3"
          title="Settings"
          description="Display name, region, and catalog override. Plan and grace live in Subscription below."
        >
          <form className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-5" onSubmit={onSaveBusiness}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sa-biz-name">Display name</Label>
              <Input
                id="sa-biz-name"
                value={bizName}
                onChange={(ev) => setBizName(ev.target.value)}
                disabled={locked}
                className="rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sa-biz-country">Country</Label>
              <Input
                id="sa-biz-country"
                className="rounded-[8px] font-mono uppercase"
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
                className="rounded-[8px] font-mono uppercase"
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
                className="rounded-[8px]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sa-biz-catalog">Global catalog code</Label>
              <Input
                id="sa-biz-catalog"
                className="rounded-[8px] font-mono"
                value={globalCatalogCode}
                onChange={(ev) => setGlobalCatalogCode(ev.target.value)}
                placeholder="Leave blank for country default"
                disabled={locked}
              />
              <p className="text-xs text-[#5b6470]">Overrides regional resolution. Blank clears the override.</p>
            </div>
            <p className="text-xs leading-relaxed text-[#5b6470] sm:col-span-2">
              Changing country or currency re-labels existing amounts without converting them. Shops
              with products or sales require confirmation.
            </p>
            <div
              className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 sm:col-span-2"
              style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
            >
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="sa-biz-active" className="cursor-pointer">
                  Active
                </Label>
                <p className="text-xs text-[#5b6470]">
                  Off locks the shop: staff are signed out and cannot log in until you turn this back on.
                </p>
              </div>
              <Switch
                id="sa-biz-active"
                checked={bizActive}
                disabled={locked}
                onCheckedChange={setBizActive}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={locked}
                className="rounded-[8px] text-white"
                style={{ backgroundColor: "var(--sa-shop-primary, #2555a5)" }}
              >
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </SaShopPanel>

        <SaShopPanel
          className="xl:col-span-2"
          title="Domains"
          description="Hostnames for this tenant. One is primary."
        >
          <form
            className="flex gap-2 border-b px-4 py-3 sm:px-5"
            style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
            onSubmit={onAddDomain}
          >
            <Label className="sr-only" htmlFor="sa-new-domain">
              New domain
            </Label>
            <Input
              id="sa-new-domain"
              value={newDomain}
              onChange={(ev) => setNewDomain(ev.target.value)}
              placeholder="shop.example.co.ke"
              disabled={locked}
              className="rounded-[8px]"
            />
            <Button
              type="submit"
              size="sm"
              className="shrink-0 gap-1.5 rounded-[8px] text-white"
              style={{ backgroundColor: "var(--sa-shop-primary, #2555a5)" }}
              disabled={locked || !newDomain.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </form>
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Globe className="mb-3 size-8 text-[#5b6470]/45" aria-hidden />
              <p className="text-sm font-medium text-foreground">No domains</p>
              <p className="mt-1 max-w-xs text-sm text-[#5b6470]">
                Add a hostname above, or recreate the tenant with a primary domain.
              </p>
            </div>
          ) : (
            <ul>
              {domains.map((d) => (
                <li
                  key={d.id}
                  className="flex items-start justify-between gap-3 border-b px-4 py-3 last:border-b-0 sm:px-5"
                  style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{d.domain}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {d.primary ? <Badge variant="default" className="rounded-[6px]">Primary</Badge> : null}
                      <Badge variant={d.active ? "success" : "secondary"} className="rounded-[6px]">
                        {d.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {!d.primary ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-[8px]"
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
        </SaShopPanel>
      </div>

      <SaShopPanel
        title="People"
        description="Change a person's status, email them, or open the shop as them. Invited owners stay invited until they tap the verification link — that can't be skipped from here. Moving someone out of Active revokes their sessions."
      >
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <Users className="mb-3 size-8 text-[#5b6470]/45" aria-hidden />
            <p className="text-sm font-medium text-foreground">No users on this tenant</p>
          </div>
        ) : (
          <>
            <ul className="lg:hidden">
              {users.map((u) => {
                const isActive = u.status.toLowerCase() === "active";
                return (
                  <li
                    key={u.id}
                    className="space-y-2 border-b px-4 py-3.5 last:border-b-0 sm:px-5"
                    style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{u.name || "Unnamed"}</p>
                        <p className="truncate font-mono text-xs text-[#5b6470]">{u.email}</p>
                      </div>
                      <Badge variant={userStatusVariant(u.status)} className="rounded-[6px]">{u.status}</Badge>
                    </div>
                    <p className="text-xs text-[#5b6470]">
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
                        {statusOptionsFor(u.status).map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      {u.status.toLowerCase() === "invited" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-[8px]"
                          disabled={locked}
                          onClick={() => onResendVerification(u.id)}
                        >
                          <Inbox className="size-3.5" />
                          Resend inbox
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-[8px]"
                        disabled={locked || !isActive}
                        onClick={() => void onOpenTenant(false, u.id)}
                      >
                        Open as
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="gap-1.5 rounded-[8px]" asChild>
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
                <thead
                  className="border-b text-[11px] font-semibold uppercase tracking-wide text-[#5b6470]"
                  style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)", backgroundColor: "#f3f5f8" }}
                >
                  <tr>
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isActive = u.status.toLowerCase() === "active";
                    return (
                      <tr
                        key={u.id}
                        className="border-b last:border-b-0 transition-colors hover:bg-[#f7f8fa]"
                        style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{u.name || "Unnamed"}</p>
                          <p className="font-mono text-xs text-[#5b6470]">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[#5b6470]">
                          {u.roleName || u.roleKey}
                          {u.branchName ? <span className="block text-xs">{u.branchName}</span> : null}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Change status for ${u.name || u.email}`}
                            className={cn(SELECT_CLASS, "h-8 w-auto min-w-[7.5rem] py-0")}
                            value={u.status}
                            disabled={locked}
                            onChange={(ev) => onChangeUserStatus(u.id, ev.target.value)}
                          >
                            {statusOptionsFor(u.status).map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {u.status.toLowerCase() === "invited" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 rounded-[8px]"
                                disabled={locked}
                                onClick={() => onResendVerification(u.id)}
                              >
                                <Inbox className="size-3.5" />
                                Resend
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-[8px]"
                              disabled={locked || !isActive}
                              onClick={() => void onOpenTenant(false, u.id)}
                            >
                              Open as
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="rounded-[8px]" asChild>
                              <Link
                                href={`${APP_ROUTES.superAdminCampaignNew}?segment=selected_users&userIds=${encodeURIComponent(u.id)}`}
                              >
                                Email
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SaShopPanel>

      {businessId ? <SaSmsCreditsPanel businessId={businessId} /> : null}
    </SaTenantShopFrame>
  );
}

function PulseCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className="border-b px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:last:border-r-0 lg:[&:nth-child(2)]:border-r lg:[&:nth-child(4)]:border-r-0"
      style={{ borderColor: "var(--sa-shop-rule, #e6e8ec)" }}
    >
      <p className="text-xs text-[#5b6470]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[#15231f]">{value}</p>
      <p className="mt-1 text-xs text-[#5b6470]">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[#5b6470]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[#15231f]">{value}</dd>
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
