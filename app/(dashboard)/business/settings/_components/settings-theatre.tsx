"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Clock,
  Coins,
  Globe,
  MapPin,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Store,
} from "lucide-react";

import {
  BUSINESS_PROFILE_NAV,
  PROFILE_SECTION_META,
  type BusinessSettingsNavItem,
} from "@/components/business/business-settings-nav";
import type {
  EditableBusiness,
  StorefrontForm,
} from "@/components/business/business-settings-types";
import { dashboardHintClass, dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function sectionMeta(id: string) {
  return (
    PROFILE_SECTION_META[id] ?? {
      title: id,
      hint: "Shop identity and storefront options.",
    }
  );
}

function sectionSummary(
  sectionId: string,
  editable: EditableBusiness,
  storefront: StorefrontForm,
): ReactNode {
  switch (sectionId) {
    case "settings-profile":
      return (
        <>
          <span className="font-semibold">{editable.name.trim() || "Unnamed shop"}</span>
          {" · "}
          {editable.active ? "Live" : "Paused"} · tier{" "}
          <span className="font-semibold">
            {editable.subscriptionTier?.trim() || "starter"}
          </span>
        </>
      );
    case "settings-storefront":
      return (
        <>
          Online store{" "}
          <span className="font-semibold">
            {storefront.enabled ? "on" : "off"}
          </span>
          {storefront.enabled && storefront.catalogBranchId.trim() ? (
            <>
              {" "}
              · catalog branch selected
            </>
          ) : null}
        </>
      );
    default:
      return <>Edit fields in the panel — save applies profile and storefront.</>;
  }
}

export type ShopSnapshotOverview = {
  name: string | null;
  active: boolean;
  subscriptionTier: string | null;
  slug: string | null;
  countryCode: string | null;
  currency: string | null;
  timezone: string | null;
};

function SettingsContextBanner({
  snapshot,
  allowNegativeStock,
  storefrontEnabled,
}: {
  snapshot: ShopSnapshotOverview | null;
  allowNegativeStock: boolean;
  storefrontEnabled: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className={cn(dashboardHintClass(), "min-w-0 truncate font-medium text-foreground")}>
        {snapshot?.name?.trim() || "This shop"}
        {snapshot ? (
          <>
            {" "}
            ·{" "}
            <span
              className={cn(
                snapshot.active ? "text-emerald-700" : "text-muted-foreground",
              )}
            >
              {snapshot.active ? "Live" : "Paused"}
            </span>
            {snapshot.subscriptionTier ? (
              <>
                {" "}
                ·{" "}
                <span className="capitalize">{snapshot.subscriptionTier}</span>
              </>
            ) : null}
          </>
        ) : null}
      </p>

      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />

      <p className={cn(dashboardHintClass(), "tabular-nums")}>
        Storefront{" "}
        <span className="font-semibold text-foreground">
          {storefrontEnabled ? "on" : "off"}
        </span>
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Link
          href={`${APP_ROUTES.businessConfiguration}#settings-stock-levels`}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold transition-colors",
            allowNegativeStock
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:text-foreground",
          )}
        >
          <ShoppingCart className="size-3 shrink-0" aria-hidden />
          Oversell {allowNegativeStock ? "on" : "off"}
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        <Link
          href={APP_ROUTES.businessConfiguration}
          className="inline-flex h-7 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="size-3" aria-hidden />
          Configuration
        </Link>
      </div>
    </div>
  );
}

