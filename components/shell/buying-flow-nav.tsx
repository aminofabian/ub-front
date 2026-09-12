"use client";

import Link from "next/link";
import {
  Check,
  ClipboardCheck,
  CreditCard,
  FilePlus,
  Flag,
  type LucideIcon,
} from "lucide-react";

import { PROCUREMENT_VARS } from "@/components/procurement/procurement-hub-nav";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type FlowItem = {
  href: string;
  label: string;
};

const STEP_META: Partial<
  Record<
    string,
    {
      icon: LucideIcon;
      verb: string;
      hint: string;
    }
  >
> = {
  [APP_ROUTES.order]: {
    icon: FilePlus,
    verb: "Create",
    hint: "Build the purchase order",
  },
  [APP_ROUTES.orderReceive]: {
    icon: ClipboardCheck,
    verb: "Confirm",
    hint: "Arrive, then unpack into stock",
  },
  [APP_ROUTES.purchasingRecordPayment]: {
    icon: CreditCard,
    verb: "Pay",
    hint: "Settle the supplier",
  },
};

function bridgeLabel(nextHref: string, nextLabel: string): string {
  const verb = STEP_META[nextHref]?.verb?.toLowerCase();
  if (verb) return `then ${verb}`;
  const first = nextLabel.trim().split(/\s+/)[0]?.toLowerCase();
  return first ? `then ${first}` : "next";
}

function RouteBridge({
  label,
  reached,
  live,
}: {
  label: string;
  reached: boolean;
  live: boolean;
}) {
  return (
    <div className="relative flex h-[3.75rem] items-stretch" aria-hidden>
      <div className="relative flex w-8 shrink-0 justify-center">
        <svg
          viewBox="0 0 24 60"
          className={cn(
            "buying-flow-arrow h-full w-6 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            reached
              ? "text-[var(--pos-primary,#0f766e)]"
              : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]",
            live && reached ? "buying-flow-arrow--live" : null,
          )}
        >
          <line
            className="buying-flow-arrow__shaft"
            x1="12"
            y1="2"
            x2="12"
            y2="44"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 5"
          />
          <path
            d="M5 40 L12 54 L19 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex min-w-0 flex-1 items-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
            reached
              ? "text-[var(--pos-primary,#0f766e)]"
              : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
          )}
        >
          <span
            className={cn(
              "h-px w-5 shrink-0",
              reached
                ? "bg-[var(--pos-primary,#0f766e)]"
                : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_20%,transparent)]",
            )}
          />
          {label}
        </span>
      </div>
    </div>
  );
}

function StationMark({
  index,
  active,
  past,
  Icon,
}: {
  index: number;
  active: boolean;
  past: boolean;
  Icon: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center transition-[background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        active
          ? "bg-[var(--pos-primary,#0f766e)] text-white shadow-[0_6px_16px_-8px_color-mix(in_srgb,var(--pos-primary,#0f766e)_70%,transparent)]"
          : past
            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,white)] text-[var(--pos-primary,#0f766e)]"
            : "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
      )}
      aria-hidden
    >
      {past && !active ? (
        <Check className="size-3.5" strokeWidth={2.5} />
      ) : (
        <Icon className="size-3.5" strokeWidth={2} />
      )}
      <span
        className={cn(
          "absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold leading-none",
          active
            ? "bg-[var(--order-ink,#15231f)] text-white"
            : past
              ? "bg-[var(--pos-primary,#0f766e)] text-white"
              : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,white)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
        )}
      >
        {index + 1}
      </span>
    </span>
  );
}

export function BuyingFlowNav({
  items,
  activeIndex,
  badgeByHref,
}: {
  items: readonly FlowItem[];
  activeIndex: number;
  badgeByHref?: Readonly<Record<string, number>>;
}) {
  const stepCount = items.length;
  const progressIndex = activeIndex < 0 ? 0 : activeIndex;
  const progressLabel =
    activeIndex < 0
      ? `${stepCount} stops`
      : `Stop ${progressIndex + 1} of ${stepCount}`;

  return (
    <ol
      className="buying-flow m-0 list-none overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)_0%,white_42%)] p-0"
      style={PROCUREMENT_VARS}
      aria-label="Buying route"
    >
      <li className="flex items-center justify-between gap-2 border-b border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] px-2.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
          Your route
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
          <span
            className="h-1 w-10 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_16%,transparent)]"
            aria-hidden
          >
            <span
              className="block h-full rounded-full bg-[var(--pos-primary,#0f766e)] transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{
                width: `${Math.max(
                  ((progressIndex + (activeIndex < 0 ? 0 : 1)) / stepCount) *
                    100,
                  12,
                )}%`,
              }}
            />
          </span>
          {progressLabel}
        </span>
      </li>

      {items.map((item, itemIndex) => {
        const active = activeIndex === itemIndex;
        const past = activeIndex > itemIndex;
        const next = items[itemIndex + 1];
        const badge = badgeByHref?.[item.href] ?? 0;
        const meta = STEP_META[item.href];
        const Icon = meta?.icon ?? FilePlus;
        const live = active;

        return (
          <li key={item.href} className="flex flex-col px-2">
            <Link
              href={item.href}
              title={meta?.hint ? `${item.label}: ${meta.hint}` : item.label}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "group relative mt-1.5 grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-2.5 rounded-md px-1 py-1.5 outline-none transition-[background-color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                "focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/35",
                "active:scale-[0.985]",
                active
                  ? "bg-white shadow-[0_1px_0_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent),0_10px_24px_-18px_color-mix(in_srgb,var(--pos-primary,#0f766e)_55%,transparent)]"
                  : "hover:bg-white/75",
              )}
            >
              <StationMark
                index={itemIndex}
                active={active}
                past={past}
                Icon={Icon}
              />
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-[13px] leading-snug tracking-[-0.015em]",
                      active
                        ? "font-semibold text-[var(--order-ink,#15231f)]"
                        : past
                          ? "font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_72%,transparent)]"
                          : "font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] group-hover:text-[var(--order-ink,#15231f)]",
                    )}
                  >
                    {item.label}
                  </span>
                  {badge > 0 ? (
                    <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-bold leading-none text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                {meta?.hint ? (
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[10px] leading-tight transition-colors duration-150",
                      active
                        ? "text-[var(--pos-primary,#0f766e)]"
                        : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]",
                    )}
                  >
                    {meta.hint}
                  </span>
                ) : null}
              </span>
            </Link>

            {next ? (
              <RouteBridge
                label={bridgeLabel(next.href, next.label)}
                reached={past || active}
                live={live}
              />
            ) : (
              <div
                className="mb-2 mt-1 flex items-center gap-2 px-1 pb-1"
                aria-hidden
              >
                <div className="flex w-8 justify-center">
                  <Flag
                    className={cn(
                      "size-3.5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                      past || active
                        ? "text-[var(--pos-primary,#0f766e)]"
                        : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)]",
                    )}
                    strokeWidth={2}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-[0.1em] uppercase",
                    past || active
                      ? "text-[var(--pos-primary,#0f766e)]"
                      : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
                  )}
                >
                  done
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
