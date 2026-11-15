"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Boxes,
  Coins,
  Layers,
  PackagePlus,
  ScanBarcode,
  QrCode,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDrawer } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchCatalogListStats } from "@/lib/api";
import { isFoodOnlyBusiness, isTableServiceBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { cashierFirstSaleActivateHref } from "@/lib/first-sale-activate";
import { getOnboardingQuestionnaireState } from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "palmart.newMerchantGuideDrawer.v1";

type DismissedRecord = { dismissedAt?: string; businessId?: string };

function readDismissed(businessId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissedRecord;
    if (parsed.businessId && parsed.businessId !== businessId) return false;
    return Boolean(parsed.dismissedAt);
  } catch {
    return false;
  }
}

function writeDismissed(businessId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dismissedAt: new Date().toISOString(),
        businessId,
      }),
    );
  } catch {
    // Storage unavailable (private mode) — the drawer simply shows once per session.
  }
}

const MINI_STEPS = [
  {
    icon: Layers,
    title: "Pick Single or Group",
    body: "One-off item → Single. Same brand in sizes → Group, then add variants.",
  },
  {
    icon: ScanBarcode,
    title: "Set prices & barcodes",
    body: "Buying and sell price, scan or type the barcode — SKU fills itself.",
  },
  {
    icon: Boxes,
    title: "Add stock & packages",
    body: "Opening quantity, or trays/crates via Sell in different units.",
  },
] as const;

/** A restaurant's first hour: the menu, opening for the day, and an order. */
function foodSteps(tables: boolean) {
  return [
    {
      icon: BookOpenText,
      title: "Put your dishes on the menu",
      body: "A name and a price is enough to sell. Headings, a line about each dish and pictures can wait.",
    },
    {
      icon: Coins,
      title: "Open for the day",
      body: "Before the first payment, count the cash in the drawer (0 is fine). The floor and the counter ask you when it has not been done.",
    },
    {
      icon: UtensilsCrossed,
      title: "Take an order",
      body: tables
        ? "On the floor, tap a table and add dishes; the bill is paid when they finish. At the counter, ring and take payment at once."
        : "At the counter, tap the dishes, take payment and call out the order number.",
    },
  ];
}

type FoodWelcome = { tables: boolean; onFirstOrder: () => void; onMenu: () => void; onQr: () => void };

function WelcomeBody({ food }: { food?: FoodWelcome | null }) {
  if (food) {
    return (
      <div>
        <ol className="divide-y divide-[rgba(18,26,22,0.1)] border-y border-[rgba(18,26,22,0.1)]">
          {foodSteps(food.tables).map((step, index) => (
            <li key={step.title} className="flex items-start gap-4 py-3.5">
              <span className="w-6 shrink-0 text-center font-serif text-[1.9rem] font-medium leading-none tabular-nums text-[#1D4B3B]" aria-hidden>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#121A16]">{step.title}</p>
                <p className="text-[13px] leading-relaxed text-[#556159]">{step.body}</p>
              </div>
              <step.icon className="mt-1 size-4 shrink-0 text-[#626D66]" strokeWidth={1.75} aria-hidden />
            </li>
          ))}
        </ol>
        <p className="pt-3.5 text-[13px] leading-relaxed text-[#2A332E]">
          <span className="font-semibold text-[#121A16]">Later:</span> put the menu on your web page, print it, or
          print a QR code customers scan to read it. All three are on the Menu page.
        </p>
      </div>
    );
  }
  return (
    <div>
      {/* The order matters here, so the numerals are the structure. */}
      <ol className="divide-y divide-[rgba(18,26,22,0.1)] border-y border-[rgba(18,26,22,0.1)]">
        {MINI_STEPS.map((step, index) => (
          <li key={step.title} className="flex items-start gap-4 py-3.5">
            <span
              className="w-6 shrink-0 text-center font-serif text-[1.9rem] font-medium leading-none tabular-nums text-[#1D4B3B]"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#121A16]">
                {step.title}
              </p>
              <p className="text-[13px] leading-relaxed text-[#556159]">
                {step.body}
              </p>
            </div>
            <step.icon
              className="mt-1 size-4 shrink-0 text-[#626D66]"
              strokeWidth={1.75}
              aria-hidden
            />
          </li>
        ))}
      </ol>

      <p className="pt-3.5 text-[13px] leading-relaxed text-[#2A332E]">
        <span className="font-semibold text-[#121A16]">Tip:</span> selling the
        same brand in several sizes (Coca-Cola → 300 ml, 500 ml, 1 L)? Use a{" "}
        <span className="font-semibold text-[#121A16]">Group</span> with
        variants so the till and your storefront stay tidy.
      </p>
    </div>
  );
}

