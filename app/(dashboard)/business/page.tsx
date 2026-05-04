"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock,
  Coins,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Pencil,
  RefreshCw,
  Save,
  Shield,
  Store,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  fetchBranches,
  fetchBusiness,
  updateBusiness,
  type BranchRecord,
  type BusinessRecord,
  type PatchBusinessPayload,
} from "@/lib/api";

const MAX_FEATURED = 12;

const TIER_SUGGESTIONS = ["starter", "growth", "enterprise"] as const;

function parseFeaturedLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_FEATURED);
}

type EditableBusiness = {
  name: string;
  subscriptionTier: string;
  active: boolean;
};

type StorefrontForm = {
  enabled: boolean;
  catalogBranchId: string;
  label: string;
  announcement: string;
  featuredLines: string;
};

const DEFAULT_EDITABLE: EditableBusiness = {
  name: "",
  subscriptionTier: "starter",
  active: true,
};

const DEFAULT_STOREFRONT: StorefrontForm = {
  enabled: false,
  catalogBranchId: "",
  label: "",
  announcement: "",
  featuredLines: "",
};

function storefrontFromRecord(b: BusinessRecord | null): StorefrontForm {
  const s = b?.storefront;
  return {
    enabled: Boolean(s?.enabled),
    catalogBranchId: String(s?.catalogBranchId ?? "").trim(),
    label: String(s?.label ?? ""),
    announcement: String(s?.announcement ?? ""),
    featuredLines: (s?.featuredItemIds ?? []).join("\n"),
  };
}

type Feedback = { kind: "success" | "error"; text: string };

