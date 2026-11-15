"use client";

import { BookOpenText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  createMenuCategory,
  createStation,
  deleteMenuCategory,
  deleteMenuItem,
  deleteModifierGroup,
  fetchDishRecipe,
  fetchMenu,
  fetchOptionRecipe,
  saveDishRecipe,
  saveOptionRecipe,
  setMenuItemAvailable,
  updateMenuCategory,
  updateMenuItem,
  updateStation,
  type MenuItemRecord,
  type MenuRecord,
  type ModifierGroupRecord,
} from "@/lib/restaurant-api";

import { MenuItemDialog } from "./menu-item-dialog";
import { ModifierGroupDialog } from "./modifier-group-dialog";
import { KitchenRequests } from "../../_components/kitchen-requests";

import { PrepSection } from "./prep-section";
import { RecipeDialog } from "./recipe-dialog";
import { SettingsSection } from "./settings-section";

const kes = (n: number) => formatMoney(n, "KES");

type MenuColumn = {
  id: string;
  title: string;
  madeAt: string | null;
  items: MenuItemRecord[];
};

function boardColumns(menu: MenuRecord): MenuColumn[] {
  const stations = new Map(menu.stations.map((s) => [s.id, s.name]));
  const categories = [...menu.categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
  const known = new Set(categories.map((c) => c.id));
  const byHeading = new Map<string, MenuItemRecord[]>();
  const loose: MenuItemRecord[] = [];
  const items = [...menu.items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
  for (const item of items) {
    if (item.categoryId && known.has(item.categoryId)) {
      const list = byHeading.get(item.categoryId) ?? [];
      list.push(item);
      byHeading.set(item.categoryId, list);
    } else {
      loose.push(item);
    }
  }
  const columns = categories.map((c) => ({
    id: c.id,
    title: c.name,
    madeAt: c.stationId ? (stations.get(c.stationId) ?? null) : null,
    items: byHeading.get(c.id) ?? [],
  }));
  if (loose.length > 0) {
    columns.push({
      id: "unheaded",
      title: categories.length > 0 ? "No heading" : "On the menu",
      madeAt: null,
      items: loose,
    });
  }
  return columns.filter((column) => column.items.length > 0);
}

function dishStatus(item: MenuItemRecord): { label: string; tone: "on" | "out" | "off" } {
  if (!item.sellable) return { label: "Not for sale", tone: "off" };
  if (!item.active) return { label: "Off the menu", tone: "off" };
  if (!item.available) return { label: "Run out", tone: "out" };
  return { label: "On", tone: "on" };
}

const SHEET_TITLE =
  "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";

const RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";

const COLUMN_SPAN = {
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  12: "md:col-span-12",
} as const;

type Span = keyof typeof COLUMN_SPAN;

const STATUS_WORD = {
  on: "text-[#1D4B3B]",
  out: "text-[#8f3f2f]",
  off: "text-[color-mix(in_srgb,var(--op-ink,#121A16)_55%,transparent)]",
} as const;

function pairSpans(a: MenuColumn, b: MenuColumn): [Span, Span] {
  if (a.items.length >= b.items.length * 1.6) return [7, 5];
  if (b.items.length >= a.items.length * 1.6) return [5, 7];
  return [6, 6];
}

function trioSpans(columns: MenuColumn[]): Span[] {
  const counts = columns.map((column) => column.items.length);
  const max = Math.max(...counts);
  const heavy = counts.findIndex((count) => count === max);
  const rest = counts.filter((_, index) => index !== heavy);
  if (max >= 4 && rest.every((count) => count * 2 <= max)) {
    return counts.map((count) => (count === max ? 6 : 3));
  }
  return [4, 4, 4];
}

function spreadSpans(columns: MenuColumn[]): Span[] {
  if (columns.length <= 1) return [12];
  const spans: Span[] = [];
  let index = 0;
  while (index < columns.length) {
    const left = columns.length - index;
    if (left === 1) spans.push(12);
    else if (left === 2) spans.push(...pairSpans(columns[index], columns[index + 1]));
    else if (left === 3) spans.push(...trioSpans(columns.slice(index, index + 3)));
    else spans.push(4, 4, 4);
    index += left <= 3 ? left : 3;
  }
  return spans;
}

function columnSeats(spans: Span[]): { span: Span; rowStart: boolean; laterRow: boolean }[] {
  let used = 0;
  let row = 0;
  return spans.map((span) => {
    const rowStart = used === 0;
    const laterRow = row > 0;
    used += span;
    if (used >= 12) {
      used = 0;
      row += 1;
    }
    return { span, rowStart, laterRow };
  });
}

function dishFlow(span: Span): string {
  if (span >= 12) return "sm:columns-2 xl:columns-3 sm:gap-x-10";
  if (span >= 6) return "sm:columns-2 sm:gap-x-8";
  return "";
}

function boardTally(items: MenuItemRecord[]): { on: number; out: number; off: number } {
  const tally = { on: 0, out: 0, off: 0 };
  for (const item of items) tally[dishStatus(item).tone] += 1;
  return tally;
}

function DishRow({
  item,
  madeAt,
  choices,
  busy,
  canManage,
  canMarkRunOut,
  onToggleAvailable,
  onRecipe,
  onEdit,
  onToggleActive,
  onRemove,
}: {
  item: MenuItemRecord;
  madeAt: string;
  choices: string | null;
  busy: boolean;
  canManage: boolean;
  canMarkRunOut: boolean;
  onToggleAvailable: () => void;
  onRecipe: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}) {
  const status = dishStatus(item);
  const price = item.price != null ? kes(item.price) : item.kind === "ITEM" ? "Shelf price" : "—";
  const actions = dishActions({ item, canManage, canMarkRunOut, onToggleAvailable, onRecipe, onEdit, onToggleActive, onRemove });
  return (
    <li className="mb-3.5 break-inside-avoid">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small thumbnail beside the dish
        <img src={item.imageUrl} alt="" loading="lazy" className="float-left mr-2.5 mt-0.5 h-11 w-11 rounded-[2px] object-cover" />
      ) : null}
      <div className="flex items-baseline gap-2">
        <p className={cn("min-w-0 text-[15px] font-medium leading-snug", status.tone === "off" ? STATUS_WORD.off : "text-[var(--op-ink,#121A16)]")}>
          {item.name}
        </p>
        <span aria-hidden className="mb-[0.28em] min-w-3 flex-1 border-b border-dotted border-[color-mix(in_srgb,var(--op-ink,#121A16)_35%,transparent)]" />
        <p className="shrink-0 font-mono text-[13px] tabular-nums">{price}</p>
      </div>
      {item.description ? <p className="mt-0.5 text-[13px] italic leading-snug text-[color-mix(in_srgb,var(--op-ink,#121A16)_72%,transparent)]">{item.description}</p> : null}
      <p className={`mt-1 ${dashboardHintClass()}`}>
        <span className={STATUS_WORD[status.tone]}>{status.label}</span>
        <span> · {item.kind === "DISH" ? "Dish" : "From the shelf"} · {madeAt}</span>
        {choices ? <span> · {choices}</span> : null}
      </p>
      {actions.length > 0 ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={busy}
              onClick={action.onClick}
              className={cn(
                "text-[12px] underline-offset-4 hover:underline disabled:opacity-40",
                action.tone === "danger" ? "text-[#8f3f2f]" : "text-[#1D4B3B]",
              )}
            >
              {action.label}
            </button>
          ))}
        </p>
      ) : null}
    </li>
  );
}