function WelcomeActions({
  busy,
  onAddProduct,
  onAddSupplier,
  onOpenTill,
  onReadGuide,
  onDismiss,
  food,
}: {
  busy: boolean;
  onAddProduct: () => void;
  onAddSupplier?: () => void;
  onOpenTill?: () => void;
  onReadGuide: () => void;
  onDismiss: () => void;
  food?: FoodWelcome | null;
}) {
  if (food) {
    const outline = "h-12 w-full gap-1.5 rounded-[2px] shadow-none sm:h-10";
    return (
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={food.onFirstOrder}
          className="h-12 w-full gap-1.5 rounded-[2px] bg-[#1D4B3B] text-[#F4F1EA] shadow-none hover:bg-[#163B2E] sm:h-10"
        >
          <UtensilsCrossed className="size-3.5" aria-hidden />
          Take your first order
          <ArrowRight className="size-3.5 opacity-70" aria-hidden />
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={food.onMenu} className={outline}>
            <BookOpenText className="size-3.5" aria-hidden />
            Add to the menu
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={food.onQr} className={outline}>
            <QrCode className="size-3.5" aria-hidden />
            QR codes
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onDismiss}
          className="h-11 w-full rounded-[2px] text-muted-foreground shadow-none hover:text-foreground sm:h-10"
        >
          Not now
        </Button>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={onAddProduct}
        className="h-12 w-full gap-1.5 rounded-[2px] bg-[#1D4B3B] text-[#F4F1EA] shadow-none hover:bg-[#163B2E] sm:h-10"
      >
        <PackagePlus className="size-3.5" aria-hidden />
        Add your first product
        {!busy ? (
          <ArrowRight className="size-3.5 opacity-70" aria-hidden />
        ) : null}
      </Button>
      {onAddSupplier || onOpenTill ? (
        <div className="grid grid-cols-2 gap-2">
          {onAddSupplier ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onAddSupplier}
              className={cn(
                "h-12 w-full gap-1.5 rounded-[2px] shadow-none sm:h-10",
                !onOpenTill && "col-span-2",
              )}
            >
              <Truck className="size-3.5" aria-hidden />
              Add a supplier
            </Button>
          ) : null}
          {onOpenTill ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onOpenTill}
              className={cn(
                "h-12 w-full gap-1.5 rounded-[2px] shadow-none sm:h-10",
                !onAddSupplier && "col-span-2",
              )}
            >
              <ShoppingCart className="size-3.5" aria-hidden />
              Open the till
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onReadGuide}
          className="h-11 w-full gap-1.5 rounded-[2px] shadow-none sm:h-10"
        >
          <BookOpen className="size-3.5" aria-hidden />
          Read the guide
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onDismiss}
          className="h-11 w-full rounded-[2px] text-muted-foreground shadow-none hover:text-foreground sm:h-10"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

export function NewMerchantWelcomeSheet({
  open,
  onOpenChange,
  shopName,
  busy = false,
  onAddProduct,
  onAddSupplier,
  onOpenTill,
  onReadGuide,
  onDismiss,
  food = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopName: string;
  busy?: boolean;
  onAddProduct: () => void;
  onAddSupplier?: () => void;
  onOpenTill?: () => void;
  onReadGuide: () => void;
  onDismiss: () => void;
  /** A restaurant, café or bar gets its own three steps: menu, open for the day, an order. */
  food?: FoodWelcome | null;
}) {
  const [desktop, setDesktop] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(min-width: 640px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const title = food ? "You are set up" : "Welcome to your shop";
  const description = food
    ? `${shopName} is ready. Three things stand between you and the first order.`
    : `${shopName} is ready. Add a product, a supplier if you buy from one, then ring a sale at the till.`;

  if (desktop) {
    return (
      <FormDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) onDismiss();
          else onOpenChange(next);
        }}
        title={title}
        description={description}
        contextLabel="Getting started"
        appearance="sharp"
        icon={
          food ? (
            <UtensilsCrossed className="size-5 text-primary" aria-hidden />
          ) : (
            <PackagePlus className="size-5 text-primary" aria-hidden />
          )
        }
        footer={
          <WelcomeActions
            busy={busy}
            onAddProduct={onAddProduct}
            onAddSupplier={onAddSupplier}
            onOpenTill={onOpenTill}
            onReadGuide={onReadGuide}
            onDismiss={onDismiss}
            food={food}
          />
        }
      >
        <WelcomeBody food={food} />
      </FormDrawer>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
        else onOpenChange(next);
      }}
    >
      <DialogContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "gap-0 rounded-t-[2px] bg-[#FCFAF5] p-0",
          "max-h-[min(92dvh,40rem)]",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#C9C3B5]" aria-hidden />
        <div className="space-y-1 px-5 pb-3 pt-4">
          <DialogTitle className="text-balance font-serif text-[1.9rem] font-medium leading-[1.05] text-[#121A16]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-[#556159]">
            {description}
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          <WelcomeBody food={food} />
        </div>
        <div className="border-t border-[rgba(18,26,22,0.1)] bg-[#FCFAF5] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <WelcomeActions
            busy={busy}
            onAddProduct={onAddProduct}
            onAddSupplier={onAddSupplier}
            onOpenTill={onOpenTill}
            onReadGuide={onReadGuide}
            onDismiss={onDismiss}
            food={food}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One-shot welcome drawer for freshly onboarded shops whose catalog is still
 * empty. Serves the "add products" guide and jumps straight into the create
 * drawer. Dismissal is remembered per business in localStorage.
 */