function SettingsPulse({
  snapshot,
  editable,
  storefront,
  onSelectSection,
  sectionItems,
  className,
}: {
  snapshot: ShopSnapshotOverview | null;
  editable: EditableBusiness;
  storefront: StorefrontForm;
  onSelectSection: (id: string) => void;
  sectionItems: BusinessSettingsNavItem[];
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 34 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 52 C 46 62, 64 56, 78 66"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[16%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Shop status
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {snapshot?.active ? "Live" : "Paused"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {editable.name.trim() || snapshot?.name?.trim() || "Business profile"}
        </p>
      </div>

      <div className={cn(card, "right-3 top-[10%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Storefront
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {storefront.enabled ? "On" : "Off"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {storefront.enabled
            ? "Customers can browse your catalog"
            : "Landing page only until you turn it on"}
        </p>
      </div>

      {snapshot ? (
        <div className={cn(card, "bottom-[18%] left-[8%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Identity
          </p>
          <dl className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Globe className="size-3 shrink-0" aria-hidden />
              <dd className="truncate font-mono font-semibold text-foreground">
                {snapshot.slug ?? "—"}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="size-3 shrink-0" aria-hidden />
              <dd className="font-semibold text-foreground">
                {snapshot.currency ?? "—"}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3 shrink-0" aria-hidden />
              <dd className="truncate font-semibold text-foreground">
                {snapshot.timezone ?? "—"}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <dd className="font-semibold text-foreground">
                {snapshot.countryCode ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {sectionItems[0] ? (
        <button
          type="button"
          className={cn(
            card,
            "bottom-[8%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
          )}
          onClick={() => onSelectSection(sectionItems[0]!.id)}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Building2
              className="size-3.5 text-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
            Start with {sectionItems[0].label}
          </p>
          <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
            {sectionMeta(sectionItems[0].id).hint}
          </p>
        </button>
      ) : null}
    </div>
  );
}

function SettingsFocus({
  sectionId,
  editable,
  storefront,
  className,
}: {
  sectionId: string;
  editable: EditableBusiness;
  storefront: StorefrontForm;
  className?: string;
}) {
  const meta = sectionMeta(sectionId);
  const navItem = BUSINESS_PROFILE_NAV.find((i) => i.id === sectionId);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        {navItem ? (
          <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <navItem.icon className="size-3" aria-hidden />
            {navItem.label}
          </span>
        ) : null}
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {meta.title}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {meta.hint}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          {sectionSummary(sectionId, editable, storefront)}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Edit fields in the panel → then Save changes
      </p>
    </div>
  );
}

export type SettingsTheatreProps = {
  activeSectionId: string | null;
  onActiveSectionChange: (id: string | null) => void;
  snapshot: ShopSnapshotOverview | null;
  editable: EditableBusiness;
  storefront: StorefrontForm;
  allowNegativeStock: boolean;
  includeStorefront: boolean;
  drawerFields: ReactNode;
  footer: ReactNode;
};

export function SettingsTheatre({
  activeSectionId,
  onActiveSectionChange,
  snapshot,
  editable,
  storefront,
  allowNegativeStock,
  includeStorefront,
  drawerFields,
  footer,
}: SettingsTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sectionItems = useMemo(() => {
    return BUSINESS_PROFILE_NAV.filter(
      (item) => item.id !== "settings-storefront" || includeStorefront,
    );
  }, [includeStorefront]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sectionItems;
    return sectionItems.filter((item) => {
      const meta = sectionMeta(item.id);
      return (
        item.label.toLowerCase().includes(q) ||
        meta.title.toLowerCase().includes(q) ||
        meta.hint.toLowerCase().includes(q)
      );
    });
  }, [sectionItems, query]);

  const selectSection = (id: string) => {
    onActiveSectionChange(id);
    history.replaceState(null, "", `#${id}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSection = () => {
    onActiveSectionChange(null);
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const activeMeta = activeSectionId ? sectionMeta(activeSectionId) : null;
  const drawerOpen = !!activeSectionId && (isLg || mobileDrawerOpen);

  useEffect(() => {
    if (activeSectionId && !isLg) {
      setMobileDrawerOpen(true);
    }
  }, [activeSectionId, isLg]);

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections…"
              aria-label="Search settings sections"
            />
          </label>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredSections.length} section
            {filteredSections.length === 1 ? "" : "s"}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {filteredSections.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No sections match “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredSections.map((item) => {
                const active = activeSectionId === item.id;
                const meta = sectionMeta(item.id);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectSection(item.id)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser ? "px-2.5 py-2 sm:px-3" : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center border",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {meta.hint}
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = activeSectionId ? (
    <SettingsFocus
      sectionId={activeSectionId}
      editable={editable}
      storefront={storefront}
      className="h-full min-h-0"
    />
  ) : (
    <SettingsPulse
      snapshot={snapshot}
      editable={editable}
      storefront={storefront}
      onSelectSection={selectSection}
      sectionItems={sectionItems}
      className="h-full min-h-0"
    />
  );

  const inspect = activeSectionId ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a section
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Profile and storefront for this shop — choose a section on the left,
          edit on the right, then save once for the whole page.
        </p>
        <p className={cn(dashboardHintClass(), "mt-4 flex items-center gap-1.5")}>
          <Store className="size-3.5 shrink-0" aria-hidden />
          Inventory and till policies live under Configuration
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        Deep links use <span className="font-mono text-[10px]">#section-id</span>{" "}
        in the URL
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <SettingsContextBanner
        snapshot={snapshot}
        allowNegativeStock={allowNegativeStock}
        storefrontEnabled={storefront.enabled}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            Shop floor
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && activeSectionId ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSection();
        }}
        contextLabel="Business settings"
        title={activeMeta?.title ?? "Section"}
        description={activeMeta?.hint}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={footer}
      >
        {activeSectionId ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {drawerFields}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
