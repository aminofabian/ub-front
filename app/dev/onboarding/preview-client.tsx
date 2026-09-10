"use client";

import { useMemo, useState } from "react";
import { Banknote, Check, Smartphone } from "lucide-react";

import { CatalogEmptyShelf } from "@/app/(dashboard)/products/_components/CatalogEmptyShelf";
import { SupplierWorkspaceEmpty } from "@/app/(dashboard)/suppliers/_components/SupplierWorkspaceEmpty";
import { CashierFirstSaleDrawer } from "@/components/cashier/cashier-first-sale-drawer";
import { FormDrawer } from "@/components/form-drawer";
import { OnboardingCatalogShelf } from "@/components/onboarding/onboarding-catalog-shelf";
import { OnboardingQuestionnaire } from "@/components/onboarding/onboarding-questionnaire";
import { NewMerchantWelcomeSheet } from "@/components/onboarding/new-merchant-guide-drawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  GlobalCategoryRecord,
  GlobalProductRecord,
} from "@/lib/api";
import {
  QUESTIONNAIRE_STEP_COUNT,
  type OnboardingQuestionnaireAnswers,
  type ProductSourceChoice,
} from "@/lib/onboarding-questionnaire";

type Surface =
  | "questionnaire"
  | "catalog"
  | "welcome"
  | "product"
  | "supplier"
  | "till";

function mockProduct(
  id: string,
  name: string,
  price: number,
  extras?: Partial<GlobalProductRecord>,
): GlobalProductRecord {
  return {
    id,
    catalogId: "preview",
    name,
    unitType: "each",
    weighed: false,
    sellable: true,
    stocked: true,
    recommendedSellingPrice: price,
    hasExpiry: false,
    sortOrder: Number(id.replace(/\D/g, "") || 0),
    alreadyImported: false,
    barcode: `6${id.replace(/\D/g, "").padStart(12, "0")}`,
    imageUrl: null,
    ...extras,
  };
}

const MOCK_CATEGORIES: GlobalCategoryRecord[] = [
  { id: "groceries", name: "Groceries", slug: "groceries", position: 1 },
  { id: "dairy", name: "Dairy", slug: "dairy", position: 2 },
  { id: "household", name: "Household", slug: "household", position: 3 },
];

const MOCK_PRODUCTS: GlobalProductRecord[] = [
  mockProduct("p1", "Sugar 2kg", 280, { categoryName: "Groceries" }),
  mockProduct("p2", "Cooking oil 1L", 320, { categoryName: "Groceries" }),
  mockProduct("p3", "Milk 500ml", 75, { categoryName: "Dairy" }),
  mockProduct("p4", "Bread", 70, { categoryName: "Groceries" }),
  mockProduct("p5", "Maize flour 2kg", 190, { categoryName: "Groceries" }),
  mockProduct("p6", "Rice 2kg", 310, { categoryName: "Groceries" }),
  mockProduct("p7", "Tea leaves 250g", 145, { categoryName: "Groceries" }),
  mockProduct("p8", "Soap bar", 55, { categoryName: "Household" }),
  mockProduct("p9", "Tissue 10 pack", 240, { categoryName: "Household" }),
  mockProduct("p10", "Yoghurt 500ml", 120, { categoryName: "Dairy" }),
  mockProduct("p11", "Eggs tray", 450, { categoryName: "Dairy" }),
  mockProduct("p12", "Salt 1kg", 40, { categoryName: "Groceries" }),
];

