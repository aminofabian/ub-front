"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BellRing,
  ChevronRight,
  ExternalLink,
  Info,
  MessageCircle,
  Search,
  X,
} from "lucide-react";

import {
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugDerivedShopUrl } from "@/lib/config";
import type { SaBusinessRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  NEW_TENANT_DAYS,
  type PresenceFilter,
  type PresenceIndex,
  type SegmentCounts,
  type SortKey,
  type StatusFilter,
  type TenantFilters,
  type TenantPresence,
  filtersAreDefault,
  formatAgo,
  initialsOf,
  isNewTenant,
  liveModeOf,
  presenceOf,
  whatsappHref,
  type LiveMode,
} from "./tenant-filters";

export type BusinessesPanel =
  | { kind: "create" }
  | { kind: "business"; id: string };

/** A tenant that came online while this page was open. */
export type TenantArrival = { id: string; name: string; at: number };

/** Terracotta is the one attention colour: stuck signups and a stale feed. */
const ATTENTION = "text-[#A55237]";

const ICON_BUTTON =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 @4xl:size-7";

/**
 * Keeps the optional row icons (WhatsApp, shop, bell) in the same column on
 * every wide row, so a missing one leaves a gap instead of shifting the rest.
 */
const ICON_SLOT = "hidden size-7 shrink-0 @4xl:block";

/** Checkbox | tenant | owner | plan | live | joined | actions (4 icons) */
const WIDE_COLUMNS =
  "@4xl:grid-cols-[1.5rem_minmax(0,1.7fr)_minmax(0,1.35fr)_4.5rem_minmax(0,1.3fr)_4.5rem_7.5rem]";

function panelEquals(a: BusinessesPanel | null, b: BusinessesPanel) {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "business" && b.kind === "business") return a.id === b.id;
  return true;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function FilterChip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[2px] border px-2 text-[11.5px] font-semibold tracking-[-0.01em] transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary bg-[rgba(29,75,59,0.09)] text-primary"
          : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** A count, or a dash while it is not known yet. */
function ChipCount({ value }: { value: number | null }) {
  return (
    <span className="font-mono text-[10.5px] font-medium tabular-nums opacity-70">
      {value ?? "–"}
    </span>
  );
}

