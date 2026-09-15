"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid, type LucideIcon } from "lucide-react";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { FormDrawer } from "@/components/form-drawer";
import { HUB_BTN, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export type JumpInLink = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Job the shortcut belongs to — used to group the overflow sheet. */
  group?: string;
};

const TILE_EDGE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const TILE_DIVIDE = "divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]";
const TILE_FILL = "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]";

/**
 * The board is always a rectangle: 12 slots divide cleanly into the 3 / 4 / 6
 * columns it runs at. Anything past eleven links folds into the twelfth "All"
 * slot, so the grid never ends on a ragged half-row.
 */
const BOARD_SLOTS = 12;
const INLINE_LIMIT = BOARD_SLOTS - 1;

function groupLinks(links: JumpInLink[]) {
  const groups: { name: string; links: JumpInLink[] }[] = [];
  for (const link of links) {
    const name = link.group ?? "Shortcuts";
    const group = groups.find((candidate) => candidate.name === name);
    if (group) {
      group.links.push(link);
    } else {
      groups.push({ name, links: [link] });
    }
  }
  return groups;
}

function ShortcutRow({ link }: { link: JumpInLink }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={cn(
        HUB_BTN,
        "flex min-h-12 items-center gap-3 px-3 py-2.5",
        "hover:bg-[color-mix(in_srgb,#141414_2.5%,white)]",
        "active:bg-[color-mix(in_srgb,#0f766e_6%,white)]",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center border bg-white text-[#0f766e]",
          TILE_EDGE,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold tracking-[-0.015em] text-[#141414]">
          {link.label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[#6F6F6F]">
          {link.hint}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-[#C8C2B6]" aria-hidden />
    </Link>
  );
}

function ShortcutsSheet({
  links,
  open,
  onOpenChange,
}: {
  links: JumpInLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const groups = useMemo(() => groupLinks(links), [links]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="All shortcuts"
      description={`${links.length} shortcuts, grouped by the job in hand.`}
      headerDensity="compact"
    >
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.name} className="space-y-1.5">
            <HubSectionLabel
              title={group.name}
              meta={String(group.links.length)}
            />
            <div
              className={cn(
                "divide-y border bg-white",
                TILE_DIVIDE,
                TILE_EDGE,
              )}
            >
              {group.links.map((link) => (
                <ShortcutRow key={link.href + link.label} link={link} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </FormDrawer>
  );
}

/**
 * Primary shortcuts as a compact app board: three tiles across on a phone so a
 * whole row is reachable with one thumb, widening to four and six as the screen
 * grows. Tiles carry an icon and a short label; the sheet keeps the rest.
 */
export function JumpInGrid({
  links,
  title = "Jump in",
  meta,
}: {
  links: JumpInLink[];
  title?: string;
  /** Defaults to the shortcut count. */
  meta?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  if (links.length === 0) return null;

  const overflowing = links.length > BOARD_SLOTS;
  const tiles = overflowing ? links.slice(0, INLINE_LIMIT) : links;
  const cells = tiles.length + (overflowing ? 1 : 0);
  const fill = (columns: number) => (columns - (cells % columns)) % columns;

  return (
    <section className="space-y-1.5 border-t border-[color-mix(in_srgb,#141414_7%,transparent)] pt-2.5">
      <HubSectionLabel
        title={title}
        meta={meta ?? `${links.length} shortcuts`}
        className="px-0.5"
      />

      <div
        className={cn(
          HUB_SURFACE,
          "grid grid-cols-3 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] sm:grid-cols-4 xl:grid-cols-6",
        )}
      >
        {tiles.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              title={link.hint}
              className={cn(
                HUB_BTN,
                "group flex min-h-[4.75rem] min-w-0 flex-col justify-between gap-2 bg-white p-2.5",
                "hover:bg-[color-mix(in_srgb,#0f766e_4%,white)]",
                "active:bg-[color-mix(in_srgb,#0f766e_8%,white)]",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]/45",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center border bg-white text-[#0f766e] transition-colors",
                  "group-hover:border-[#0f766e]/45 group-hover:bg-[color-mix(in_srgb,#0f766e_8%,white)]",
                  TILE_EDGE,
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold leading-tight tracking-[-0.015em] text-[#141414]">
                  {link.label}
                </span>
                <span className="mt-0.5 hidden truncate text-[10px] leading-snug text-[#6F6F6F] sm:block">
                  {link.hint}
                </span>
              </span>
            </Link>
          );
        })}

        {overflowing ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={`Show all ${links.length} shortcuts`}
            className={cn(
              HUB_BTN,
              "group flex min-h-[4.75rem] min-w-0 flex-col justify-between gap-2 bg-white p-2.5 text-left",
              "hover:bg-[color-mix(in_srgb,#141414_3%,white)]",
              "active:bg-[color-mix(in_srgb,#141414_6%,white)]",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e]/45",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] text-[#141414]",
                TILE_EDGE,
              )}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold leading-tight tracking-[-0.015em] text-[#141414]">
                All
              </span>
              <span className="mt-0.5 hidden truncate text-[10px] leading-snug text-[#6F6F6F] sm:block">
                All {links.length}
              </span>
            </span>
          </button>
        ) : null}

        {/* Close the last row at each width so the board stays a rectangle. */}
        {Array.from({ length: fill(3) }).map((_, index) => (
          <span
            key={`phone-fill-${index}`}
            aria-hidden
            className={cn("min-h-[4.75rem] sm:hidden", TILE_FILL)}
          />
        ))}
        {Array.from({ length: fill(4) }).map((_, index) => (
          <span
            key={`sm-fill-${index}`}
            aria-hidden
            className={cn(
              "hidden min-h-[4.75rem] sm:block xl:hidden",
              TILE_FILL,
            )}
          />
        ))}
        {Array.from({ length: fill(6) }).map((_, index) => (
          <span
            key={`xl-fill-${index}`}
            aria-hidden
            className={cn("hidden min-h-[4.75rem] xl:block", TILE_FILL)}
          />
        ))}
      </div>

      <ShortcutsSheet
        links={links}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </section>
  );
}