export function DevOnboardingPreview() {
  const [surface, setSurface] = useState<Surface>("questionnaire");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<
    Partial<OnboardingQuestionnaireAnswers>
  >({
    onlineStore: "yes",
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, GlobalProductRecord>>(
    () => new Map(MOCK_PRODUCTS.slice(0, 4).map((p) => [p.id, p])),
  );
  const [parentFilter, setParentFilter] = useState<
    | { kind: "all" }
    | { kind: "pack"; packId: string; packName: string }
    | { kind: "category"; categoryId: string }
  >({ kind: "pack", packId: "pack-1", packName: "Mini mart starter" });
  const [storefrontVisible, setStorefrontVisible] = useState(true);
  const [manifestOpen, setMobileManifestOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(true);
  const [createSupplierOpen, setCreateSupplierOpen] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(true);

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PRODUCTS.filter((product) => {
      if (
        parentFilter.kind === "category" &&
        product.categoryName?.toLowerCase() !==
          MOCK_CATEGORIES.find((c) => c.id === parentFilter.categoryId)?.name.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return product.name.toLowerCase().includes(q);
    });
  }, [parentFilter, search]);

  const shelfSelectable = products.filter((p) => !p.alreadyImported);
  const allShelfSelected =
    shelfSelectable.length > 0 &&
    shelfSelectable.every((p) => selected.has(p.id));

  if (surface === "catalog") {
    return (
      <div className="relative min-h-dvh">
        <OnboardingCatalogShelf
          currency="KES"
          categories={MOCK_CATEGORIES}
          packFilter={{ packId: "pack-1", packName: "Mini mart starter" }}
          parentFilter={parentFilter}
          onParentFilterChange={setParentFilter}
          search={search}
          onSearchChange={setSearch}
          products={products}
          selected={selected}
          onToggleProduct={(product) => {
            setSelected((prev) => {
              const next = new Map(prev);
              if (next.has(product.id)) next.delete(product.id);
              else next.set(product.id, product);
              return next;
            });
          }}
          onRemoveSelected={(id) => {
            setSelected((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
          }}
          onClearSelected={() => setSelected(new Map())}
          onSelectAllOnShelf={() => {
            setSelected((prev) => {
              const next = new Map(prev);
              for (const product of shelfSelectable) next.set(product.id, product);
              return next;
            });
          }}
          onClearShelfSelection={() => {
            setSelected((prev) => {
              const next = new Map(prev);
              for (const product of shelfSelectable) next.delete(product.id);
              return next;
            });
          }}
          allShelfSelected={allShelfSelected}
          shelfSelectableCount={shelfSelectable.length}
          storefrontVisible={storefrontVisible}
          onStorefrontVisibleChange={setStorefrontVisible}
          shelfCountLabel={`Shelf ${products.length} · Mini mart starter`}
          canAdopt
          onImport={() => setSurface("welcome")}
          onClose={() => setSurface("questionnaire")}
          mobileManifestOpen={manifestOpen}
          onMobileManifestOpenChange={setMobileManifestOpen}
        />
        <PreviewSwitcher surface={surface} onChange={setSurface} />
      </div>
    );
  }

  if (surface === "welcome") {
    return (
      <div className="relative min-h-dvh bg-[#FBF9F5]">
        <NewMerchantWelcomeSheet
          open
          onOpenChange={(next) => {
            if (!next) setSurface("questionnaire");
          }}
          shopName="Sunrise Mini Mart"
          onAddProduct={() => {
            setCreateProductOpen(true);
            setSurface("product");
          }}
          onAddSupplier={() => {
            setCreateSupplierOpen(true);
            setSurface("supplier");
          }}
          onOpenTill={() => {
            setCheckoutOpen(true);
            setSurface("till");
          }}
          onReadGuide={() => setSurface("questionnaire")}
          onDismiss={() => setSurface("questionnaire")}
        />
        <PreviewSwitcher surface={surface} onChange={setSurface} />
      </div>
    );
  }

  if (surface === "product") {
    return (
      <div className="relative min-h-dvh bg-[#FBF9F5] px-4 pt-8">
        <CatalogEmptyShelf
          canCreateNew
          onCreateNew={() => setCreateProductOpen(true)}
        />
        <PreviewProductCreateSheet
          open={createProductOpen}
          onOpenChange={setCreateProductOpen}
          onSaved={() => {
            setCreateProductOpen(false);
            setSurface("till");
          }}
        />
        <PreviewSwitcher surface={surface} onChange={setSurface} />
      </div>
    );
  }

  if (surface === "supplier") {
    return (
      <div className="relative min-h-dvh bg-white">
        <SupplierWorkspaceEmpty
          canWrite
          canOpenNewSupply
          canReadCatalog
          totalCount={0}
          suggestions={[]}
          onSelectSupplier={() => undefined}
          onNewSupplier={() => setCreateSupplierOpen(true)}
          onNewSupply={() => undefined}
        />
        <FormDrawer
          open={createSupplierOpen}
          onOpenChange={setCreateSupplierOpen}
          title="New supplier"
          description="Name is enough. Phone helps when you receive stock."
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl sm:h-9 sm:rounded-md"
                onClick={() => setCreateSupplierOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-12 rounded-2xl bg-[#0D9488] text-white hover:bg-[#0F766E] sm:h-9 sm:rounded-md"
                onClick={() => {
                  setCreateSupplierOpen(false);
                  setSurface("till");
                }}
              >
                Save supplier
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#6B7280]">Name</span>
              <input
                className="h-12 w-full rounded-2xl border border-[#E8E4DC] bg-white px-3 text-base sm:h-9 sm:rounded-none sm:text-sm"
                defaultValue="Brookside Dairies"
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#6B7280]">Phone</span>
              <input
                className="h-12 w-full rounded-2xl border border-[#E8E4DC] bg-white px-3 text-base sm:h-9 sm:rounded-none sm:text-sm"
                defaultValue="0712 345 678"
                inputMode="tel"
                autoComplete="off"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-[#6B7280]">Email</span>
              <input
                className="h-12 w-full rounded-2xl border border-[#E8E4DC] bg-white px-3 text-base sm:h-9 sm:rounded-none sm:text-sm"
                defaultValue=""
                placeholder="Optional"
                autoComplete="off"
              />
            </label>
          </div>
        </FormDrawer>
        <PreviewSwitcher surface={surface} onChange={setSurface} />
      </div>
    );
  }

  if (surface === "till") {
    return (
      <div className="relative min-h-dvh bg-[#F7F3EB] px-4 pb-28 pt-6">
        <p className="text-[13px] font-medium text-[#6B7280]">Sunrise Mini Mart</p>
        <h1 className="mt-1 text-[1.35rem] font-semibold tracking-tight text-[#1c1915]">
          Sell
        </h1>
        <button
          type="button"
          onClick={() => setCheckoutOpen(true)}
          className="mt-4 w-full rounded-2xl border border-[#E8E4DC] bg-white p-4 text-left shadow-sm"
        >
          <p className="text-[15px] font-semibold text-[#1c1915]">Milk 500ml</p>
          <p className="mt-1 text-[13px] text-[#6B7280]">1 in cart · KES 75.00</p>
        </button>
        <CashierFirstSaleDrawer
          trigger={
            <button
              type="button"
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-[#D6D3C8] bg-white/70 px-4 text-sm font-semibold text-[#6B7280]"
            >
              How to take your first sale
            </button>
          }
        />
        <PreviewCheckoutSheet
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
        />
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E4DC] bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="flex h-12 w-full items-center justify-between rounded-2xl bg-[#0D9488] px-4 text-sm font-semibold text-white"
          >
            <span>Cart · 1 item</span>
            <span className="tabular-nums">KES 75.00</span>
          </button>
        </div>
        <PreviewSwitcher surface={surface} onChange={setSurface} />
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <OnboardingQuestionnaire
        step={step}
        initialAnswers={answers}
        businessName="Sunrise Mini Mart"
        businessSlug="sunrise"
        submitting={false}
        countryCode="KE"
        currency="KES"
        accountPhone="0712345678"
        canBrowseGlobalCatalog
        suggestedPack={{
          id: "pack-1",
          name: "Mini mart starter",
          productCount: 48,
          currency: "KES",
          sampleNames: ["Sugar 2kg", "Cooking oil 1L", "Milk 500ml", "Bread"],
          samplePriceLabel: null,
        }}
        onContinue={(patch) => {
          setAnswers((prev) => ({ ...prev, ...patch }));
          setStep((current) => Math.min(current + 1, QUESTIONNAIRE_STEP_COUNT));
        }}
        onBack={() => setStep((current) => Math.max(1, current - 1))}
        onSkip={() => setStep(QUESTIONNAIRE_STEP_COUNT)}
        onFinishLater={() => setSurface("welcome")}
        onOpenCatalogDrawer={() => setSurface("catalog")}
        onAddProductsManually={() => setSurface("welcome")}
        onProductSourceChange={(source: ProductSourceChoice) =>
          setAnswers((prev) => ({ ...prev, productSource: source }))
        }
      />
      <PreviewSwitcher surface={surface} onChange={setSurface} />
    </div>
  );
}

function PreviewProductCreateSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[min(92dvh,44rem)] gap-0 rounded-t-[1.25rem] bg-[#FBF9F5] p-0"
      >
        <div className="flex shrink-0 justify-center pt-2" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" />
        </div>
        <div className="space-y-1 px-5 pb-3 pt-3">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Add product
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Name and selling price are enough to sell. Photo and barcode can wait.
          </DialogDescription>
        </div>
        <div className="space-y-3 px-5 pb-4">
          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-[#6B7280]">Name</span>
            <input
              className="h-12 w-full rounded-2xl border border-[#E8E4DC] bg-white px-3 text-base"
              defaultValue="Milk 500ml"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-[#6B7280]">
              Selling price
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#E8E4DC] bg-white px-3 text-base tabular-nums"
              defaultValue="75"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="border-t border-[#E8E4DC] bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl bg-[#0D9488] text-white hover:bg-[#0F766E]"
            onClick={onSaved}
          >
            Add and sell
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewCheckoutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [method, setMethod] = useState<"cash" | "mpesa">("cash");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[min(92dvh,44rem)] gap-0 rounded-t-[1.25rem] p-0"
      >
        <div className="flex shrink-0 justify-center pt-2" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="px-4 pb-2 pt-3">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Checkout
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pay for this cart and complete the sale
          </DialogDescription>
          <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight tabular-nums">
            75.00
            <span className="ml-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
              KES
            </span>
          </p>
        </div>
        <div className="space-y-3 px-4 py-3">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setMethod("cash")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold ${
                method === "cash"
                  ? "border-transparent bg-[#0D9488] text-white"
                  : "border-border bg-background"
              }`}
            >
              <Banknote className="size-3" aria-hidden />
              Cash
            </button>
            <button
              type="button"
              onClick={() => setMethod("mpesa")}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold ${
                method === "mpesa"
                  ? "border-transparent bg-[#0D9488] text-white"
                  : "border-border bg-background"
              }`}
            >
              <Smartphone className="size-3" aria-hidden />
              M-Pesa
            </button>
          </div>
          <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            Ready to complete
          </p>
        </div>
        <div className="border-t border-border/40 px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl bg-[#0D9488] text-sm font-bold text-white hover:bg-[#0F766E]"
            onClick={() => onOpenChange(false)}
          >
            Complete · 75.00 KES
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewSwitcher({
  surface,
  onChange,
}: {
  surface: Surface;
  onChange: (next: Surface) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-[max(5.75rem,calc(env(safe-area-inset-bottom)+4.75rem))] left-3 z-[700]">
      <div className="pointer-events-auto flex flex-col items-start gap-1">
        {open ? (
          <div className="flex flex-col gap-1 rounded-2xl border border-[#E8E4DC] bg-white/95 p-1 text-[10px] font-medium shadow-sm">
            {(
              [
                ["questionnaire", "Steps"],
                ["catalog", "Shelf"],
                ["welcome", "Welcome"],
                ["product", "Product"],
                ["supplier", "Supplier"],
                ["till", "Till"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={cnSwitch(surface === id)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-[#E8E4DC] bg-white/95 px-2.5 py-1 text-[10px] font-medium text-[#9CA3AF] shadow-sm"
        >
          Preview
        </button>
      </div>
    </div>
  );
}

function cnSwitch(active: boolean) {
  return active
    ? "rounded-full bg-[#0D9488] px-3 py-1.5 text-white"
    : "rounded-full px-3 py-1.5 text-[#6B7280]";
}
