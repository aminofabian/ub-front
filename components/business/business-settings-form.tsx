"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  AlertCircle,
  Banknote,
  ClipboardList,
  Loader2,
  Save,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  MAX_FEATURED,
  TIER_SUGGESTIONS,
  MAX_DAILY_AUDIT_SAMPLE_SIZE,
  MIN_DAILY_AUDIT_SAMPLE_SIZE,
  clampDailyAuditSampleSize,
  type CashierCapabilitiesForm,
  type EditableBusiness,
  type InventoryForm,
  type PosDraftsForm,
  type ShiftSettingsForm,
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

function SettingsAnchor({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-28 2xl:scroll-mt-24">
      {children}
    </div>
  );
}

function SettingsGroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 mb-1 border-b border-border/45 px-1 pb-2 pt-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background/90 px-3.5 py-3 text-sm shadow-sm transition-colors hover:border-border hover:bg-accent/40">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-2 font-medium leading-snug">
          {icon}
          {title}
        </span>
        <span className={hintClass()}>{description}</span>
      </span>
    </label>
  );
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
  shiftSettings,
  setShiftSettings,
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
  shiftSettings: ShiftSettingsForm;
  setShiftSettings: React.Dispatch<React.SetStateAction<ShiftSettingsForm>>;
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
      className="space-y-6"
      onSubmit={onSubmit}
    >
      <SettingsGroupLabel>Business</SettingsGroupLabel>

      <SettingsAnchor id="settings-profile">
        <FormDrawerFields
          legend="Profile & billing"
          hint="How your business appears internally and your plan label."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
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
                Use a provisioned plan code, or pick a suggestion.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="min-w-0">
                <p className={labelClass()}>Business status</p>
                <p className={cn(hintClass(), "mt-1")}>
                  Inactive pauses day-to-day operations.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-2.5 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {editable.active ? "Active" : "Inactive"}
                </span>
                <span className="relative inline-flex h-7 w-12 items-center">
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
          </div>
        </FormDrawerFields>
      </SettingsAnchor>

      {canManageBusinessSettings ? (
        <SettingsAnchor id="settings-storefront">
          <div ref={storefrontRef} id="storefront-settings">
            <FormDrawerFields
              legend="Online storefront"
              hint="Public catalog and pickup flow. Prices follow the branch you choose."
            >
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent/40">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
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
                      Add an active branch first, then pick it here.
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
                <div className="space-y-2">
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
                      "min-h-[4.5rem] resize-y",
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
                      "min-h-[6rem] resize-y font-mono text-xs leading-relaxed",
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
        </SettingsAnchor>
      ) : null}

      {canManageBusinessSettings ? (
        <>
          <SettingsGroupLabel>Inventory</SettingsGroupLabel>

          <SettingsAnchor id="settings-stock-take">
            <FormDrawerFields
              legend="Stock take"
              hint="Daily audit sample size and what stock managers see while counting."
            >
              <ToggleRow
                checked={inventory.showSystemStockToStockManager}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    showSystemStockToStockManager: checked,
                  }))
                }
                icon={
                  <ClipboardList className="size-4 text-muted-foreground" />
                }
                title="Show system stock to stock managers"
                description="Stock managers see on-hand quantity during general stock take and daily audit. Owners and admins always see it."
              />
              <div className="space-y-1.5 pt-1">
                <label
                  htmlFor="daily-audit-sample-size"
                  className={labelClass()}
                >
                  Daily audit sample size
                </label>
                <input
                  id="daily-audit-sample-size"
                  type="number"
                  min={MIN_DAILY_AUDIT_SAMPLE_SIZE}
                  max={MAX_DAILY_AUDIT_SAMPLE_SIZE}
                  step={1}
                  inputMode="numeric"
                  className={inputClass()}
                  value={inventory.dailyAuditSampleSize}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setInventory((previous) => ({
                      ...previous,
                      dailyAuditSampleSize: clampDailyAuditSampleSize(
                        Number.isFinite(next)
                          ? next
                          : previous.dailyAuditSampleSize,
                      ),
                    }));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Each morning the daily audit randomly picks this many unique
                  products sold yesterday ({MIN_DAILY_AUDIT_SAMPLE_SIZE}–
                  {MAX_DAILY_AUDIT_SAMPLE_SIZE}). Takes effect on the next
                  generated audit.
                </p>
              </div>
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsAnchor id="settings-stock-levels">
            <FormDrawerFields
              legend="Stock levels"
              hint="Who can edit on-hand quantities, and whether overselling is allowed."
            >
              <ToggleRow
                checked={inventory.allowStockEditForStockManager}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowStockEditForStockManager: checked,
                  }))
                }
                icon={<Warehouse className="size-4 text-muted-foreground" />}
                title="Allow stock managers to edit stock"
                description="Stock managers can set on-hand quantities on the Stock page. They still cannot edit the product catalog."
              />
              <ToggleRow
                checked={inventory.allowStockEditForGroceryClerk}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowStockEditForGroceryClerk: checked,
                  }))
                }
                icon={<Warehouse className="size-4 text-muted-foreground" />}
                title="Allow grocery clerks to edit stock"
                description="Grocery clerks can open Stock and set on-hand quantities for their assigned branch."
              />
              <ToggleRow
                checked={inventory.allowNegativeStock}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowNegativeStock: checked,
                  }))
                }
                icon={<ShoppingCart className="size-4 text-muted-foreground" />}
                title="Allow selling when out of stock"
                description="Cashiers can complete sales when on-hand is zero. Stock goes negative until you receive more."
              />
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsAnchor id="settings-receive">
            <FormDrawerFields
              legend="Receive stock"
              hint="Who can receive supplier deliveries."
            >
              <ToggleRow
                checked={inventory.allowReceiveForStockManager}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowReceiveForStockManager: checked,
                  }))
                }
                icon={<Warehouse className="size-4 text-muted-foreground" />}
                title="Allow stock managers to receive stock"
                description="Stock managers can open Receive supplies and post deliveries."
              />
              <ToggleRow
                checked={inventory.allowReceiveForCashier}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowReceiveForCashier: checked,
                  }))
                }
                icon={<ShoppingCart className="size-4 text-muted-foreground" />}
                title="Allow cashiers to receive stock"
                description="Cashiers can receive deliveries from the till or Receive supplies page."
              />
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsAnchor id="settings-credit-tabs">
            <FormDrawerFields
              legend="Credit tabs"
              hint="Cashier access to customer tab balances and clearance requests."
            >
              <ToggleRow
                checked={inventory.allowCashierTabClearance}
                onChange={(checked) =>
                  setInventory((previous) => ({
                    ...previous,
                    allowCashierTabClearance: checked,
                  }))
                }
                icon={<Users className="size-4 text-muted-foreground" />}
                title="Allow cashiers to clear credit tabs"
                description="Cashiers get a Tabs button to list balances and submit cash/M-Pesa clearances for admin approval."
              />
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsAnchor id="settings-suppliers">
            <FormDrawerFields
              legend="Suppliers"
              hint="Who can create suppliers and link catalog products."
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <ToggleRow
                  checked={inventory.allowSupplierWriteForStockManager}
                  onChange={(checked) =>
                    setInventory((previous) => ({
                      ...previous,
                      allowSupplierWriteForStockManager: checked,
                    }))
                  }
                  icon={<Truck className="size-4 text-muted-foreground" />}
                  title="Stock managers can add suppliers"
                  description="Create and edit supplier profiles (name, contacts, notes)."
                />
                <ToggleRow
                  checked={inventory.allowLinkProductsForStockManager}
                  onChange={(checked) =>
                    setInventory((previous) => ({
                      ...previous,
                      allowLinkProductsForStockManager: checked,
                    }))
                  }
                  icon={<Truck className="size-4 text-muted-foreground" />}
                  title="Stock managers can link products"
                  description="Link catalog SKUs to suppliers, including from New Supply."
                />
                <ToggleRow
                  checked={inventory.allowSupplierWriteForCashier}
                  onChange={(checked) =>
                    setInventory((previous) => ({
                      ...previous,
                      allowSupplierWriteForCashier: checked,
                    }))
                  }
                  icon={<Truck className="size-4 text-muted-foreground" />}
                  title="Cashiers can add suppliers"
                  description="Till Suppliers modal can create private supplier profiles."
                />
                <ToggleRow
                  checked={inventory.allowLinkProductsForCashier}
                  onChange={(checked) =>
                    setInventory((previous) => ({
                      ...previous,
                      allowLinkProductsForCashier: checked,
                    }))
                  }
                  icon={<Truck className="size-4 text-muted-foreground" />}
                  title="Cashiers can link products"
                  description="Till Suppliers modal can link catalog products to a supplier."
                />
              </div>
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsGroupLabel>Till</SettingsGroupLabel>

          <SettingsAnchor id="settings-shifts">
            <FormDrawerFields
              legend="Shifts & cash drawer"
              hint="How opening float is prepared when a cashier starts a shift."
            >
              <ToggleRow
                checked={shiftSettings.prefillOpeningFromLastClose}
                onChange={(checked) =>
                  setShiftSettings((previous) => ({
                    ...previous,
                    prefillOpeningFromLastClose: checked,
                  }))
                }
                icon={<Banknote className="size-4 text-muted-foreground" />}
                title="Prefill opening float from last close"
                description="Fill denomination quantities from the previous closing count so the cashier can review and edit."
              />
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsAnchor id="settings-cashier">
            <FormDrawerFields
              legend="Cashier permissions"
              hint="What cashiers can do on the POS. Weighted marking is on by default."
            >
              <ToggleRow
                checked={cashierCapabilities.priceEdit}
                onChange={(checked) =>
                  setCashierCapabilities((previous) => ({
                    ...previous,
                    priceEdit: checked,
                  }))
                }
                icon={<ShoppingCart className="size-4 text-muted-foreground" />}
                title="Allow cashiers to edit prices"
                description="Change unit prices on cart lines (override shelf price at checkout)."
              />
              <ToggleRow
                checked={cashierCapabilities.createProduct}
                onChange={(checked) =>
                  setCashierCapabilities((previous) => ({
                    ...previous,
                    createProduct: checked,
                  }))
                }
                title="Allow cashiers to add products"
                description="Quick-create a sellable item from the register and add it to the cart."
              />
              <ToggleRow
                checked={cashierCapabilities.weighedToggle}
                onChange={(checked) =>
                  setCashierCapabilities((previous) => ({
                    ...previous,
                    weighedToggle: checked,
                  }))
                }
                title="Allow cashiers to mark items as weighted"
                description="Toggle sell-by-weight on a cart line so quantity can be entered in kg."
              />
              <ToggleRow
                checked={cashierCapabilities.addPhoto}
                onChange={(checked) =>
                  setCashierCapabilities((previous) => ({
                    ...previous,
                    addPhoto: checked,
                  }))
                }
                title="Add product photos from the till"
                description="Owners and admins can upload product photos from the cashier shelf (for items missing a photo)."
              />
            </FormDrawerFields>
          </SettingsAnchor>

          <SettingsAnchor id="settings-pos-drafts">
            <FormDrawerFields
              legend="Cashier POS drafts"
              hint="Save in-progress sales and review them from Sales → Pending carts."
            >
              <ToggleRow
                checked={posDrafts.enabled}
                onChange={(checked) =>
                  setPosDrafts((previous) => ({
                    ...previous,
                    enabled: checked,
                  }))
                }
                icon={<ShoppingCart className="size-4 text-muted-foreground" />}
                title="Enable POS draft persistence"
                description="Cashier carts sync to the server so staff can resume sales later."
              />
              <ToggleRow
                checked={posDrafts.uiVisible}
                onChange={(checked) =>
                  setPosDrafts((previous) => ({
                    ...previous,
                    uiVisible: checked,
                  }))
                }
                title="Show pending carts in navigation"
                description="Adds Sales → Pending carts and the in-register pending panel."
              />
              <details className="rounded-xl border border-border/60 bg-muted/15 px-3.5 py-2.5">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Advanced rollout options
                </summary>
                <div className="mt-3 space-y-3">
                  <ToggleRow
                    checked={posDrafts.shadowWrites}
                    onChange={(checked) =>
                      setPosDrafts((previous) => ({
                        ...previous,
                        shadowWrites: checked,
                      }))
                    }
                    title="Shadow writes"
                    description="Log draft payloads without affecting cashier behavior."
                  />
                  <label
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-border/70 bg-background/90 px-3.5 py-3 text-sm shadow-sm",
                      !posDrafts.enabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-accent/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-ring disabled:cursor-not-allowed"
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
                        Keep a local IndexedDB copy when the register goes
                        offline. Requires draft persistence.
                      </span>
                    </span>
                  </label>
                </div>
              </details>
            </FormDrawerFields>
          </SettingsAnchor>
        </>
      ) : null}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:bottom-auto lg:mx-0 lg:justify-end lg:border-border/60 lg:bg-card/60 lg:p-4 lg:shadow-sm">
        <p className="hidden text-xs text-muted-foreground sm:block lg:mr-auto">
          Save applies all sections on this page.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
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
      </div>
    </form>
  );
}
