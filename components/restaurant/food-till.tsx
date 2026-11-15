"use client";

import { ChefHat, LayoutGrid, Lock, LogOut, Moon, Store, Sun, UtensilsCrossed, BookOpenText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CounterScreen } from "@/app/(dashboard)/restaurant/counter/_components/counter-screen";
import { useOptionalPosTillLock } from "@/components/auth/pos-till-lock";
import { DashboardAccessDenied } from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { SetupRequirementHost } from "@/components/setup/setup-requirement-host";
import { logoutRemoteAndRedirectToLogin } from "@/lib/api";
import { getBusinessStoreTypes, isTableServiceBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import {
  COUNTER_VOICES,
  defaultFoodTillLights,
  foodTillKind,
  nairobiClock,
  nairobiHour,
  readFoodTillLights,
  type FoodTillLights,
} from "@/lib/food-till";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const RAIL_LINK =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[2px] px-3 text-sm font-medium text-[var(--till-rail-muted)] " +
  "transition-colors duration-200 hover:text-[var(--till-rail-ink)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--till-mark)]";
const RAIL_ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] text-[var(--till-rail-muted)] transition-colors duration-200 " +
  "hover:text-[var(--till-rail-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--till-mark)]";

/**
 * The cashier page of a restaurant, bar, café or takeaway. A shop with shelves gets a barcode
 * till here; a house that cooks or pours gets its counter instead, with nothing around it but
 * a rail: where you are, the other rooms of the house, the time, the lights, the lock.
 *
 * The house (restaurant, bar, café, takeaway) picks the words and the ink. The lights are a
 * switch: a bar starts with them down, any house can turn them down at night, and the choice is
 * kept on the device.
 */
export function FoodTill() {
  const { business, me, branches, branchId } = useDashboard();
  const tillLock = useOptionalPosTillLock();
  const house = foodTillKind(getBusinessStoreTypes(business));
  const voice = COUNTER_VOICES[house];
  const tables = isTableServiceBusiness(business);
  const lightsKey = `kiosk.food-till.lights.${business?.id ?? "shop"}`;

  // Until the device is asked, draw the lights a server would guess: day. The real choice
  // follows at once, so nothing hydrates differently from what was sent.
  const [lights, setLights] = useState<FoodTillLights>("day");
  const [clock, setClock] = useState("");

  useEffect(() => {
    let saved: FoodTillLights | null = null;
    try {
      saved = readFoodTillLights(window.localStorage.getItem(lightsKey));
    } catch {
      // Storage refused; follow the house and the hour.
    }
    setLights(saved ?? defaultFoodTillLights(house, nairobiHour(new Date())));
  }, [lightsKey, house]);

  useEffect(() => {
    const tick = () => setClock(nairobiClock(new Date()));
    tick();
    const timer = window.setInterval(tick, 20_000);
    return () => window.clearInterval(timer);
  }, []);

  function switchLights() {
    const next: FoodTillLights = lights === "night" ? "day" : "night";
    setLights(next);
    try {
      window.localStorage.setItem(lightsKey, next);
    } catch {
      // Not remembered; it still switches.
    }
  }

  const shopName = business?.branding?.displayName?.trim() || business?.name?.trim() || "";
  const branchName = branches.find((b) => b.id === branchId)?.name ?? "";
  const canSell = hasPermission(me?.permissions, Permission.SalesSell);
  const canManageMenu = hasPermission(me?.permissions, Permission.RestaurantMenuManage);

  return (
    <div
      className={cn("food-till flex h-[100dvh] min-h-screen flex-col", lights === "night" && "dark")}
      data-house={house}
      data-lights={lights}
    >
      <header className="food-till-rail relative z-10 shrink-0">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5 sm:px-4">
          <div className="min-w-0 flex-1 basis-40 py-1">
            <p className="truncate font-serif text-[1.35rem] italic leading-tight">{shopName || voice.till}</p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--till-mark)]">
              {voice.till}
              {branchName ? <span className="font-normal normal-case tracking-normal text-[var(--till-rail-muted)]"> · {branchName}</span> : null}
            </p>
          </div>

          <nav aria-label="The house" className="order-3 -mx-1 flex w-full items-center overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
            <span aria-current="page" className={cn(RAIL_LINK, "border-b-2 border-[var(--till-mark)] text-[var(--till-rail-ink)]")}>
              <UtensilsCrossed className="size-4" aria-hidden /> {house === "bar" ? "Bar" : "Counter"}
            </span>
            {tables ? (
              <Link href={APP_ROUTES.restaurantFloor} className={RAIL_LINK}>
                <LayoutGrid className="size-4" aria-hidden /> {house === "bar" ? "Tables and tabs" : "Floor"}
              </Link>
            ) : null}
            <Link href={APP_ROUTES.restaurantKitchen} className={RAIL_LINK}>
              <ChefHat className="size-4" aria-hidden /> Kitchen
            </Link>
            <Link href={APP_ROUTES.restaurantMenu} className={RAIL_LINK}>
              <BookOpenText className="size-4" aria-hidden /> Menu
            </Link>
          </nav>

          <div className="flex shrink-0 items-center">
            <span className="px-2 font-mono text-lg tabular-nums" aria-label={clock ? `The time is ${clock}` : undefined}>
              {clock}
            </span>
            <button
              type="button"
              className={RAIL_ICON_BUTTON}
              onClick={switchLights}
              aria-pressed={lights === "night"}
              aria-label={lights === "night" ? "Turn the lights up" : "Turn the lights down"}
              title={lights === "night" ? "Lights up" : "Lights down"}
            >
              {lights === "night" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
            </button>
            <Link href={APP_ROUTES.business} className={RAIL_ICON_BUTTON} aria-label="Business" title="Business">
              <Store className="size-5" aria-hidden />
            </Link>
            {tillLock ? (
              <button type="button" className={RAIL_ICON_BUTTON} onClick={() => tillLock.lock({ reason: "manual" })} aria-label="Lock the till" title="Lock the till">
                <Lock className="size-5" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className={RAIL_ICON_BUTTON}
              onClick={() => void logoutRemoteAndRedirectToLogin().catch(() => undefined)}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <SetupRequirementHost />

      <main className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-4 sm:px-4">
        {canSell ? (
          <CounterScreen canManageMenu={canManageMenu} voice={voice} bare />
        ) : (
          <DashboardAccessDenied
            title={voice.till}
            description="You need permission to sell to take orders here."
            backHref={APP_ROUTES.business}
            backLabel="Business"
          />
        )}
      </main>
    </div>
  );
}
