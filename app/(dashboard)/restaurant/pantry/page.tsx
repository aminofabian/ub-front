"use client";

import { Warehouse } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardAccessDenied,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiRequestError, postOrderPadItemsBatch } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  fetchPantry,
  planPantryService,
  recordPantryLoss,
  type PantryIngredientRecord,
  type PantryLossReason,
  type PantryPlanRecord,
  type PantryRecord,
} from "@/lib/restaurant-api";
import { CAN_MAKE_LOW } from "@/lib/restaurant-can-make";
import {
  LOSS_REASONS,
  coverText,
  lossReasonLabel,
  lossSentence,
  portionsForDays,
  quantityText,
  servingsOf,
  expiringFirst,
} from "@/lib/restaurant-pantry";
import { cn } from "@/lib/utils";

import { NoBranch } from "../_components/no-branch";

const kes = (n: number) => formatMoney(n, "KES");
const TITLE = "font-serif text-[1.45rem] italic leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]";
const RULE = "border-[color-mix(in_srgb,var(--order-ink,#121A16)_12%,transparent)]";
const MUTED = "text-[color-mix(in_srgb,var(--op-ink,#121A16)_68%,transparent)]";

function day(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00+03:00` : iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
}

function digits(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 5);
}

function decimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  return dot === -1 ? cleaned : `${cleaned.slice(0, dot)}.${cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 3)}`;
}

/**
 * The pantry: what the stock on hand can make, what to use first, what a planned service needs
 * bought, and what was lost — all said in portions.
 */
export default function RestaurantPantryPage() {
  const { me, branchId } = useDashboard();
  const allowed =
    hasPermission(me?.permissions, Permission.RestaurantMenuManage) ||
    hasPermission(me?.permissions, Permission.RestaurantKitchenUpdate);
  const canOrder = hasPermission(me?.permissions, Permission.OrderPadWrite);
  const [pantry, setPantry] = useState<PantryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [losing, setLosing] = useState<PantryIngredientRecord | null>(null);

  // Only the newest request may fill the page: a slow answer for a branch since left is dropped.
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    if (!allowed || !branchId) return;
    const seq = ++loadSeq.current;
    setError(null);
    try {
      const fresh = await fetchPantry(branchId);
      if (seq === loadSeq.current) setPantry(fresh);
    } catch {
      if (seq === loadSeq.current) setError("Could not load the pantry. Check your connection and try again.");
    }
  }, [allowed, branchId]);

  useEffect(() => {
    setPantry(null);
    void load();
  }, [load]);

  const soon = useMemo(() => expiringFirst(pantry?.ingredients ?? []), [pantry]);

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title="Pantry"
        description="You need permission to manage the menu or to work the kitchen."
        backHref={APP_ROUTES.business}
        backLabel="Business"
      />
    );
  }
  if (!branchId) return <NoBranch message="Choose a branch to see what its stock can make." />;

  return (
    <div className={DASHBOARD_MAX_WIDE}>
      <DashboardPageHero
        icon={Warehouse}
        title="Pantry"
        description="What your stock can make, what to use first, and what to buy."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={APP_ROUTES.restaurantMenu}>Menu and recipes</Link>
        </Button>
      </DashboardPageHero>

      {error ? (
        <DashboardLoadError title="Pantry" message={error} onRetry={() => void load()} />
      ) : pantry == null ? (
        <DashboardLoading label="Counting the pantry…" />
      ) : pantry.dishes.length === 0 ? (
        <div className={DASHBOARD_SECTION_SURFACE}>
          <p className="text-sm font-semibold">Nothing to count yet</p>
          <p className={dashboardHintClass()}>
            The pantry works from recipes. Give a dish a recipe — what it is made of, from products you keep in stock —
            and it will show here with how many you can make.
          </p>
          <Button className="mt-3" size="sm" asChild>
            <Link href={APP_ROUTES.restaurantMenu}>Add a recipe</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {soon.length > 0 ? (
            <section aria-label="Use first" className={cn(DASHBOARD_SECTION_SURFACE, "border-[var(--kiosk-highlight,#A55237)]")}>
              <h2 className={TITLE}>Use first</h2>
              <p className={cn("mt-1", dashboardHintClass())}>Stock past its date, or within three days of it.</p>
              <ul className={cn("mt-3 divide-y", RULE)}>
                {soon.map((i) => (
                  <li key={i.itemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className="min-w-0 flex-1 text-sm">
                      {i.expired > 0 ? (
                        <span className="block">
                          <span className="font-medium text-[#8f3f2f]">{quantityText(i.expired, i.unit)} of {i.name} has expired</span>
                          <span className={MUTED}> · write it off so the count is right</span>
                        </span>
                      ) : null}
                      {i.expiringSoon > 0 ? (
                        <span className="block">
                          <span className="font-medium">{quantityText(i.expiringSoon, i.unit)} of {i.name}</span>
                          <span className={MUTED}>
                            {" "}· use by {day(i.firstExpiry)}
                            {i.servingsDish && servingsOf(i, i.expiringSoon) > 0
                              ? ` · about ${servingsOf(i, i.expiringSoon)} × ${i.servingsDish}`
                              : ""}
                          </span>
                        </span>
                      ) : null}
                    </span>
                    {i.expired > 0 ? (
                      <Button variant="outline" size="sm" onClick={() => setLosing(i)}>
                        Write off
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            <section aria-label="What you can make" className={DASHBOARD_SECTION_SURFACE}>
              <h2 className={TITLE}>What you can make</h2>
              <p className={cn("mt-1", dashboardHintClass())}>
                Each dish on its own. Dishes that share an ingredient share its stock, so these do not add up.
              </p>
              <ul className={cn("mt-3 divide-y", RULE)}>
                {pantry.dishes.map((d) => {
                  const cover = coverText(d);
                  const tone = d.canMake <= 0 ? "out" : d.canMake <= CAN_MAKE_LOW ? "low" : "ok";
                  return (
                    <li key={d.menuItemId} className="flex items-baseline gap-3 py-2.5">
                      <span
                        className={cn(
                          "w-14 shrink-0 text-right font-mono text-xl font-semibold tabular-nums",
                          tone === "out" && "text-[#8f3f2f]",
                          tone === "low" && "text-[var(--kiosk-highlight,#A55237)]",
                        )}
                      >
                        {d.canMake}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium">{d.name}</span>
                        <span className={cn("block text-[13px]", MUTED)}>
                          {d.canMake <= 0 ? `Out — needs ${d.limitingIngredient}` : `${d.limitingIngredient} runs out first`}
                          {cover ? ` · ${cover}` : ""}
                          {d.mustUseToday > 0 ? ` · ${Math.min(d.mustUseToday, d.canMake)} only today` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-label="Ingredients" className={DASHBOARD_SECTION_SURFACE}>
              <h2 className={TITLE}>Ingredients</h2>
              <p className={cn("mt-1", dashboardHintClass())}>What is on the shelf, and what it is worth in portions.</p>
              <ul className={cn("mt-3 divide-y", RULE)}>
                {pantry.ingredients.map((i) => (
                  <li key={i.itemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">
                        {i.name} <span className="font-mono text-[13px] font-normal tabular-nums">{quantityText(i.usable, i.unit)}</span>
                      </span>
                      <span className={cn("block text-[13px]", MUTED)}>
                        {i.servingsDish ? `about ${i.servings} × ${i.servingsDish}` : "in no dish on the menu"}
                        {i.dishes.length > 1 ? ` · also in ${i.dishes.length - 1} more` : ""}
                      </span>
                      <span className={cn("block text-[12px]", MUTED)}>
                        {i.lastBoughtAt
                          ? `Last bought ${day(i.lastBoughtAt)}${i.lastSupplier ? ` from ${i.lastSupplier}` : ""}${
                              i.lastUnitCost != null ? ` at ${kes(i.lastUnitCost)}` : ""
                            }`
                          : "No delivery from a supplier on record"}
                      </span>
                    </span>
                    <Button variant="outline" size="sm" disabled={i.usable + i.expired <= 0} onClick={() => setLosing(i)}>
                      Spoiled or damaged
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <PlanSection pantry={pantry} branchId={branchId} canOrder={canOrder} />

          {pantry.losses.length > 0 ? (
            <section aria-label="Lost this week" className={DASHBOARD_SECTION_SURFACE}>
              <h2 className={TITLE}>Lost this week</h2>
              <ul className={cn("mt-3 divide-y", RULE)}>
                {pantry.losses.map((l) => (
                  <li key={`${l.itemId}-${l.reason}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{lossSentence(l)}</span>
                      <span className={MUTED}> · {lossReasonLabel(l.reason)}</span>
                    </span>
                    <span className="font-mono tabular-nums">{kes(l.cost)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      {losing && branchId ? (
        <LossDialog
          ingredient={losing}
          branchId={branchId}
          onClose={() => setLosing(null)}
          onDone={() => {
            setLosing(null);
            void load();
          }}
          onUnsure={() => void load()}
        />
      ) : null}
    </div>
  );
}