function StateTag({
  children,
  attention = false,
}: {
  children: ReactNode;
  attention?: boolean;
}) {
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-[2px] border px-1 py-px text-[10px] font-semibold leading-none",
        attention
          ? "border-[rgba(165,82,55,0.4)] text-[#A55237]"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/** Online-count trend since the page was opened. */
function Sparkline({ values }: { values: number[] }) {
  // A couple of samples is not a trend; wait until there is something to draw.
  if (values.length < 4) return null;
  const width = 72;
  const height = 24;
  const pad = 3;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const flat = max === min;
  const points = values.map((value, index) => {
    const x = pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = flat
      ? height / 2
      : height - pad - ((value - min) / (max - min)) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 text-primary"
      role="img"
      aria-label={`Online tenants since you opened this page: ${values[0]} to ${values[values.length - 1]}`}
    >
      <polyline
        points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle cx={last[0]} cy={last[1]} r="2" fill="currentColor" />
    </svg>
  );
}

function PulseTile({
  position,
  label,
  value,
  sub,
  active,
  attention = false,
  dot = false,
  title,
  onClick,
  children,
}: {
  position: 0 | 1 | 2 | 3;
  label: string;
  value: string;
  sub: string;
  active: boolean;
  attention?: boolean;
  dot?: boolean;
  title: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  // Two columns on narrow containers, four once the strip has room.
  const borders = [
    "border-r border-b @2xl:border-b-0",
    "border-b @2xl:border-r @2xl:border-b-0",
    "border-r",
    "",
  ][position];

  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 flex-col items-start px-3.5 py-3 text-left transition-colors duration-200 @2xl:px-4",
        "border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
        borders,
        active ? "bg-[rgba(29,75,59,0.07)]" : "hover:bg-foreground/[0.025]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 bg-primary transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="flex w-full items-end justify-between gap-2">
        <span
          className={cn(
            "font-mono text-[26px] font-medium leading-none tracking-[-0.04em] tabular-nums",
            attention && value !== "0" && value !== "—"
              ? ATTENTION
              : "text-foreground",
          )}
        >
          {value}
        </span>
        {children}
      </span>
      <span className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold tracking-[-0.01em] text-foreground">
        {dot ? (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-primary"
          />
        ) : null}
        {label}
      </span>
      <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
        {sub}
      </span>
    </button>
  );
}

function LivePulse({
  counts,
  presence,
  series,
  loading,
  filters,
  onFiltersChange,
  arrivals,
  now,
  onOpenTenant,
}: {
  counts: SegmentCounts;
  presence: PresenceIndex;
  series: number[];
  loading: boolean;
  filters: TenantFilters;
  onFiltersChange: (patch: Partial<TenantFilters>) => void;
  arrivals: TenantArrival[];
  now: number;
  onOpenTenant: (id: string) => void;
}) {
  const mode = liveModeOf(presence);
  const online =
    mode === "support"
      ? (presence.totalOnline ?? counts.online)
      : counts.online;
  const show = (value: number) => (loading ? "—" : String(value));
  // Never print a zero we do not know: no answer yet is not "nobody online".
  const showLive = (value: number) =>
    loading || mode === "unknown" ? "—" : String(value);

  // While the list loads there are no rows to count, so say nothing about it.
  const onlineSub = loading
    ? "checking…"
    : mode === "unknown"
      ? "status unavailable"
      : mode === "support"
        ? "from the live total"
        : counts.sessions > 0
          ? `${counts.sessions} live ${counts.sessions === 1 ? "connection" : "connections"}`
          : "nobody on the app";

  const togglePresence = (value: PresenceFilter) =>
    onFiltersChange({ presence: filters.presence === value ? "all" : value });
  const toggleStatus = (value: StatusFilter) =>
    onFiltersChange({ status: filters.status === value ? "all" : value });

  return (
    <section
      aria-label="Live tenants"
      className="overflow-hidden rounded-[2px] border border-border bg-card"
    >
      <div className="grid grid-cols-2 @2xl:grid-cols-4">
        <PulseTile
          position={0}
          label="Online now"
          value={showLive(online)}
          sub={onlineSub}
          dot={mode !== "unknown" && online > 0}
          active={filters.presence === "online"}
          title="Tenants with the app, till or dashboard open right now"
          onClick={() => togglePresence("online")}
        >
          <Sparkline values={series} />
        </PulseTile>
        <PulseTile
          position={1}
          label="On support"
          value={showLive(counts.support)}
          sub="in the support chat"
          active={filters.presence === "support"}
          title="Online tenants who have the support chat open"
          onClick={() => togglePresence("support")}
        />
        <PulseTile
          position={2}
          label="Stuck signups"
          value={show(counts.stuck)}
          sub="not set up yet"
          attention
          active={filters.status === "stuck"}
          title="Tenants who signed up but have not finished setting up"
          onClick={() => toggleStatus("stuck")}
        />
        <PulseTile
          position={3}
          label="New this week"
          value={show(counts.fresh)}
          sub={`joined in ${NEW_TENANT_DAYS} days`}
          active={filters.status === "new"}
          title={`Tenants created in the last ${NEW_TENANT_DAYS} days`}
          onClick={() => toggleStatus("new")}
        />
      </div>

      {mode === "support" && !loading ? (
        <p
          role="note"
          className="flex items-start gap-1.5 border-t border-border px-3.5 py-2 text-[11.5px] leading-snug text-muted-foreground"
        >
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            The API only returns an online total, so just tenants on the support
            channel can be marked online. Deploy the updated backend to see
            every tenant who is online.
          </span>
        </p>
      ) : null}

      {arrivals.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3.5 py-2 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary"
            />
            Just in
          </span>
          {arrivals.slice(0, 4).map((arrival) => (
            <button
              key={arrival.id}
              type="button"
              onClick={() => onOpenTenant(arrival.id)}
              className="inline-flex items-baseline gap-1.5 rounded-[2px] text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {arrival.name}
              <span className="text-[10.5px] text-muted-foreground">
                {formatAgo(arrival.at, now)}
              </span>
            </button>
          ))}
        </p>
      ) : null}
    </section>
  );
}

/** "Live · updated 4s ago", ticking on its own so the table does not re-render. */
function LiveClock({ at, failed }: { at: number | null; failed: boolean }) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (at === null) {
    return (
      <span className={failed ? ATTENTION : undefined}>
        {failed ? "Live status unavailable" : "Checking live status…"}
      </span>
    );
  }
  const seconds = Math.max(0, Math.round((tick - at) / 1000));
  const stale = failed || seconds > 35;
  return (
    <span className={stale ? ATTENTION : undefined}>
      {stale ? "Live feed paused" : "Live"} · updated{" "}
      {seconds < 5 ? "just now" : `${seconds}s ago`}
    </span>
  );
}

