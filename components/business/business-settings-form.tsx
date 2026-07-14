"use client";

import { useEffect, useRef } from "react";
import {
  AlertCircle,
  ClipboardList,
  Loader2,
  Save,
  ShoppingCart,
  Warehouse,
} from "lucide-react";

import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  MAX_FEATURED,
  TIER_SUGGESTIONS,
  type CashierCapabilitiesForm,
  type EditableBusiness,
  type InventoryForm,
  type PosDraftsForm,
  type StorefrontForm,
} from "@/components/business/business-settings-types";
import type { BranchRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

function inputClass(disabled?: boolean) {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function labelClass() {
  return "text-sm font-medium leading-none text-foreground";
}

function hintClass() {
  return "text-xs leading-relaxed text-muted-foreground";
}

export function BusinessSettingsForm({
  editable,
  setEditable,
  storefront,
  setStorefront,
  inventory,
  setInventory,
  posDrafts,
  setPosDrafts,
  cashierCapabilities,
  setCashierCapabilities,
  activeBranches,
  canManageBusinessSettings,
  isSaving,
  storefrontNeedsBranch,
  focusStorefrontOnMount,
  onSubmit,
  onCancel,
}: {
  editable: EditableBusiness;
  setEditable: React.Dispatch<React.SetStateAction<EditableBusiness>>;
  storefront: StorefrontForm;
  setStorefront: React.Dispatch<React.SetStateAction<StorefrontForm>>;
  inventory: InventoryForm;
  setInventory: React.Dispatch<React.SetStateAction<InventoryForm>>;
  posDrafts: PosDraftsForm;
  setPosDrafts: React.Dispatch<React.SetStateAction<PosDraftsForm>>;
  cashierCapabilities: CashierCapabilitiesForm;
  setCashierCapabilities: React.Dispatch<
    React.SetStateAction<CashierCapabilitiesForm>
  >;
  activeBranches: BranchRecord[];
  canManageBusinessSettings: boolean;
  isSaving: boolean;
  storefrontNeedsBranch: boolean;
  focusStorefrontOnMount?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const storefrontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusStorefrontOnMount) {
      return;
    }
    storefrontRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusStorefrontOnMount]);

  return (
    <form
      id="business-settings-form"
      className="space-y-5"
      onSubmit={onSubmit}
    >
      <FormDrawerFields
        legend="Profile & billing"
        hint="How your business appears internally and your plan label."
      >
        <div className="space-y-2">
          <label className={labelClass()} htmlFor="biz-name">
            Business name
          </label>
          <input
            id="biz-name"
            className={inputClass()}
            value={editable.name}
            onChange={(event) =>
              setEditable((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Acme Retail Ltd"
            autoComplete="organization"
          />
        </div>
        <div className="space-y-2">
          <label className={labelClass()} htmlFor="biz-tier">
            Subscription tier
          </label>
          <input
            id="biz-tier"
            className={inputClass()}
            list="tier-suggestions"
            value={editable.subscriptionTier}
            onChange={(event) =>
              setEditable((previous) => ({
                ...previous,
                subscriptionTier: event.target.value,
              }))
            }
            placeholder="starter"
          />
          <datalist id="tier-suggestions">
            {TIER_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <p className={hintClass()}>
            Pick a suggestion or type your plan code exactly as provisioned.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={labelClass()}>Business status</p>
            <p className={cn(hintClass(), "mt-1 max-w-md")}>
              Inactive businesses are hidden from day-to-day operations. Toggle
              only if you intend to pause this workspace.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center gap-3 self-start sm:self-auto">
            <span className="text-sm text-muted-foreground">
              {editable.active ? "Active" : "Inactive"}
            </span>
            <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={editable.active}
                onChange={(event) =>
                  setEditable((previous) => ({
                    ...previous,
                    active: event.target.checked,
                  }))
                }
              />
              <span
                className={cn(
                  "absolute inset-0 rounded-full bg-muted-foreground/25 transition-colors",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                  "peer-checked:bg-primary",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 z-10 size-6 rounded-full bg-background shadow-sm transition-transform",
                  "peer-checked:translate-x-5",
                )}
                aria-hidden
              />
            </span>
          </label>
        </div>
      </FormDrawerFields>

      {canManageBusinessSettings ? (
        <div ref={storefrontRef} id="storefront-settings">
          <FormDrawerFields
            legend="Online storefront"
            hint="Public catalog and pickup flow. Prices follow the branch you choose."
          >
            <label
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50"
              data-onboarding-emphasis="storefront-toggle"
            >
              <input
                type="checkbox"
                className="size-4 rounded border-input text-primary focus:ring-ring"
                checked={storefront.enabled}
                onChange={(event) =>
                  setStorefront((s) => ({
                    ...s,
                    enabled: event.target.checked,
                  }))
                }
              />
              Enable storefront
            </label>
            <div className="space-y-2">
              <label className={labelClass()} htmlFor="sf-branch">
                Catalog branch
              </label>
              <select
                id="sf-branch"
                className={inputClass(!storefront.enabled)}
                value={storefront.catalogBranchId}
                disabled={!storefront.enabled}
                onChange={(e) =>
                  setStorefront((s) => ({
                    ...s,
                    catalogBranchId: e.target.value,
                  }))
                }
              >
                <option value="">Select branch…</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className={hintClass()}>
                Shoppers see stock and prices from this branch.
              </p>
              {storefront.enabled && activeBranches.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  Add an active branch first, then pick it here so the
                  storefront has a price list.
                </p>
              ) : null}
              {storefront.enabled &&
              activeBranches.length > 0 &&
              !storefront.catalogBranchId.trim() ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  Select which branch powers the public catalog before saving.
                </p>
              ) : null}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-1">
                <label className={labelClass()} htmlFor="sf-label">
                  Shop label{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  id="sf-label"
                  className={inputClass(!storefront.enabled)}
                  disabled={!storefront.enabled}
                  value={storefront.label}
                  onChange={(e) =>
                    setStorefront((s) => ({ ...s, label: e.target.value }))
                  }
                  placeholder="e.g. Order online"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="sf-announcement">
                  Announcement{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="sf-announcement"
                  className={cn(
                    inputClass(!storefront.enabled),
                    "min-h-[5rem] resize-y",
                  )}
                  disabled={!storefront.enabled}
                  value={storefront.announcement}
                  onChange={(e) =>
                    setStorefront((s) => ({
                      ...s,
                      announcement: e.target.value,
                    }))
                  }
                  placeholder="Short banner message on your public shop"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className={labelClass()} htmlFor="sf-featured">
                  Featured product IDs{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="sf-featured"
                  className={cn(
                    inputClass(!storefront.enabled),
                    "min-h-[7rem] resize-y font-mono text-xs leading-relaxed",
                  )}
                  disabled={!storefront.enabled}
                  value={storefront.featuredLines}
                  onChange={(e) =>
                    setStorefront((s) => ({
                      ...s,
                      featuredLines: e.target.value,
                    }))
                  }
                  placeholder={
                    "One UUID per line, up to " + MAX_FEATURED + " lines"
                  }
                />
                <p className={hintClass()}>
                  Paste product UUIDs from your catalog to pin them on the
                  storefront home.
                </p>
              </div>
            </div>
          </FormDrawerFields>
        </div>
      ) : null}

      {canManageBusinessSettings ? (
        <FormDrawerFields
          legend="Stock take"
          hint="Control what stock managers see while counting."
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
              checked={inventory.showSystemStockToStockManager}
              onChange={(event) =>
                setInventory((previous) => ({
                  ...previous,
                  showSystemStockToStockManager: event.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 font-medium">
                <ClipboardList className="size-4 text-muted-foreground" />
                Show system stock to stock managers
              </span>
              <span className={hintClass()}>
                When enabled, stock managers see on-hand system quantity during
                general stock take and daily audit counting. Owners and admins
                always see it. Daily audit review stays admin-only.
              </span>
            </span>
          </label>
        </FormDrawerFields>
      ) : null}

      {canManageBusinessSettings ? (
        <div id="stock-levels-settings">
          <FormDrawerFields
            legend="Stock levels"
            hint="Stock page access and whether cashiers can sell when on-hand quantity is zero."
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
                checked={inventory.allowStockEditForStockManager}
                onChange={(event) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowStockEditForStockManager: event.target.checked,
                  }))
                }
              />
              <span className="space-y-1">
                <span className="flex items-center gap-2 font-medium">
                  <Warehouse className="size-4 text-muted-foreground" />
                  Allow stock managers to edit stock
                </span>
                <span className={hintClass()}>
                  When enabled, stock managers can set on-hand quantities inline
                  on the Stock page. They still cannot edit the product catalog.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
                checked={inventory.allowStockEditForGroceryClerk}
                onChange={(event) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowStockEditForGroceryClerk: event.target.checked,
                  }))
                }
              />
              <span className="space-y-1">
                <span className="flex items-center gap-2 font-medium">
                  <Warehouse className="size-4 text-muted-foreground" />
                  Allow grocery clerks to edit stock
                </span>
                <span className={hintClass()}>
                  When enabled, grocery clerks can open the Stock page and set
                  on-hand quantities for their assigned branch.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
                checked={inventory.allowNegativeStock}
                onChange={(event) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowNegativeStock: event.target.checked,
                  }))
                }
              />
              <span className="space-y-1">
                <span className="flex items-center gap-2 font-medium">
                  <ShoppingCart className="size-4 text-muted-foreground" />
                  Allow selling when out of stock
                </span>
                <span className={hintClass()}>
                  When enabled, cashiers can complete sales even when on-hand
                  quantity is zero or below. Stock will go negative until you
                  receive more inventory.
                </span>
              </span>
            </label>
          </FormDrawerFields>
        </div>
      ) : null}

      {canManageBusinessSettings ? (
        <FormDrawerFields
          legend="Cashier permissions"
          hint="Allow cashiers to edit prices, create products, or mark items as weighted from the POS. Managers with pricing/catalog permissions always can."
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
              checked={cashierCapabilities.priceEdit}
              onChange={(event) =>
                setCashierCapabilities((previous) => ({
                  ...previous,
                  priceEdit: event.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 font-medium">
                <ShoppingCart className="size-4 text-muted-foreground" />
                Allow cashiers to edit prices
              </span>
              <span className={hintClass()}>
                Cashiers can change unit prices on cart lines (override shelf
                price at checkout).
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
              checked={cashierCapabilities.createProduct}
              onChange={(event) =>
                setCashierCapabilities((previous) => ({
                  ...previous,
                  createProduct: event.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="font-medium">Allow cashiers to add products</span>
              <span className={hintClass()}>
                Cashiers can quick-create a sellable item from the register and
                add it to the cart.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
              checked={cashierCapabilities.weighedToggle}
              onChange={(event) =>
                setCashierCapabilities((previous) => ({
                  ...previous,
                  weighedToggle: event.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="font-medium">
                Allow cashiers to mark items as weighted
              </span>
              <span className={hintClass()}>
                Cashiers can toggle sell-by-weight on a cart line so quantity can
                be entered in kg (updates the product catalog).
              </span>
            </span>
          </label>
        </FormDrawerFields>
      ) : null}

      {canManageBusinessSettings ? (
        <FormDrawerFields
          legend="Cashier POS drafts"
          hint="Save in-progress sales on the cashier and review them from Sales → Pending carts."
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
              checked={posDrafts.enabled}
              onChange={(event) =>
                setPosDrafts((previous) => ({
                  ...previous,
                  enabled: event.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 font-medium">
                <ShoppingCart className="size-4 text-muted-foreground" />
                Enable POS draft persistence
              </span>
              <span className={hintClass()}>
                Cashier carts sync to the server so staff can resume sales later.
                Required for draft save and resume on the register.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
              checked={posDrafts.uiVisible}
              onChange={(event) =>
                setPosDrafts((previous) => ({
                  ...previous,
                  uiVisible: event.target.checked,
                }))
              }
            />
            <span className="space-y-1">
              <span className="font-medium">Show pending carts in navigation</span>
              <span className={hintClass()}>
                Adds Sales → Pending carts and the in-register pending panel. You
                can enable this even while testing draft sync.
              </span>
            </span>
          </label>
          <details className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Advanced rollout options
            </summary>
            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
                  checked={posDrafts.shadowWrites}
                  onChange={(event) =>
                    setPosDrafts((previous) => ({
                      ...previous,
                      shadowWrites: event.target.checked,
                    }))
                  }
                />
                <span className="space-y-1">
                  <span className="font-medium">Shadow writes</span>
                  <span className={hintClass()}>
                    Log draft payloads without affecting cashier behavior. For
                    staged rollouts only.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-background px-3 py-3 text-sm shadow-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  checked={posDrafts.offlineMirror}
                  disabled={!posDrafts.enabled}
                  onChange={(event) =>
                    setPosDrafts((previous) => ({
                      ...previous,
                      offlineMirror: event.target.checked,
                    }))
                  }
                />
                <span className="space-y-1">
                  <span className="font-medium">Offline mirror</span>
                  <span className={hintClass()}>
                    Keep a local IndexedDB copy when the register goes offline.
                    Requires draft persistence enabled.
                  </span>
                </span>
              </label>
            </div>
          </details>
        </FormDrawerFields>
      ) : null}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-1 flex flex-wrap justify-end gap-2 rounded-xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 2xl:static 2xl:bottom-auto 2xl:mx-0 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:shadow-none 2xl:backdrop-blur-none">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving || Boolean(storefrontNeedsBranch)}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Save className="size-4" aria-hidden />
              Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
