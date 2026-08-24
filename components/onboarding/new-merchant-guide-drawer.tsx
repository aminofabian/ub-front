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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/form-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { fetchCatalogListStats } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import {
  getOnboardingQuestionnaireState,
} from "@/lib/onboarding-questionnaire";

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

/**
 * One-shot welcome drawer for freshly onboarded shops whose catalog is still
 * empty. Serves the "add products" guide and jumps straight into the create
 * drawer. Dismissal is remembered per business in localStorage.
 */
export function NewMerchantGuideDrawer() {
  const router = useRouter();
  const { business } = useDashboard();
  const businessId = business?.id?.trim() || "no-business";

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
          const total =
            stats.parents + stats.variants + stats.standalones;
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
    // `onboarding=create-product` already opens the create drawer on Products.
    router.push(`${APP_ROUTES.products}?onboarding=create-product`);
  }, [businessId, router]);

  const goReadGuide = useCallback(() => {
    writeDismissed(businessId);
    setOpen(false);
    window.open(APP_ROUTES.helpAddProducts, "_blank", "noopener,noreferrer");
  }, [businessId]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Welcome to your shop"
      description={`${business?.name?.trim() || "Your shop"} is ready — add a few products and you can start selling at the till and online.`}
      contextLabel="Getting started"
      appearance="sharp"
      icon={
        <PackagePlus className="size-5 text-primary" aria-hidden />
      }
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={goAddProduct}
            className="h-9 w-full gap-1.5 shadow-none"
          >
            <PackagePlus className="size-3.5" aria-hidden />
            Add your first product
            {!busy ? (
              <ArrowRight className="size-3.5 opacity-70" aria-hidden />
            ) : null}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={goReadGuide}
              className="h-9 w-full gap-1.5 shadow-none"
            >
              <BookOpen className="size-3.5" aria-hidden />
              Read the guide
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={close}
              className="h-9 w-full text-muted-foreground shadow-none hover:text-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          {MINI_STEPS.map((step, index) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-none border border-border bg-muted/20 p-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-background text-foreground/60">
                <step.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[13px] font-semibold tracking-tight text-foreground">
                  <span className="mr-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step.title}
                </p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-none border border-primary/25 bg-primary/6 px-3 py-2.5 text-[12px] leading-relaxed text-foreground/80">
          <span className="font-semibold text-primary">Tip:</span> selling the
          same brand in several sizes (Coca-Cola → 300 ml, 500 ml, 1 L)? Use a{" "}
          <span className="font-semibold">Group</span> with variants so the till
          and your storefront stay tidy.
        </div>
      </div>
    </FormDrawer>
  );
}