function LiveStatus({
  live,
  now,
  mode,
}: {
  live: TenantPresence;
  now: number;
  mode: LiveMode;
}) {
  if (live.online) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px]">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_rgba(29,75,59,0.16)]"
        />
        <span className="font-semibold text-primary">Online</span>
        {live.sessions > 0 ? (
          <span
            className="font-mono text-[10.5px] tabular-nums text-muted-foreground"
            title={`${live.sessions} open ${live.sessions === 1 ? "connection" : "connections"} (tabs, tills, apps)`}
          >
            {live.sessions} live
          </span>
        ) : null}
        {live.onSupport ? <StateTag>support</StateTag> : null}
      </span>
    );
  }
  if (mode === "unknown") {
    return (
      <span
        className="text-[12px] text-muted-foreground"
        title="Live status is unavailable right now"
      >
        —
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
      title={
        live.lastSeenAt
          ? new Date(live.lastSeenAt).toLocaleString("en-KE")
          : "No activity since the API last restarted"
      }
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full border border-foreground/30"
      />
      {live.lastSeenAt
        ? `Seen ${formatAgo(live.lastSeenAt, now)}`
        : mode === "support"
          ? "Not on support"
          : "Offline"}
    </span>
  );
}

function TenantMark({ name, online }: { name: string; online: boolean }) {
  return (
    <span className="relative inline-grid size-8 shrink-0 place-items-center rounded-[2px] border border-border bg-muted text-[11px] font-semibold tracking-[-0.02em] text-foreground/70">
      {initialsOf(name)}
      {online ? (
        <span
          aria-hidden
          className="absolute -bottom-[3px] -right-[3px] size-[9px] rounded-full border-2 border-card bg-primary"
        />
      ) : null}
    </span>
  );
}