/** Portions wanted per dish, turned into what must be bought, and sent to the order pad. */
function PlanSection({ pantry, branchId, canOrder }: { pantry: PantryRecord; branchId: string; canOrder: boolean }) {
  const [portions, setPortions] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<PantryPlanRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState(false);
  const sellers = pantry.dishes.some((d) => d.soldPerDay > 0);

  // The stock has been read again (a loss, a new branch): an answer worked out before is stale.
  useEffect(() => {
    setPlan(null);
    setOrdered(false);
  }, [pantry.asOf]);

  function change(next: Record<string, string>) {
    setPortions(next);
    setPlan(null);
    setOrdered(false);
    setError(null);
  }

  async function workOut() {
    const wanted = Object.entries(portions)
      .map(([menuItemId, value]) => ({ menuItemId, portions: Number(value) }))
      .filter((p) => Number.isInteger(p.portions) && p.portions > 0);
    if (wanted.length === 0) return setError("Type how many of at least one dish you plan to serve.");
    setBusy(true);
    setError(null);
    try {
      setPlan(await planPantryService(branchId, wanted));
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not work that out. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const toBuy = plan?.lines.filter((l) => l.shortfall > 0) ?? [];

  async function addToOrderPad() {
    setBusy(true);
    setError(null);
    try {
      await postOrderPadItemsBatch({
        branchId,
        lines: toBuy.map((l) => ({ itemId: l.itemId, itemName: l.name, quantity: l.shortfall, note: "From the pantry plan" })),
      });
      setOrdered(true);
      toast.success(`${toBuy.length} ${toBuy.length === 1 ? "item" : "items"} added to the order pad`);
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not add to the order pad. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Plan a service" className={DASHBOARD_SECTION_SURFACE}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={TITLE}>Plan a service</h2>
        {sellers ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={dashboardHintClass()}>Fill from usual sales:</span>
            {[1, 3, 7].map((days) => (
              <Button key={days} variant="outline" size="sm" onClick={() => change(portionsForDays(pantry.dishes, days))}>
                {days === 1 ? "1 day" : `${days} days`}
              </Button>
            ))}
          </span>
        ) : null}
      </div>
      <p className={cn("mt-1", dashboardHintClass())}>
        Say how many of each dish you expect to serve. Shared ingredients are added up, then set against your stock.
      </p>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
        {[...pantry.dishes]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((d) => (
            <li key={d.menuItemId}>
              <label className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm">{d.name}</span>
                <input
                  className={dashboardInputClass(false, "h-11 w-20 text-right font-mono")}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label={`Portions of ${d.name}`}
                  value={portions[d.menuItemId] ?? ""}
                  onChange={(e) => change({ ...portions, [d.menuItemId]: digits(e.target.value) })}
                />
              </label>
            </li>
          ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => void workOut()} disabled={busy}>
          {busy && !plan ? "Working it out…" : "What do I need to buy?"}
        </Button>
        {Object.keys(portions).length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => change({})}>
            Clear
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {plan ? (
        <div className={cn("mt-4 border-t pt-3", RULE)}>
          {toBuy.length === 0 ? (
            <p className="text-sm font-medium text-[#1D4B3B]">You have enough of everything for that.</p>
          ) : (
            <>
              <ul className={cn("divide-y", RULE)}>
                {toBuy.map((l) => (
                  <li key={l.itemId} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        Buy {quantityText(l.shortfall, l.unit)} of {l.name}
                      </span>
                      <span className={MUTED}>
                        {" "}· need {quantityText(l.needed, l.unit)}, have {quantityText(l.usable, l.unit)}
                        {l.lastSupplier ? ` · last from ${l.lastSupplier}` : ""}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">{l.estimatedCost != null ? kes(l.estimatedCost) : "no price yet"}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  <span className={MUTED}>{plan.costKnown ? "About" : "At least"} </span>
                  <span className="font-mono text-base font-semibold tabular-nums">{kes(plan.estimatedTotal)}</span>
                  <span className={MUTED}> at the last prices paid</span>
                </p>
                {canOrder ? (
                  ordered ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={APP_ROUTES.inventoryOrderPad}>Open the order pad</Link>
                    </Button>
                  ) : (
                    <Button onClick={() => void addToOrderPad()} disabled={busy}>
                      Add to the order pad
                    </Button>
                  )
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** Writes off an ingredient that spoiled, broke or expired, and says what that is in portions. */
function LossDialog({
  ingredient,
  branchId,
  onClose,
  onDone,
  onUnsure,
}: {
  ingredient: PantryIngredientRecord;
  branchId: string;
  onClose: () => void;
  onDone: () => void;
  /** The write-off may or may not have gone through: read the stock again before a second try. */
  onUnsure: () => void;
}) {
  // Stock already past its date is the usual reason to be here; offer all of it.
  const [quantity, setQuantity] = useState(ingredient.expired > 0 ? String(ingredient.expired) : "");
  const [reason, setReason] = useState<PantryLossReason>(ingredient.expired > 0 ? "EXPIRED" : "SPOILAGE");
  const onShelf = ingredient.usable + ingredient.expired;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = Number(quantity);
  const valid = Number.isFinite(amount) && amount > 0;
  const portions = valid ? servingsOf(ingredient, amount) : 0;

  async function submit() {
    if (!valid) return setError(`How much ${ingredient.name} was lost?`);
    if (amount > onShelf + 1e-9) {
      return setError(`There is only ${quantityText(onShelf, ingredient.unit)} of ${ingredient.name} on the shelf.`);
    }
    setBusy(true);
    setError(null);
    try {
      const done = await recordPantryLoss({ branchId, itemId: ingredient.itemId, quantity: amount, reason });
      toast.success(
        `Written off: ${lossSentence({ ...done, unit: ingredient.unit })}${done.cost != null && done.cost > 0 ? ` · ${kes(done.cost)}` : ""}`,
      );
      onDone();
    } catch (e) {
      // A refusal says why. Anything else may have gone through: the stock is read again, and
      // the person is told to look before sending it a second time.
      if (e instanceof ApiRequestError && e.message) {
        setError(e.message);
      } else {
        onUnsure();
        setError("No answer came back. Close this and check the amount on the shelf before trying again.");
      }
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open || busy ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write off {ingredient.name}</DialogTitle>
          <DialogDescription>
            It comes off your stock and is recorded as a loss. There is {quantityText(onShelf, ingredient.unit)} on the shelf
            {ingredient.expired > 0 ? `, ${quantityText(ingredient.expired, ingredient.unit)} of it past its date` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>How much{ingredient.unit && ingredient.unit !== "each" ? ` (${ingredient.unit})` : ""}</span>
            <input
              className={dashboardInputClass(false, "h-11 w-32 font-mono")}
              inputMode="decimal"
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(decimal(e.target.value))}
            />
          </label>
          <div className="grid gap-1" role="radiogroup" aria-label="What happened">
            <span className={dashboardLabelClass()}>What happened</span>
            <div className="flex flex-wrap gap-1.5">
              {LOSS_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={reason === r.value}
                  onClick={() => setReason(r.value)}
                  className={cn(
                    "min-h-11 rounded-[2px] border px-3 text-sm transition-colors",
                    RULE,
                    reason === r.value &&
                      "border-[var(--pos-primary,#1D4B3B)] bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_8%,transparent)] font-semibold",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {valid && ingredient.servingsDish && portions > 0 ? (
            <p className="text-sm text-[var(--kiosk-highlight,#A55237)]">
              That is about {portions} × {ingredient.servingsDish}
              {ingredient.lastUnitCost != null ? `, around ${kes(amount * ingredient.lastUnitCost)} of stock` : ""}.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Writing off…" : "Write off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