function dishActions(input: {
  item: MenuItemRecord;
  canManage: boolean;
  canMarkRunOut: boolean;
  onToggleAvailable: () => void;
  onRecipe: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}): { label: string; onClick: () => void; tone?: "danger" }[] {
  const { item, canManage, canMarkRunOut, onToggleAvailable, onRecipe, onEdit, onToggleActive, onRemove } = input;
  const actions: { label: string; onClick: () => void; tone?: "danger" }[] = [];
  if (item.kind === "DISH" && canMarkRunOut) {
    actions.push({ label: item.available ? "Run out" : "Back on", onClick: onToggleAvailable });
  }
  if (canManage && item.kind === "DISH") actions.push({ label: "Recipe", onClick: onRecipe });
  if (canManage) {
    actions.push({ label: "Edit", onClick: onEdit });
    actions.push({ label: item.active ? "Take off" : "Put back", onClick: onToggleActive });
    actions.push({ label: "Remove", onClick: onRemove, tone: "danger" });
  }
  return actions;
}

function MenuSheet({
  menu,
  stationName,
  groupName,
  busyId,
  canManage,
  canMarkRunOut,
  run,
  onEdit,
  onRecipe,
}: {
  menu: MenuRecord;
  stationName: Map<string, string>;
  groupName: Map<string, string>;
  busyId: string | null;
  canManage: boolean;
  canMarkRunOut: boolean;
  run: (id: string, action: () => Promise<unknown>, done?: string) => Promise<void>;
  onEdit: (item: MenuItemRecord) => void;
  onRecipe: (item: MenuItemRecord) => void;
}) {
  const columns = boardColumns(menu);
  const seats = columnSeats(spreadSpans(columns));
  const tally = boardTally(menu.items);
  return (
    <div className={DASHBOARD_TABLE_SURFACE}>
      <div className={cn("flex flex-wrap gap-x-4 gap-y-1 border-b px-4 py-2.5 text-[12px] sm:px-5", RULE)}>
        <span className="text-[#1D4B3B]">{tally.on} on</span>
        {tally.out > 0 ? <span className="text-[#8f3f2f]">{tally.out} run out</span> : null}
        {tally.off > 0 ? <span className={STATUS_WORD.off}>{tally.off} off the menu</span> : null}
      </div>
      <div className="md:grid md:grid-cols-12">
        {columns.map((column, index) => {
          const seat = seats[index];
          if (!seat) return null;
          return (
            <section
              key={column.id}
              aria-label={column.title}
              className={cn(
                "px-4 py-5 sm:px-5",
                COLUMN_SPAN[seat.span],
                index > 0 && !seat.laterRow && "border-t md:border-t-0",
                seat.laterRow && "border-t",
                !seat.rowStart && "md:border-l",
                RULE,
              )}
            >
              <header className="mb-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-[1.85rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]">
                    {column.title}
                  </h2>
                  <span className="font-mono text-[12px] tabular-nums text-[color-mix(in_srgb,var(--op-ink,#121A16)_55%,transparent)]">
                    {column.items.length}
                  </span>
                </div>
                <span aria-hidden className="mt-2.5 block h-px w-7 bg-[#1D4B3B]" />
                {column.madeAt ? <p className={`mt-2 ${dashboardHintClass()}`}>Made at {column.madeAt}</p> : null}
              </header>
              <ul className={dishFlow(seat.span)}>
                {column.items.map((item) => (
                  <DishRow
                    key={item.id}
                    item={item}
                    madeAt={
                      item.stationId
                        ? (stationName.get(item.stationId) ?? "Station")
                        : item.kind === "DISH"
                          ? "Kitchen"
                          : "Counter"
                    }
                    choices={
                      item.modifierGroupIds.length === 0
                        ? null
                        : item.modifierGroupIds.map((id) => groupName.get(id) ?? "Choices").join(", ")
                    }
                    busy={busyId === item.id}
                    canManage={canManage}
                    canMarkRunOut={canMarkRunOut}
                    onToggleAvailable={() => void run(item.id, () => setMenuItemAvailable(item.id, !item.available))}
                    onRecipe={() => onRecipe(item)}
                    onEdit={() => onEdit(item)}
                    onToggleActive={() => void run(item.id, () => updateMenuItem(item.id, { active: !item.active }))}
                    onRemove={() => {
                      if (window.confirm(`Remove ${item.name}? Past sales keep it; it just can’t be ordered any more.`)) {
                        void run(item.id, () => deleteMenuItem(item.id), `${item.name} removed`);
                      }
                    }}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** The menu: what is sold, the choices on each dish, the headings and where things are made. */
export function MenuWorkspace({ canManage, canMarkRunOut }: { canManage: boolean; canMarkRunOut: boolean }) {
  const { branchId } = useDashboard();
  const [menu, setMenu] = useState<MenuRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemRecord | "new" | null>(null);
  const [editingGroup, setEditingGroup] = useState<ModifierGroupRecord | "new" | null>(null);
  const [recipeFor, setRecipeFor] = useState<
    { kind: "dish"; id: string; name: string } | { kind: "option"; id: string; name: string } | null
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newHeading, setNewHeading] = useState("");
  const [newStation, setNewStation] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setMenu(await fetchMenu(branchId || null));
    } catch {
      setError("Could not load the menu. Check your connection and try again.");
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stationName = useMemo(() => new Map((menu?.stations ?? []).map((s) => [s.id, s.name] as const)), [menu]);
  const groupName = useMemo(() => new Map((menu?.modifierGroups ?? []).map((g) => [g.id, g.name] as const)), [menu]);

  async function run(id: string, action: () => Promise<unknown>, done?: string) {
    setBusyId(id);
    try {
      await action();
      if (done) toast.success(done);
    } catch {
      // apiRequest has already shown what went wrong
    } finally {
      setBusyId(null);
      await load();
    }
  }

  if (error) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoadError title="Menu" message={error} onRetry={() => void load()} />
      </div>
    );
  }
  if (menu == null) {
    return (
      <div className={DASHBOARD_MAX}>
        <DashboardLoading label="Loading the menu…" />
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX, "gap-6")}>
      <DashboardPageHero icon={BookOpenText} title="Menu" description="What you sell, the choices on each dish and where it is made.">
        {menu.items.length > 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`${APP_ROUTES.restaurantMenu}/print`}>Print the menu</Link>
          </Button>
        ) : null}
        {canManage ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`${APP_ROUTES.restaurantMenu}/qr`}>QR codes</Link>
          </Button>
        ) : null}
        {canManage ? (
          <Button size="sm" onClick={() => setEditingItem("new")}>
            Add to the menu
          </Button>
        ) : null}
      </DashboardPageHero>

      {menu.items.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Add your first dish</p>
          <p className={dashboardHintClass()}>
            Chips, a burger, a cup of tea — anything you make to order, with the price you charge. Bottled
            drinks and other shelf products can be put on the menu too, and still come off your stock.
          </p>
          {canManage ? (
            <Button className="mt-3" size="sm" onClick={() => setEditingItem("new")}>
              Add to the menu
            </Button>
          ) : null}
        </div>
      ) : (
        <MenuSheet menu={menu} stationName={stationName} groupName={groupName} busyId={busyId} canManage={canManage} canMarkRunOut={canMarkRunOut} run={run} onEdit={(item) => setEditingItem(item)} onRecipe={(item) => setRecipeFor({ kind: "dish", id: item.id, name: item.name })} />
      )}

      {canManage ? (
        <div className={cn(DASHBOARD_TABLE_SURFACE, "md:grid md:grid-cols-12")}>
          <section className="p-4 sm:p-5 md:col-span-6" aria-label="Choices">
            <div className="flex items-center justify-between gap-2">
              <h2 className={SHEET_TITLE}>Choices on a dish</h2>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditingGroup("new")}>
                Add choices
              </Button>
            </div>
            {menu.modifierGroups.length === 0 ? (
              <p className={dashboardHintClass()}>
                Single or double, extra cheese, which sauce. Add a set of choices, then tick it on the dishes
                that offer it.
              </p>
            ) : (
              <ul className="mt-1 divide-y">
                {menu.modifierGroups.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-start gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{g.name}</div>
                      <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        {g.options.map((o) => (
                          <li key={o.id} className={dashboardHintClass()}>
                            {o.priceDelta > 0 ? `${o.name} (+${kes(o.priceDelta)})` : o.name}{" "}
                            <button
                              type="button"
                              className="underline"
                              onClick={() => setRecipeFor({ kind: "option", id: o.id, name: `${g.name}: ${o.name}` })}
                            >
                              ingredients
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingGroup(g)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === g.id}
                      onClick={() => {
                        if (window.confirm(`Remove ${g.name}? Dishes that offer it will stop offering it.`)) {
                          void run(g.id, () => deleteModifierGroup(g.id), `${g.name} removed`);
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cn("border-t p-4 sm:p-5 md:col-span-3 md:border-t-0 md:border-l", RULE)} aria-label="Headings">
            <h2 className={SHEET_TITLE}>Headings</h2>
            <p className={dashboardHintClass()}>Mains, Drinks, Snacks. A heading can send everything under it to one station.</p>
            <ul className="mt-1 divide-y">
              {menu.categories.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 text-sm font-medium">{c.name}</span>
                  {menu.stations.length > 0 ? (
                    <select
                      className={dashboardSelectClass(false, "w-36")}
                      aria-label={`Station for ${c.name}`}
                      value={c.stationId ?? ""}
                      disabled={busyId === c.id}
                      onChange={(e) =>
                        void run(c.id, () => updateMenuCategory(c.id, { name: c.name, stationId: e.target.value }))
                      }
                    >
                      <option value="">Kitchen</option>
                      {menu.stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => {
                      if (window.confirm(`Remove the heading ${c.name}? Its dishes stay on the menu.`)) {
                        void run(c.id, () => deleteMenuCategory(c.id));
                      }
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="mt-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newHeading.trim();
                if (!name) return;
                void run("new-heading", () => createMenuCategory({ name })).then(() => setNewHeading(""));
              }}
            >
              <input
                className={dashboardInputClass(false, "flex-1")}
                aria-label="New heading"
                placeholder="New heading"
                maxLength={120}
                value={newHeading}
                onChange={(e) => setNewHeading(e.target.value)}
              />
              <Button type="submit" variant="outline" size="sm" disabled={busyId === "new-heading" || !newHeading.trim()}>
                Add
              </Button>
            </form>

          </section>

          <section className={cn("border-t p-4 sm:p-5 md:col-span-3 md:border-t-0 md:border-l", RULE)} aria-label="Kitchen stations">
            <h2 className={SHEET_TITLE}>Kitchen stations</h2>
            <p className={dashboardHintClass()}>
              Only needed if food and drink are made in different places — a hot kitchen and a bar, say. With
              none, everything goes to one kitchen screen.
            </p>
            <ul className="mt-1 divide-y">
              {menu.stations.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className={`min-w-0 flex-1 text-sm font-medium ${s.active ? "" : "line-through opacity-60"}`}>{s.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === s.id}
                    onClick={() => void run(s.id, () => updateStation(s.id, { name: s.name, active: !s.active }))}
                  >
                    {s.active ? "Switch off" : "Switch on"}
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="mt-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newStation.trim();
                if (!name) return;
                void run("new-station", () => createStation(name)).then(() => setNewStation(""));
              }}
            >
              <input
                className={dashboardInputClass(false, "flex-1")}
                aria-label="New station"
                placeholder="New station"
                maxLength={80}
                value={newStation}
                onChange={(e) => setNewStation(e.target.value)}
              />
              <Button type="submit" variant="outline" size="sm" disabled={busyId === "new-station" || !newStation.trim()}>
                Add
              </Button>
            </form>
          </section>
        </div>
      ) : null}

      {canManage || canMarkRunOut ? (
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className={canManage ? "lg:col-span-7" : "lg:col-span-12"}>
            <PrepSection canManage={canManage} />
          </div>
          {canManage ? (
            <div className="lg:col-span-5">
              <SettingsSection />
            </div>
          ) : null}
          <div className="lg:col-span-12">
            <KitchenRequests />
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <MenuItemDialog
          item={editingItem === "new" ? null : editingItem}
          menu={menu}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            setEditingItem(null);
            await load();
          }}
        />
      ) : null}
      {recipeFor ? (
        <RecipeDialog
          key={`${recipeFor.kind}-${recipeFor.id}`}
          title={`Recipe: ${recipeFor.name}`}
          description={
            recipeFor.kind === "dish"
              ? "What one portion is made of. It comes off your stock each time the dish is sold."
              : "What this choice adds to a dish — a double patty uses one more patty."
          }
          load={() => (recipeFor.kind === "dish" ? fetchDishRecipe(recipeFor.id) : fetchOptionRecipe(recipeFor.id))}
          save={(ingredients) =>
            recipeFor.kind === "dish" ? saveDishRecipe(recipeFor.id, ingredients) : saveOptionRecipe(recipeFor.id, ingredients)
          }
          onClose={() => setRecipeFor(null)}
        />
      ) : null}
      {editingGroup ? (
        <ModifierGroupDialog
          group={editingGroup === "new" ? null : editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={async () => {
            setEditingGroup(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}