function SkeletonRows() {
  return (
    <ul aria-hidden className="divide-y divide-border">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 px-3 py-3">
          <span className="size-8 shrink-0 rounded-[2px] bg-foreground/[0.06] motion-safe:animate-pulse" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 w-1/3 rounded-[2px] bg-foreground/[0.06] motion-safe:animate-pulse" />
            <span className="block h-2.5 w-1/2 rounded-[2px] bg-foreground/[0.04] motion-safe:animate-pulse" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  filters,
  mode,
  totalCount,
  onReset,
}: {
  filters: TenantFilters;
  mode: LiveMode;
  totalCount: number;
  onReset: () => void;
}) {
  const query = filters.query.trim();
  // A search that finds nothing is about the search, whatever else is on.
  const liveOnly =
    !query && (filters.presence === "online" || filters.presence === "support");

  const title =
    totalCount === 0
      ? "No tenants yet."
      : query
        ? `No tenants match “${query}”.`
        : liveOnly && mode === "unknown"
          ? "Live status is unavailable."
          : liveOnly
            ? filters.presence === "support"
              ? "Nobody is on support right now."
              : "Nobody is online right now."
            : "No tenants in this view.";
  const hint =
    totalCount === 0
      ? "Create the first one with New tenant."
      : liveOnly && mode === "unknown"
        ? "The live feed could not be reached. This page tries again every 10 seconds."
        : liveOnly && mode === "support"
          ? "This API only reports tenants on the support channel. Deploy the updated backend to see everyone who is online."
          : liveOnly
            ? "Refreshes every 10 seconds. Clear the filter, then use the bell on a tenant to hear when they arrive."
            : "Try another search, or clear the filters.";

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <p className="font-serif text-[24px] font-normal leading-tight tracking-[-0.01em] text-foreground">
        {title}
      </p>
      <p className="max-w-[46ch] text-[12px] leading-relaxed text-muted-foreground">
        {hint}
      </p>
      {totalCount > 0 && !filtersAreDefault(filters) ? (
        <Button
          type="button"
          variant="outline"
          className="mt-1 h-8 rounded-[2px]"
          onClick={onReset}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function TenantRow({
  row,
  live,
  mode,
  stuck,
  now,
  active,
  checked,
  arrived,
  watched,
  onOpen,
  onToggleChecked,
  onToggleWatch,
}: {
  row: SaBusinessRow;
  live: TenantPresence;
  mode: LiveMode;
  stuck: boolean;
  now: number;
  active: boolean;
  checked: boolean;
  arrived: boolean;
  watched: boolean;
  onOpen: () => void;
  onToggleChecked: (checked: boolean) => void;
  onToggleWatch: () => void;
}) {
  const whatsapp = whatsappHref(row.ownerPhone);
  const shopUrl = slugDerivedShopUrl(row.slug);
  const ownerName = row.ownerName?.trim() ?? "";
  const ownerEmail = row.ownerEmail?.trim() ?? "";
  const ownerPhone = row.ownerPhone?.trim() ?? "";
  const ownerPrimary = ownerName || ownerEmail;
  // The email is the first line when there is no name, so it is not repeated.
  const ownerSubEmail = ownerName ? ownerEmail : "";
  const created = Date.parse(row.createdAt);
  const fresh = isNewTenant(row, now);

  return (
    <li>
      <div
        className={cn(
          // Phone: one column. Tablet: tenant and owner on the left, live and
          // actions on the right. Desktop: a seven-column table row.
          "group relative grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1.5 px-3 py-3 transition-colors duration-200",
          "@2xl:grid-cols-[1.5rem_minmax(0,1.25fr)_minmax(0,1fr)] @2xl:gap-x-3 @2xl:gap-y-1 @2xl:py-2.5",
          WIDE_COLUMNS,
          "@4xl:items-center @4xl:gap-y-0",
          active
            ? "bg-[rgba(29,75,59,0.075)]"
            : arrived
              ? "bg-[rgba(29,75,59,0.055)]"
              : checked
                ? "bg-[rgba(29,75,59,0.035)]"
                : "hover:bg-foreground/[0.02]",
        )}
        onClick={(event) => {
          // Anywhere on the row opens the tenant, except its own controls.
          if ((event.target as HTMLElement).closest("a,button,input,label")) {
            return;
          }
          onOpen();
        }}
      >
        {arrived ? (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-0.5 bg-primary"
          />
        ) : null}

        <label className="flex h-8 items-center justify-center @2xl:col-start-1 @2xl:row-span-2 @2xl:row-start-1 @4xl:col-auto @4xl:row-auto @4xl:row-span-1">
          <input
            type="checkbox"
            className="size-3.5 accent-primary"
            checked={checked}
            onChange={(event) => onToggleChecked(event.target.checked)}
            aria-label={`Select ${row.name}`}
          />
        </label>

        <div className="col-start-2 flex min-w-0 items-center gap-2.5 @2xl:row-start-1 @4xl:col-auto @4xl:row-auto">
          <TenantMark name={row.name} online={live.online} />
          <div className="min-w-0">
            <button
              type="button"
              onClick={onOpen}
              title={row.name}
              className="block max-w-full truncate rounded-[2px] text-left text-[13.5px] font-semibold tracking-[-0.015em] text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {row.name}
            </button>
            <p className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-1.5">
              <span
                className="min-w-0 truncate font-mono text-[10.5px] text-muted-foreground"
                title={row.slug}
              >
                {row.slug}
              </span>
              {!row.active ? <StateTag>Inactive</StateTag> : null}
              {stuck ? <StateTag attention>Stuck</StateTag> : null}
              {fresh ? <StateTag>New</StateTag> : null}
            </p>
          </div>
        </div>

        <div className="col-start-2 min-w-0 @2xl:row-start-2 @4xl:col-auto @4xl:row-auto">
          {ownerPrimary ? (
            <>
              <p
                className="truncate text-[12.5px] text-foreground"
                title={ownerPrimary}
              >
                {ownerPrimary}
              </p>
              {ownerSubEmail || ownerPhone ? (
                // The email gives way first; a phone number is never cut short.
                <p className="flex min-w-0 items-baseline gap-1.5 text-[11px] text-muted-foreground">
                  {ownerSubEmail ? (
                    <span className="min-w-0 truncate" title={ownerSubEmail}>
                      {ownerSubEmail}
                    </span>
                  ) : null}
                  {ownerSubEmail && ownerPhone ? (
                    <span aria-hidden className="shrink-0">
                      ·
                    </span>
                  ) : null}
                  {ownerPhone ? (
                    <span className="shrink-0 tabular-nums">{ownerPhone}</span>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : ownerPhone ? (
            <p className="truncate text-[12.5px] text-foreground">
              {ownerPhone}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No owner linked
            </p>
          )}
        </div>

        <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 @2xl:col-start-3 @2xl:row-start-1 @2xl:self-center @4xl:contents">
          <span className="text-[12px] capitalize text-foreground/80">
            {row.subscriptionTier}
          </span>
          {/* Live leads on narrow rows; on the table it sits after the plan. */}
          <span className="order-first min-w-0 @4xl:order-none">
            <LiveStatus live={live} now={now} mode={mode} />
          </span>
          <span
            className="font-mono text-[11px] tabular-nums text-muted-foreground"
            title={
              Number.isNaN(created)
                ? undefined
                : new Date(created).toLocaleString("en-KE")
            }
          >
            <span className="@4xl:hidden">Joined </span>
            {formatAgo(created, now)}
          </span>
        </div>

        <div className="col-start-2 flex items-center gap-0.5 @2xl:col-start-3 @2xl:row-start-2 @2xl:justify-end @2xl:self-center @4xl:col-auto @4xl:row-auto">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_BUTTON}
              aria-label={`WhatsApp the owner of ${row.name}`}
              title="WhatsApp the owner"
            >
              <MessageCircle className="size-3.5" aria-hidden />
            </a>
          ) : (
            <span aria-hidden className={ICON_SLOT} />
          )}
          {shopUrl ? (
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_BUTTON}
              aria-label={`Open the ${row.name} shop in a new tab`}
              title="Open the shop"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            <span aria-hidden className={ICON_SLOT} />
          )}
          {!live.online ? (
            <button
              type="button"
              aria-pressed={watched}
              aria-label={
                watched
                  ? `Stop watching ${row.name}`
                  : `Tell me when ${row.name} comes online`
              }
              title={
                watched
                  ? "Watching: you will get a notice when they come online"
                  : "Tell me when they come online"
              }
              onClick={onToggleWatch}
              className={cn(ICON_BUTTON, watched && "text-primary")}
            >
              {watched ? (
                <BellRing className="size-3.5" aria-hidden />
              ) : (
                <Bell className="size-3.5" aria-hidden />
              )}
            </button>
          ) : (
            <span aria-hidden className={ICON_SLOT} />
          )}
          <button
            type="button"
            onClick={onOpen}
            className={ICON_BUTTON}
            aria-label={`Open ${row.name}`}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Theatre                                                             */
/* ------------------------------------------------------------------ */

export type BusinessesTheatreProps = {
  /** Rows after search, filters and sorting. */
  rows: SaBusinessRow[];
  totalCount: number;
  counts: SegmentCounts;
  stuckIds: ReadonlySet<string>;
  presence: PresenceIndex;
  /** When the live status was last refreshed (ms epoch), null before the first answer. */
  presenceAt: number | null;
  presenceFailed: boolean;
  /** Online-tenant totals since the page opened, oldest first. */
  onlineSeries: number[];
  arrivals: TenantArrival[];
  /** Tenants to highlight as "just came online". */
  arrivedIds: ReadonlySet<string>;
  watchedIds: ReadonlySet<string>;
  onToggleWatch: (row: SaBusinessRow) => void;
  /** ms epoch used for every "ago" label so the table stays consistent. */
  now: number;
  filters: TenantFilters;
  onFiltersChange: (patch: Partial<TenantFilters>) => void;
  onResetFilters: () => void;
  tiers: string[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelected: (id: string, checked: boolean) => void;
  onSelectVisible: (checked: boolean) => void;
  selected: BusinessesPanel | null;
  selectedBusiness: SaBusinessRow | null;
  onSelect: (panel: BusinessesPanel) => void;
  onClearSelection: () => void;
  modalBody: ReactNode;
  modalFooter?: ReactNode;
  selectionBar?: ReactNode;
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "online", label: "Online first" },
  { value: "seen", label: "Recently seen" },
  { value: "name", label: "Name A–Z" },
];

export function BusinessesTheatre({
  rows,
  totalCount,
  counts,
  stuckIds,
  presence,
  presenceAt,
  presenceFailed,
  onlineSeries,
  arrivals,
  arrivedIds,
  watchedIds,
  onToggleWatch,
  now,
  filters,
  onFiltersChange,
  onResetFilters,
  tiers,
  loading,
  selectedIds,
  onToggleSelected,
  onSelectVisible,
  selected,
  selectedBusiness,
  onSelect,
  onClearSelection,
  modalBody,
  modalFooter,
  selectionBar,
}: BusinessesTheatreProps) {
  const filtersActive = !filtersAreDefault(filters);
  const mode = liveModeOf(presence);
  // A count is only printed when it is known; otherwise a dash.
  const count = (value: number) => (loading ? null : value);
  const liveCount = (value: number) =>
    loading || mode === "unknown" ? null : value;
  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
  const someVisibleSelected = rows.some((row) => selectedIds.includes(row.id));

  const togglePresence = (value: PresenceFilter) =>
    onFiltersChange({ presence: filters.presence === value ? "all" : value });
  const toggleStatus = (value: StatusFilter) =>
    onFiltersChange({ status: filters.status === value ? "all" : value });

  const selectPanel = (panel: BusinessesPanel) => {
    onSelect(panel);
    history.replaceState(
      null,
      "",
      panel.kind === "business" ? `#business-${panel.id}` : "#create",
    );
  };

  const clearSelection = () => {
    onClearSelection();
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const selectAllControl = (
    <input
      type="checkbox"
      className="size-3.5 accent-primary"
      checked={allVisibleSelected}
      ref={(el) => {
        if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
      }}
      onChange={(event) => onSelectVisible(event.target.checked)}
      aria-label="Select all visible tenants"
    />
  );

  const modalTitle =
    selected?.kind === "create"
      ? "New tenant"
      : (selectedBusiness?.name ?? "Tenant");
  const modalDescription =
    selected?.kind === "create"
      ? "Name and slug are required. Defaults use Nairobi / KES."
      : selectedBusiness
        ? `${selectedBusiness.slug} · ${selectedBusiness.active ? "active" : "inactive"}`
        : "Tenant details";

  return (
    <div className="@container flex min-h-0 flex-col gap-1.5">
      <LivePulse
        counts={counts}
        presence={presence}
        series={onlineSeries}
        loading={loading}
        filters={filters}
        onFiltersChange={onFiltersChange}
        arrivals={arrivals}
        now={now}
        onOpenTenant={(id) => selectPanel({ kind: "business", id })}
      />

      {selectionBar}

      <section
        aria-label="Tenants"
        className="overflow-hidden rounded-[2px] border border-border bg-card"
      >
        {/* Search, plan, sort and the filter chips */}
        <div className="space-y-2 border-b border-border px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block min-w-[13rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                className={cn(
                  dashboardInputClass(),
                  "h-10 pl-8 pr-8 text-[13px] sm:h-9 [&::-webkit-search-cancel-button]:hidden",
                )}
                value={filters.query}
                onChange={(event) =>
                  onFiltersChange({ query: event.target.value })
                }
                placeholder="Search name, owner, slug, phone, ID…"
                aria-label="Search tenants"
              />
              {filters.query ? (
                <button
                  type="button"
                  onClick={() => onFiltersChange({ query: "" })}
                  className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[2px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </label>

            {tiers.length > 0 ? (
              <select
                className={cn(
                  dashboardSelectClass(),
                  "h-10 w-auto min-w-[8.5rem] flex-1 text-[12.5px] sm:h-9 sm:flex-none",
                )}
                value={filters.tier}
                onChange={(event) =>
                  onFiltersChange({ tier: event.target.value })
                }
                aria-label="Filter by plan"
              >
                <option value="">All plans</option>
                {tiers.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              className={cn(
                dashboardSelectClass(),
                "h-10 w-auto min-w-[8.5rem] flex-1 text-[12.5px] sm:h-9 sm:flex-none",
              )}
              value={filters.sort}
              onChange={(event) =>
                onFiltersChange({ sort: event.target.value as SortKey })
              }
              aria-label="Sort tenants"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <FilterChip
              active={filters.presence === "online"}
              onClick={() => togglePresence("online")}
              title="Tenants with the app, till or dashboard open right now"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-primary"
              />
              Online
              <ChipCount value={liveCount(counts.online)} />
            </FilterChip>
            <FilterChip
              active={filters.presence === "support"}
              onClick={() => togglePresence("support")}
              title="Online tenants who have the support chat open"
            >
              On support
              <ChipCount value={liveCount(counts.support)} />
            </FilterChip>
            {/* An API that only names support tenants cannot tell who is offline. */}
            {mode !== "support" || filters.presence === "offline" ? (
              <FilterChip
                active={filters.presence === "offline"}
                onClick={() => togglePresence("offline")}
                title="Tenants with nothing open right now"
              >
                Offline
                <ChipCount value={liveCount(counts.offline)} />
              </FilterChip>
            ) : null}

            <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />

            <FilterChip
              active={filters.status === "active"}
              onClick={() => toggleStatus("active")}
            >
              Active
              <ChipCount value={count(counts.active)} />
            </FilterChip>
            <FilterChip
              active={filters.status === "inactive"}
              onClick={() => toggleStatus("inactive")}
              title="Tenants that are switched off"
            >
              Inactive
              <ChipCount value={count(counts.inactive)} />
            </FilterChip>
            <FilterChip
              active={filters.status === "stuck"}
              onClick={() => toggleStatus("stuck")}
              title="Signed up but not set up yet"
            >
              Stuck
              <ChipCount value={count(counts.stuck)} />
            </FilterChip>
            <FilterChip
              active={filters.status === "new"}
              onClick={() => toggleStatus("new")}
              title={`Created in the last ${NEW_TENANT_DAYS} days`}
            >
              New
              <ChipCount value={count(counts.fresh)} />
            </FilterChip>

            {filtersActive ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="ml-auto shrink-0 rounded-[2px] px-1.5 text-[11.5px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {/* Result count, select-all (narrow) and the live clock */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          <label className="inline-flex items-center gap-1.5 @4xl:hidden">
            {selectAllControl}
            Select visible
          </label>
          <p className="tabular-nums">
            {loading && totalCount === 0
              ? "Loading tenants…"
              : `${rows.length} of ${totalCount} ${totalCount === 1 ? "tenant" : "tenants"}`}
          </p>
          <p className="tabular-nums">
            <LiveClock at={presenceAt} failed={presenceFailed} />
          </p>
        </div>

        {/* Column headings, wide containers only */}
        <div
          className={cn(
            "hidden items-center gap-x-3 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground",
            rows.length > 0 && "@4xl:grid",
            WIDE_COLUMNS,
          )}
        >
          <span className="flex items-center justify-center">
            {selectAllControl}
          </span>
          <span>Tenant</span>
          <span>Owner</span>
          <span>Plan</span>
          <span>Live</span>
          <span>Joined</span>
          <span className="sr-only">Actions</span>
        </div>

        {loading && rows.length === 0 && totalCount === 0 ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <EmptyState
            filters={filters}
            mode={mode}
            totalCount={totalCount}
            onReset={onResetFilters}
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <TenantRow
                key={row.id}
                row={row}
                live={presenceOf(presence, row.id)}
                mode={mode}
                stuck={stuckIds.has(row.id)}
                now={now}
                active={panelEquals(selected, { kind: "business", id: row.id })}
                checked={selectedIds.includes(row.id)}
                arrived={arrivedIds.has(row.id)}
                watched={watchedIds.has(row.id)}
                onOpen={() => selectPanel({ kind: "business", id: row.id })}
                onToggleChecked={(checked) =>
                  onToggleSelected(row.id, checked)
                }
                onToggleWatch={() => onToggleWatch(row)}
              />
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
      >
        <DialogContent
          className="max-h-[min(90dvh,40rem)] gap-0 overflow-hidden rounded-[2px] border p-0 sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12">
            <DialogTitle className="font-serif text-[21px] font-normal leading-tight tracking-[-0.015em]">
              {modalTitle}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {modalDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {selected ? modalBody : null}
          </div>

          {modalFooter ? (
            <DialogFooter className="shrink-0 border-t border-border px-4 py-2.5 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-[2px]"
                onClick={clearSelection}
              >
                Close
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                {modalFooter}
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