function inputClass(disabled?: boolean) {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function labelClass() {
  return "text-sm font-medium leading-none text-foreground";
}

function hintClass() {
  return "text-xs leading-relaxed text-muted-foreground";
}

export default function BusinessPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [editable, setEditable] = useState<EditableBusiness>(DEFAULT_EDITABLE);
  const [storefront, setStorefront] = useState<StorefrontForm>(DEFAULT_STOREFRONT);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const skipDrawerResetAfterSave = useRef(false);

  const load = useCallback(() => {
    return fetchBusiness()
      .then((payload) => {
        setLoadFailed(false);
        setFeedback(null);
        setSnapshot(payload);
        setEditable({
          name: String(payload.name ?? ""),
          subscriptionTier: String(payload.subscriptionTier ?? "starter"),
          active: Boolean(payload.active ?? true),
        });
        setStorefront(storefrontFromRecord(payload));
      })
      .catch((error) => {
        setLoadFailed(true);
        setSnapshot(null);
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Could not load your business.",
        });
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [canManageBusinessSettings]);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const body: PatchBusinessPayload = {
        name: editable.name,
        subscriptionTier: editable.subscriptionTier,
        active: editable.active,
      };
      if (canManageBusinessSettings) {
        body.storefront = {
          enabled: storefront.enabled,
          catalogBranchId: storefront.enabled ? storefront.catalogBranchId.trim() : "",
          label: storefront.label.trim() || null,
          announcement: storefront.announcement.trim() || null,
          featuredItemIds: parseFeaturedLines(storefront.featuredLines),
        };
      }
      await updateBusiness(body);
      const next = await fetchBusiness();
      skipDrawerResetAfterSave.current = true;
      setSnapshot(next);
      setEditable({
        name: String(next.name ?? ""),
        subscriptionTier: String(next.subscriptionTier ?? "starter"),
        active: Boolean(next.active ?? true),
      });
      setStorefront(storefrontFromRecord(next));
      setSettingsDrawerOpen(false);
      setFeedback({ kind: "success", text: "Your changes were saved." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Something went wrong while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = snapshot === null && !loadFailed;
  const activeBranches = branches.filter((b) => b.active);
  const storefrontNeedsBranch =
    canManageBusinessSettings &&
    storefront.enabled &&
    (activeBranches.length === 0 || !storefront.catalogBranchId.trim());

  const resetFormFromSnapshot = useCallback(() => {
    if (!snapshot) {
      return;
    }
    setEditable({
      name: String(snapshot.name ?? ""),
      subscriptionTier: String(snapshot.subscriptionTier ?? "starter"),
      active: Boolean(snapshot.active ?? true),
    });
    setStorefront(storefrontFromRecord(snapshot));
  }, [snapshot]);

  const onSettingsDrawerOpenChange = (open: boolean) => {
    if (!open) {
      if (skipDrawerResetAfterSave.current) {
        skipDrawerResetAfterSave.current = false;
      } else {
        resetFormFromSnapshot();
      }
    }
    setSettingsDrawerOpen(open);
  };

  const relatedLinks = (
    <div className="grid gap-2 sm:grid-cols-3">
      {[
        { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo, colors, shop name", icon: Palette },
        { href: APP_ROUTES.businessDomains, label: "Domains", desc: "Custom hostnames", icon: Globe },
        { href: APP_ROUTES.branches, label: "Branches", desc: "Locations & registers", icon: Building2 },
      ].map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading business settings…</p>
      </div>
    );
  }

  if (loadFailed && !snapshot) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">Could not load settings</h2>
          <p className="mt-2 text-sm text-muted-foreground">{feedback?.text}</p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => {
              setLoadFailed(false);
              setFeedback(null);
              void load();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={DASHBOARD_MAX}>
        <div className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <DashboardPageHero
              icon={Shield}
              eyebrow="Account"
              title="Business settings"
              description={
                <>
                  Name, billing tier, and storefront controls for your organization. Workspace identifiers below are
                  read-only; use <span className="font-medium text-foreground">Edit settings</span> to change what you
                  can edit, then save from the drawer.
                </>
              }
            />
            <Button
              type="button"
              size="lg"
              className="gap-2 self-start shadow-md lg:shrink-0"
              disabled={!snapshot || isSaving}
              onClick={() => {
                skipDrawerResetAfterSave.current = false;
                setSettingsDrawerOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Edit settings
            </Button>
          </div>

          {canManageBusinessSettings ? relatedLinks : null}

          {feedback && !loadFailed ? (
            <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
          ) : null}

          {snapshot ? (
            <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/80 p-1 shadow-sm">
              <div className="rounded-[calc(1rem-2px)] bg-card/90 p-5 sm:p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  These values are managed separately from editable settings in the drawer.
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Slug", value: snapshot.slug ?? "—", icon: Globe },
                    { label: "Timezone", value: snapshot.timezone ?? "—", icon: Clock },
                    { label: "Currency", value: snapshot.currency ?? "—", icon: Coins },
                    { label: "Country", value: snapshot.countryCode ?? "—", icon: MapPin },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                        <dd className="truncate font-mono text-sm font-medium text-foreground">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <FormDrawer
        open={settingsDrawerOpen}
        onOpenChange={onSettingsDrawerOpenChange}
        title="Edit business settings"
        description={
          <>
            Changes are sent to <span className="font-mono text-xs">PATCH /businesses/me</span>. Close without saving
            to discard edits.
          </>
        }
        contextLabel="Account"
        icon={<Shield className="size-5 text-primary" aria-hidden />}
        width="wide"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onSettingsDrawerOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="business-settings-form" disabled={isSaving || Boolean(storefrontNeedsBranch)}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" aria-hidden />
                  Save changes
                </>
              )}
            </Button>
          </div>
        }
      >
        <form id="business-settings-form" className="space-y-6" onSubmit={onSave}>
          <FormDrawerFields
            legend="Profile & billing"
            hint="How your business appears internally and your plan label."
          >
            <div className="space-y-2">
              <label className={labelClass()} htmlFor="biz-name">
                Business name
              </label>
              <input
                id="biz-name"
                className={inputClass()}
                value={editable.name}
                onChange={(event) =>
                  setEditable((previous) => ({ ...previous, name: event.target.value }))
                }
                placeholder="Acme Retail Ltd"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass()} htmlFor="biz-tier">
                Subscription tier
              </label>
              <input
                id="biz-tier"
                className={inputClass()}
                list="tier-suggestions"
                value={editable.subscriptionTier}
                onChange={(event) =>
                  setEditable((previous) => ({
                    ...previous,
                    subscriptionTier: event.target.value,
                  }))
                }
                placeholder="starter"
              />
              <datalist id="tier-suggestions">
                {TIER_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <p className={hintClass()}>Pick a suggestion or type your plan code exactly as provisioned.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={labelClass()}>Business status</p>
                <p className={cn(hintClass(), "mt-1 max-w-md")}>
                  Inactive businesses are hidden from day-to-day operations. Toggle only if you intend to pause this
                  workspace.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-3 self-start sm:self-auto">
                <span className="text-sm text-muted-foreground">{editable.active ? "Active" : "Inactive"}</span>
                <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={editable.active}
                    onChange={(event) =>
                      setEditable((previous) => ({ ...previous, active: event.target.checked }))
                    }
                  />
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full bg-muted-foreground/25 transition-colors",
                      "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                      "peer-checked:bg-primary",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 z-10 size-6 rounded-full bg-background shadow-sm transition-transform",
                      "peer-checked:translate-x-5",
                    )}
                    aria-hidden
                  />
                </span>
              </label>
            </div>
          </FormDrawerFields>

          {canManageBusinessSettings ? (
            <FormDrawerFields
              legend="Online storefront"
              hint="Public catalog and pickup flow. Prices follow the branch you choose."
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input text-primary focus:ring-ring"
                  checked={storefront.enabled}
                  onChange={(event) =>
                    setStorefront((s) => ({ ...s, enabled: event.target.checked }))
                  }
                />
                Enable storefront
              </label>
              <div className="space-y-2">
                <label className={labelClass()} htmlFor="sf-branch">
                  Catalog branch
                </label>
                <select
                  id="sf-branch"
                  className={inputClass(!storefront.enabled)}
                  value={storefront.catalogBranchId}
                  disabled={!storefront.enabled}
                  onChange={(e) =>
                    setStorefront((s) => ({ ...s, catalogBranchId: e.target.value }))
                  }
                >
                  <option value="">Select branch…</option>
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className={hintClass()}>Shoppers see stock and prices from this branch.</p>
                {storefront.enabled && activeBranches.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    Add an active branch first, then pick it here so the storefront has a price list.
                  </p>
                ) : null}
                {storefront.enabled && activeBranches.length > 0 && !storefront.catalogBranchId.trim() ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                    Select which branch powers the public catalog before saving.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-1">
                  <label className={labelClass()} htmlFor="sf-label">
                    Shop label <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    id="sf-label"
                    className={inputClass(!storefront.enabled)}
                    disabled={!storefront.enabled}
                    value={storefront.label}
                    onChange={(e) => setStorefront((s) => ({ ...s, label: e.target.value }))}
                    placeholder="e.g. Order online"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className={labelClass()} htmlFor="sf-announcement">
                    Announcement <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="sf-announcement"
                    className={cn(inputClass(!storefront.enabled), "min-h-[5rem] resize-y")}
                    disabled={!storefront.enabled}
                    value={storefront.announcement}
                    onChange={(e) => setStorefront((s) => ({ ...s, announcement: e.target.value }))}
                    placeholder="Short banner message on your public shop"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className={labelClass()} htmlFor="sf-featured">
                    Featured product IDs <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id="sf-featured"
                    className={cn(
                      inputClass(!storefront.enabled),
                      "min-h-[7rem] resize-y font-mono text-xs leading-relaxed",
                    )}
                    disabled={!storefront.enabled}
                    value={storefront.featuredLines}
                    onChange={(e) => setStorefront((s) => ({ ...s, featuredLines: e.target.value }))}
                    placeholder={"One UUID per line, up to " + MAX_FEATURED + " lines"}
                  />
                  <p className={hintClass()}>Paste product UUIDs from your catalog to pin them on the storefront home.</p>
                </div>
              </div>
            </FormDrawerFields>
          ) : null}
        </form>
      </FormDrawer>
    </>
  );
}
