"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  AlertCircle,
  Banknote,
  ClipboardList,
  Loader2,
  Moon,
  Save,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

import { TrustedTillsPanel } from "@/components/business/trusted-tills-panel";
import {
  BUSINESS_CONFIGURATION_NAV,
  type ConfigurationWorkspace,
} from "@/components/business/business-settings-nav";
import {
  DEFAULT_DAILY_AUDIT_SAMPLE_SIZE,
  DEFAULT_MORNING_STARTS_AT,
  DEFAULT_MORNING_ENDS_AT,
  DEFAULT_EVENING_STARTS_AT,
  DEFAULT_EVENING_ENDS_AT,
  MAX_DAILY_AUDIT_SAMPLE_SIZE,
  MIN_DAILY_AUDIT_SAMPLE_SIZE,
  clampDailyAuditSampleSize,
  isDailyAuditScheduleOrdered,
  normalizeDailyAuditTime,
  type CashierCapabilitiesForm,
  type InventoryForm,
  type PosDraftsForm,
  type ShiftSettingsForm,
} from "@/components/business/business-settings-types";
import { Button } from "@/components/ui/button";
import type { BranchRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

function timeToMinutes(value: string, fallback: string): number {
  const normalized = normalizeDailyAuditTime(value, fallback);
  const [h, m] = normalized.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function windowStyle(
  start: string,
  end: string,
  startFallback: string,
  endFallback: string,
): { left: string; width: string } {
  const s = timeToMinutes(start, startFallback);
  const e = timeToMinutes(end, endFallback);
  const day = 24 * 60;
  const left = Math.max(0, Math.min(100, (s / day) * 100));
  const width = Math.max(2, Math.min(100 - left, ((e - s) / day) * 100));
  return { left: `${left}%`, width: `${width}%` };
}

function PolicySwitch({
  checked,
  onChange,
  title,
  description,
  icon,
  tone = "default",
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
  icon?: ReactNode;
  tone?: "default" | "warning";
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "group flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        checked
          ? tone === "warning"
            ? "border-amber-500/35 bg-amber-500/[0.07] shadow-sm"
            : "border-primary/30 bg-primary/[0.06] shadow-sm"
          : "border-border/60 bg-background/80 hover:border-border hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          checked
            ? tone === "warning"
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
              : "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5 pt-0.5">
        <span className="block text-[13px] font-semibold leading-snug tracking-tight">
          {title}
        </span>
        <span className="block text-[11px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="relative mt-1 inline-flex h-7 w-12 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          className={cn(
            "absolute inset-0 rounded-full transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
            checked
              ? tone === "warning"
                ? "bg-amber-600"
                : "bg-primary"
              : "bg-muted-foreground/25",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "absolute left-0.5 top-0.5 z-10 size-6 rounded-full bg-background shadow-sm transition-transform",
            checked && "translate-x-5",
          )}
          aria-hidden
        />
      </span>
    </label>
  );
}

function PolicyPanel({
  id,
  eyebrow,
  title,
  hint,
  children,
  accent = "emerald",
}: {
  id: string;
  eyebrow: string;
  title: string;
  hint: string;
  children: ReactNode;
  accent?: "emerald" | "sky" | "amber" | "violet";
}) {
  const accentBar = {
    emerald: "from-emerald-500/80 via-primary/50 to-transparent",
    sky: "from-sky-500/70 via-sky-400/40 to-transparent",
    amber: "from-amber-500/70 via-amber-400/35 to-transparent",
    violet: "from-violet-500/60 via-fuchsia-400/30 to-transparent",
  }[accent];

  return (
    <section
      id={id}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm"
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", accentBar)} />
      <div className="space-y-4 p-4 sm:p-5">
        <header className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {hint}
          </p>
        </header>
        <div className="space-y-2.5">{children}</div>
      </div>
    </section>
  );
}

function fieldClass(disabled?: boolean) {
  return cn(
    "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
    disabled && "cursor-not-allowed opacity-60",
  );
}

export function BusinessConfigurationForm({
  workspace,
  inventory,
  setInventory,
  posDrafts,
  setPosDrafts,
  cashierCapabilities,
  setCashierCapabilities,
  shiftSettings,
  setShiftSettings,
  activeBranches,
  defaultBranchId,
  isSaving,
  onSubmit,
  onCancel,
}: {
  workspace: ConfigurationWorkspace;
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
  defaultBranchId: string | null;
  isSaving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [dailyAuditSampleDraft, setDailyAuditSampleDraft] = useState(
    String(inventory.dailyAuditSampleSize),
  );

  useEffect(() => {
    setDailyAuditSampleDraft(String(inventory.dailyAuditSampleSize));
  }, [inventory.dailyAuditSampleSize]);

  function commitDailyAuditSampleSize(raw: string) {
    const parsed = Number(raw.trim());
    const next = clampDailyAuditSampleSize(
      Number.isFinite(parsed) && raw.trim() !== ""
        ? parsed
        : DEFAULT_DAILY_AUDIT_SAMPLE_SIZE,
    );
    setInventory((previous) => ({
      ...previous,
      dailyAuditSampleSize: next,
    }));
    setDailyAuditSampleDraft(String(next));
  }

  const scheduleOk = isDailyAuditScheduleOrdered(
    normalizeDailyAuditTime(
      inventory.morningStartsAt,
      DEFAULT_MORNING_STARTS_AT,
    ),
    normalizeDailyAuditTime(inventory.morningEndsAt, DEFAULT_MORNING_ENDS_AT),
    normalizeDailyAuditTime(
      inventory.eveningStartsAt,
      DEFAULT_EVENING_STARTS_AT,
    ),
    normalizeDailyAuditTime(inventory.eveningEndsAt, DEFAULT_EVENING_ENDS_AT),
  );

  const morningStyle = windowStyle(
    inventory.morningStartsAt,
    inventory.morningEndsAt,
    DEFAULT_MORNING_STARTS_AT,
    DEFAULT_MORNING_ENDS_AT,
  );
  const eveningStyle = windowStyle(
    inventory.eveningStartsAt,
    inventory.eveningEndsAt,
    DEFAULT_EVENING_STARTS_AT,
    DEFAULT_EVENING_ENDS_AT,
  );

  const visibleIds = new Set(
    BUSINESS_CONFIGURATION_NAV.filter((item) =>
      workspace === "inventory"
        ? item.group === "Inventory"
        : item.group === "Till",
    ).map((item) => item.id),
  );

  return (
    <form
      id="business-configuration-form"
      className="space-y-4"
      onSubmit={(event) => {
        flushSync(() => {
          commitDailyAuditSampleSize(dailyAuditSampleDraft);
        });
        onSubmit(event);
      }}
    >
      {visibleIds.has("settings-stock-take") ? (
        <PolicyPanel
          id="settings-stock-take"
          eyebrow="Inventory · Counts"
          title="Stock take & daily audit"
          hint="How many SKUs get sampled overnight, when counts happen, and what stock managers can see while counting."
          accent="emerald"
        >
          <PolicySwitch
            checked={inventory.showSystemStockToStockManager}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                showSystemStockToStockManager: checked,
              }))
            }
            icon={<ClipboardList className="size-4" aria-hidden />}
            title="Show system stock to stock managers"
            description="Stock managers see on-hand quantity during general stock take and daily audit. Owners and admins always see it."
          />

          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="daily-audit-sample-size"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Daily audit sample size
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Unique products sold yesterday, range{" "}
                  {MIN_DAILY_AUDIT_SAMPLE_SIZE}–{MAX_DAILY_AUDIT_SAMPLE_SIZE}.
                </p>
              </div>
              <input
                id="daily-audit-sample-size"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                className={cn(fieldClass(), "w-28 text-center text-lg font-semibold tabular-nums")}
                value={dailyAuditSampleDraft}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw !== "" && !/^\d+$/.test(raw)) {
                    return;
                  }
                  setDailyAuditSampleDraft(raw);
                  if (raw === "") {
                    return;
                  }
                  setInventory((previous) => ({
                    ...previous,
                    dailyAuditSampleSize: clampDailyAuditSampleSize(Number(raw)),
                  }));
                }}
                onBlur={() =>
                  commitDailyAuditSampleSize(dailyAuditSampleDraft)
                }
              />
            </div>
            <p className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2 text-sm">
              Next audit picks{" "}
              <span className="font-semibold tabular-nums text-primary">
                {inventory.dailyAuditSampleSize}
              </span>{" "}
              products from yesterday’s sales.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  Count windows
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Business timezone. Morning must finish before evening starts.
                </p>
              </div>
              {!scheduleOk ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                  <AlertCircle className="size-3" aria-hidden />
                  Invalid
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Ready
                </span>
              )}
            </div>

            <div className="relative h-10 overflow-hidden rounded-xl border border-border/50 bg-muted/40">
              <div
                className="absolute inset-y-1.5 rounded-lg bg-amber-400/45"
                style={morningStyle}
                title="Morning"
              />
              <div
                className="absolute inset-y-1.5 rounded-lg bg-indigo-500/40"
                style={eveningStyle}
                title="Evening"
              />
              <div className="pointer-events-none absolute inset-x-2 bottom-1 flex justify-between text-[9px] font-medium text-muted-foreground">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "morningStartsAt" as const,
                    label: "Morning starts",
                    icon: Sun,
                    value: inventory.morningStartsAt,
                    fallback: DEFAULT_MORNING_STARTS_AT,
                  },
                  {
                    id: "morningEndsAt" as const,
                    label: "Morning ends",
                    icon: Sun,
                    value: inventory.morningEndsAt,
                    fallback: DEFAULT_MORNING_ENDS_AT,
                  },
                  {
                    id: "eveningStartsAt" as const,
                    label: "Evening starts",
                    icon: Moon,
                    value: inventory.eveningStartsAt,
                    fallback: DEFAULT_EVENING_STARTS_AT,
                  },
                  {
                    id: "eveningEndsAt" as const,
                    label: "Evening ends",
                    icon: Moon,
                    value: inventory.eveningEndsAt,
                    fallback: DEFAULT_EVENING_ENDS_AT,
                  },
                ] as const
              ).map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label
                      htmlFor={field.id}
                      className="flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      type="time"
                      className={fieldClass()}
                      value={field.value}
                      onChange={(event) => {
                        const next = event.target.value;
                        setInventory((previous) => ({
                          ...previous,
                          [field.id]: next,
                        }));
                      }}
                      onBlur={() => {
                        setInventory((previous) => ({
                          ...previous,
                          [field.id]: normalizeDailyAuditTime(
                            previous[field.id],
                            field.fallback,
                          ),
                        }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-stock-levels") ? (
        <PolicyPanel
          id="settings-stock-levels"
          eyebrow="Inventory · On hand"
          title="Stock levels"
          hint="Who can change quantities, and whether the till may oversell."
          accent="amber"
        >
          <PolicySwitch
            checked={inventory.allowStockEditForStockManager}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                allowStockEditForStockManager: checked,
              }))
            }
            icon={<Warehouse className="size-4" aria-hidden />}
            title="Allow stock managers to edit stock"
            description="Stock managers can set on-hand quantities on the Stock page. They still cannot edit the product catalog."
          />
          <PolicySwitch
            checked={inventory.allowStockEditForGroceryClerk}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                allowStockEditForGroceryClerk: checked,
              }))
            }
            icon={<Warehouse className="size-4" aria-hidden />}
            title="Allow grocery clerks to edit stock"
            description="Grocery clerks can open Stock and set on-hand quantities for their assigned branch."
          />
          <PolicySwitch
            checked={inventory.allowNegativeStock}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                allowNegativeStock: checked,
              }))
            }
            tone="warning"
            icon={<ShoppingCart className="size-4" aria-hidden />}
            title="Allow selling when out of stock"
            description="Cashiers can complete sales when on-hand is zero. Stock goes negative until you receive more."
          />
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-receive") ? (
        <PolicyPanel
          id="settings-receive"
          eyebrow="Inventory · Receiving"
          title="Receive stock"
          hint="Who can post supplier deliveries into on-hand."
          accent="sky"
        >
          <PolicySwitch
            checked={inventory.allowReceiveForStockManager}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                allowReceiveForStockManager: checked,
              }))
            }
            icon={<Warehouse className="size-4" aria-hidden />}
            title="Allow stock managers to receive stock"
            description="Stock managers can open Receive supplies and post deliveries."
          />
          <PolicySwitch
            checked={inventory.allowReceiveForCashier}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                allowReceiveForCashier: checked,
              }))
            }
            icon={<ShoppingCart className="size-4" aria-hidden />}
            title="Allow cashiers to receive stock"
            description="Cashiers can receive deliveries from the till or Receive supplies page."
          />
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-credit-tabs") ? (
        <PolicyPanel
          id="settings-credit-tabs"
          eyebrow="Inventory · Credit"
          title="Credit tabs"
          hint="Cashier access to customer tab balances and clearance requests."
          accent="violet"
        >
          <PolicySwitch
            checked={inventory.allowCashierTabClearance}
            onChange={(checked) =>
              setInventory((previous) => ({
                ...previous,
                allowCashierTabClearance: checked,
              }))
            }
            icon={<Users className="size-4" aria-hidden />}
            title="Allow cashiers to clear credit tabs"
            description="Cashiers get a Tabs button to list balances and submit cash/M-Pesa clearances for admin approval."
          />
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-suppliers") ? (
        <PolicyPanel
          id="settings-suppliers"
          eyebrow="Inventory · Vendors"
          title="Suppliers"
          hint="Who can create supplier profiles and link catalog products."
          accent="sky"
        >
          <div className="grid gap-2.5 lg:grid-cols-2">
            <PolicySwitch
              checked={inventory.allowSupplierWriteForStockManager}
              onChange={(checked) =>
                setInventory((previous) => ({
                  ...previous,
                  allowSupplierWriteForStockManager: checked,
                }))
              }
              icon={<Truck className="size-4" aria-hidden />}
              title="Stock managers can add suppliers"
              description="Create and edit supplier profiles (name, contacts, notes)."
            />
            <PolicySwitch
              checked={inventory.allowLinkProductsForStockManager}
              onChange={(checked) =>
                setInventory((previous) => ({
                  ...previous,
                  allowLinkProductsForStockManager: checked,
                }))
              }
              icon={<Truck className="size-4" aria-hidden />}
              title="Stock managers can link products"
              description="Link catalog SKUs to suppliers, including from New Supply."
            />
            <PolicySwitch
              checked={inventory.allowSupplierWriteForCashier}
              onChange={(checked) =>
                setInventory((previous) => ({
                  ...previous,
                  allowSupplierWriteForCashier: checked,
                }))
              }
              icon={<Truck className="size-4" aria-hidden />}
              title="Cashiers can add suppliers"
              description="Till Suppliers modal can create private supplier profiles."
            />
            <PolicySwitch
              checked={inventory.allowLinkProductsForCashier}
              onChange={(checked) =>
                setInventory((previous) => ({
                  ...previous,
                  allowLinkProductsForCashier: checked,
                }))
              }
              icon={<Truck className="size-4" aria-hidden />}
              title="Cashiers can link products"
              description="Till Suppliers modal can link catalog products to a supplier."
            />
          </div>
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-shifts") ? (
        <PolicyPanel
          id="settings-shifts"
          eyebrow="Till · Cash"
          title="Shifts & cash drawer"
          hint="How opening float is prepared when a cashier starts a shift."
          accent="amber"
        >
          <PolicySwitch
            checked={shiftSettings.prefillOpeningFromLastClose}
            onChange={(checked) =>
              setShiftSettings((previous) => ({
                ...previous,
                prefillOpeningFromLastClose: checked,
              }))
            }
            icon={<Banknote className="size-4" aria-hidden />}
            title="Prefill opening float from last close"
            description="Fill denomination quantities from the previous closing count so the cashier can review and edit."
          />
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-cashier") ? (
        <PolicyPanel
          id="settings-cashier"
          eyebrow="Till · Permissions"
          title="Cashier capabilities"
          hint="What cashiers can do on the POS. Weighted marking is on by default."
          accent="emerald"
        >
          <div className="grid gap-2.5 lg:grid-cols-2">
            <PolicySwitch
              checked={cashierCapabilities.priceEdit}
              onChange={(checked) =>
                setCashierCapabilities((previous) => ({
                  ...previous,
                  priceEdit: checked,
                }))
              }
              icon={<ShoppingCart className="size-4" aria-hidden />}
              title="Allow cashiers to edit prices"
              description="Change unit prices on cart lines (override shelf price at checkout)."
            />
            <PolicySwitch
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
            <PolicySwitch
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
            <PolicySwitch
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
          </div>
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-pos-drafts") ? (
        <PolicyPanel
          id="settings-pos-drafts"
          eyebrow="Till · Drafts"
          title="POS drafts"
          hint="Save in-progress sales and review them from Sales → Pending carts."
          accent="violet"
        >
          <PolicySwitch
            checked={posDrafts.enabled}
            onChange={(checked) =>
              setPosDrafts((previous) => ({
                ...previous,
                enabled: checked,
              }))
            }
            icon={<ShoppingCart className="size-4" aria-hidden />}
            title="Enable POS draft persistence"
            description="Cashier carts sync to the server so staff can resume sales later."
          />
          <PolicySwitch
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
          <details className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-3.5 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Advanced rollout options
            </summary>
            <div className="mt-3 space-y-2.5">
              <PolicySwitch
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
              <PolicySwitch
                checked={posDrafts.offlineMirror}
                onChange={(checked) =>
                  setPosDrafts((previous) => ({
                    ...previous,
                    offlineMirror: checked,
                  }))
                }
                disabled={!posDrafts.enabled}
                title="Offline mirror"
                description="Keep a local IndexedDB copy when the register goes offline. Requires draft persistence."
              />
            </div>
          </details>
        </PolicyPanel>
      ) : null}

      {visibleIds.has("settings-trusted-tills") ? (
        <div id="settings-trusted-tills" className="scroll-mt-28">
          <TrustedTillsPanel
            branches={activeBranches}
            defaultBranchId={defaultBranchId}
          />
        </div>
      ) : null}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/25 bg-background/95 p-3 shadow-lg shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:static lg:bottom-auto lg:mx-0 lg:border-border/60 lg:shadow-sm">
        <p className="hidden text-[11px] text-muted-foreground sm:block lg:mr-auto">
          Saves inventory and till policies for this workspace.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-9 gap-1.5 rounded-xl px-4"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden />
                Save configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
