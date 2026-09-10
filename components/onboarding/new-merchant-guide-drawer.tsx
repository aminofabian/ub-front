"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Layers,
  PackagePlus,
  ScanBarcode,
  ShoppingCart,
  Truck,
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
import { APP_ROUTES } from "@/lib/config";
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

function WelcomeBody() {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {MINI_STEPS.map((step, index) => (
          <div
            key={step.title}
            className="flex min-h-12 items-start gap-3 rounded-2xl border border-[#E8E4DC] bg-white p-3.5"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0D9488]">
              <step.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[13px] font-semibold tracking-tight text-[#1F2937]">
                <span className="mr-1.5 tabular-nums text-[#9CA3AF]">
                  {index + 1}.
                </span>
                {step.title}
              </p>
              <p className="text-[12px] leading-relaxed text-[#6B7280]">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#99F6E4]/80 bg-[#F0FDFA] px-3.5 py-3 text-[12px] leading-relaxed text-[#134E4A]">
        <span className="font-semibold">Tip:</span> selling the same brand in
        several sizes (Coca-Cola → 300 ml, 500 ml, 1 L)? Use a{" "}
        <span className="font-semibold">Group</span> with variants so the till
        and your storefront stay tidy.
      </div>
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
}: {
  busy: boolean;
  onAddProduct: () => void;
  onAddSupplier?: () => void;
  onOpenTill?: () => void;
  onReadGuide: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={onAddProduct}
        className="h-12 w-full gap-1.5 rounded-2xl bg-[#0D9488] text-white shadow-none hover:bg-[#0F766E] sm:h-9 sm:rounded-md"
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
                "h-12 w-full gap-1.5 rounded-2xl shadow-none sm:h-9 sm:rounded-md",
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
                "h-12 w-full gap-1.5 rounded-2xl shadow-none sm:h-9 sm:rounded-md",
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
          className="h-11 w-full gap-1.5 rounded-2xl shadow-none sm:h-9 sm:rounded-md"
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
          className="h-11 w-full rounded-2xl text-muted-foreground shadow-none hover:text-foreground sm:h-9 sm:rounded-md"
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

  const description = `${shopName} is ready. Add a product, a supplier if you buy from one, then ring a sale at the till.`;

  if (desktop) {
    return (
      <FormDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) onDismiss();
          else onOpenChange(next);
        }}
        title="Welcome to your shop"
        description={description}
        contextLabel="Getting started"
        appearance="sharp"
        icon={<PackagePlus className="size-5 text-primary" aria-hidden />}
        footer={
          <WelcomeActions
            busy={busy}
            onAddProduct={onAddProduct}
            onAddSupplier={onAddSupplier}
            onOpenTill={onOpenTill}
            onReadGuide={onReadGuide}
            onDismiss={onDismiss}
          />
        }
      >
        <WelcomeBody />
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
          "gap-0 bg-[#FBF9F5] p-0",
          "max-h-[min(92dvh,40rem)]",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#D1D5DB]" aria-hidden />
        <div className="space-y-1 px-5 pb-3 pt-4">
          <DialogTitle className="text-[1.35rem] font-semibold tracking-tight text-[#1F2937]">
            Welcome to your shop
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-[#6B7280]">
            {description}
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          <WelcomeBody />
        </div>
        <div className="border-t border-[#E8E4DC] bg-white/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <WelcomeActions
            busy={busy}
            onAddProduct={onAddProduct}
            onAddSupplier={onAddSupplier}
            onOpenTill={onOpenTill}
            onReadGuide={onReadGuide}
            onDismiss={onDismiss}
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

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          // Only brand-new shops (questionnaire completed) with an empty catalog.
          const state = getOnboardingQuestionnaireState();
          if (state.status !== "completed" || readDismissed(businessId)) {
            return;
          }
          const stats = await fetchCatalogListStats(undefined);
          const total = stats.parents + stats.variants + stats.standalones;
          if (total > 0 || cancelled) return;
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
  }, [businessId]);

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
    router.push(APP_ROUTES.cashier);
  }, [businessId, router]);

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
    />
  );
}