export function NewMerchantGuideDrawer() {
  const router = useRouter();
  const { business } = useDashboard();
  const businessId = business?.id?.trim() || "no-business";
  const shopName = business?.name?.trim() || "Your shop";

  const foodOnly = isFoodOnlyBusiness(business);
  const foodTables = foodOnly && isTableServiceBusiness(business);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const onboardingCompletedAt = business?.onboarding?.completedAt ?? null;
  const onboardingDismissedAt = business?.onboarding?.dismissedAt ?? null;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          // Configured shops still missing stock (incl. legacy "completed" empty).
          const state = getOnboardingQuestionnaireState();
          const awaitingStock =
            state.status === "completed" ||
            (state.status === "active" &&
              state.step >= 8);
          if (!awaitingStock || readDismissed(businessId)) {
            return;
          }
          // The guide is for fresh shops. Once onboarding was dismissed (or
          // finished months ago) it can never fire again, so skip the catalog
          // aggregation that only exists to prove the catalog is still empty.
          if (onboardingDismissedAt) return;
          const completedAt = onboardingCompletedAt
            ? Date.parse(onboardingCompletedAt)
            : NaN;
          const GUIDE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
          if (
            Number.isFinite(completedAt) &&
            Date.now() - completedAt > GUIDE_MAX_AGE_MS
          ) {
            return;
          }
          if (!foodOnly) {
            // A shop with shelves is welcomed only while the shelves are empty. A restaurant's
            // welcome is about its first order, whatever is in its store room.
            const stats = await fetchCatalogListStats(undefined);
            const total = stats.parents + stats.variants + stats.standalones;
            if (total > 0) return;
          }
          if (cancelled) return;
          if (mountedRef.current) setOpen(true);
        } catch {
          // Offline or API hiccup — never block the dashboard on the welcome drawer.
        }
      })();
    }, 1100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    businessId,
    onboardingCompletedAt,
    onboardingDismissedAt,
    foodOnly,
  ]);

  const close = useCallback(() => {
    writeDismissed(businessId);
    setOpen(false);
  }, [businessId]);

  const goAddProduct = useCallback(() => {
    setBusy(true);
    writeDismissed(businessId);
    setOpen(false);
    router.push(`${APP_ROUTES.products}?onboarding=create-product`);
  }, [businessId, router]);

  const goAddSupplier = useCallback(() => {
    writeDismissed(businessId);
    setOpen(false);
    router.push(`${APP_ROUTES.suppliers}?onboarding=create-supplier`);
  }, [businessId, router]);

  const goOpenTill = useCallback(() => {
    writeDismissed(businessId);
    setOpen(false);
    router.push(cashierFirstSaleActivateHref());
  }, [businessId, router]);

  const leaveFor = useCallback(
    (href: string) => {
      writeDismissed(businessId);
      setOpen(false);
      router.push(href);
    },
    [businessId, router],
  );

  const goReadGuide = useCallback(() => {
    writeDismissed(businessId);
    setOpen(false);
    window.open(APP_ROUTES.helpAddProducts, "_blank", "noopener,noreferrer");
  }, [businessId]);

  return (
    <NewMerchantWelcomeSheet
      open={open}
      onOpenChange={setOpen}
      shopName={shopName}
      busy={busy}
      onAddProduct={goAddProduct}
      onAddSupplier={goAddSupplier}
      onOpenTill={goOpenTill}
      onReadGuide={goReadGuide}
      onDismiss={close}
      food={
        foodOnly
          ? {
              tables: foodTables,
              onFirstOrder: () => leaveFor(foodTables ? APP_ROUTES.restaurantFloor : APP_ROUTES.restaurantCounter),
              onMenu: () => leaveFor(APP_ROUTES.restaurantMenu),
              onQr: () => leaveFor(`${APP_ROUTES.restaurantMenu}/qr`),
            }
          : null
      }
    />
  );
}
