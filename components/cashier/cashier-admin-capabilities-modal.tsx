"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { fetchUsers, updateBusiness, type UserRecord } from "@/lib/api";
import { CASHIER_TEMPLATES, type CashierTemplateId } from "@/lib/cashier-templates";
import { useCashierTemplate } from "@/hooks/use-cashier-template";
import {
  cashierDrawoutScopeFromAccess,
  cashierDrawoutUserIdsFromAccess,
  isTillCashierRole,
  type CashierDrawoutAccess,
  type CashierDrawoutScope,
} from "@/lib/pos-cashier-capabilities";
import { cn } from "@/lib/utils";

type CashierAdminCapabilitiesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTheme: CSSProperties;
  priceEditEnabled: boolean;
  createProductEnabled: boolean;
  weighedToggleEnabled: boolean;
  addPhotoEnabled: boolean;
  orderPadEnabled: boolean;
  orderConfirmEnabled: boolean;
  drawoutEnabled: boolean;
  drawoutAccess?: CashierDrawoutAccess | null;
  catalogHybridEnabled: boolean;
  branchId?: string | null;
  onSaved: () => Promise<void> | void;
};

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const other = new Set(b.map((id) => id.toLowerCase()));
  return a.every((id) => other.has(id.toLowerCase()));
}

export function CashierAdminCapabilitiesModal({
  open,
  onOpenChange,
  brandTheme,
  priceEditEnabled,
  createProductEnabled,
  weighedToggleEnabled,
  addPhotoEnabled,
  orderPadEnabled,
  orderConfirmEnabled,
  drawoutEnabled,
  drawoutAccess = null,
  catalogHybridEnabled,
  branchId = null,
  onSaved,
}: CashierAdminCapabilitiesModalProps) {
  const savedScope = cashierDrawoutScopeFromAccess(drawoutAccess);
  const savedUserIds = cashierDrawoutUserIdsFromAccess(drawoutAccess);
  const [priceEdit, setPriceEdit] = useState(priceEditEnabled);
  const [createProduct, setCreateProduct] = useState(createProductEnabled);
  const [weighedToggle, setWeighedToggle] = useState(weighedToggleEnabled);
  const [addPhoto, setAddPhoto] = useState(addPhotoEnabled);
  const [orderPad, setOrderPad] = useState(orderPadEnabled);
  const [orderConfirm, setOrderConfirm] = useState(orderConfirmEnabled);
  const [drawout, setDrawout] = useState(drawoutEnabled);
  const [drawoutScope, setDrawoutScope] = useState<CashierDrawoutScope>(savedScope);
  const [drawoutUserIds, setDrawoutUserIds] = useState<string[]>(savedUserIds);
  const [staff, setStaff] = useState<UserRecord[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [catalogHybrid, setCatalogHybrid] = useState(catalogHybridEnabled);
  const [saving, setSaving] = useState(false);
  const { preferred, setTemplate } = useCashierTemplate(branchId);

  useEffect(() => {
    if (!open) return;
    setPriceEdit(priceEditEnabled);
    setCreateProduct(createProductEnabled);
    setWeighedToggle(weighedToggleEnabled);
    setAddPhoto(addPhotoEnabled);
    setOrderPad(orderPadEnabled);
    setOrderConfirm(orderConfirmEnabled);
    setDrawout(drawoutEnabled);
    setDrawoutScope(cashierDrawoutScopeFromAccess(drawoutAccess));
    setDrawoutUserIds(cashierDrawoutUserIdsFromAccess(drawoutAccess));
    setCatalogHybrid(catalogHybridEnabled);
  }, [
    open,
    priceEditEnabled,
    createProductEnabled,
    weighedToggleEnabled,
    addPhotoEnabled,
    orderPadEnabled,
    orderConfirmEnabled,
    drawoutEnabled,
    drawoutAccess,
    catalogHybridEnabled,
  ]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStaffLoading(true);
    setStaffError(null);
    void fetchUsers({ status: "active" })
      .then((rows) => {
        if (cancelled) return;
        setStaff(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setStaff([]);
        setStaffError("Could not load people. You can still allow all cashiers.");
      })
      .finally(() => {
        if (!cancelled) setStaffLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectableStaff = useMemo(() => {
    const selected = new Set(drawoutUserIds);
    const till = staff.filter((u) => isTillCashierRole(u.role?.key));
    const extra = staff.filter(
      (u) => !isTillCashierRole(u.role?.key) && selected.has(u.id),
    );
    const byName = (a: UserRecord, b: UserRecord) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || "", undefined, {
        sensitivity: "base",
      });
    return [...till.sort(byName), ...extra.sort(byName)];
  }, [staff, drawoutUserIds]);

  const dirty =
    priceEdit !== priceEditEnabled ||
    createProduct !== createProductEnabled ||
    weighedToggle !== weighedToggleEnabled ||
    addPhoto !== addPhotoEnabled ||
    orderPad !== orderPadEnabled ||
    orderConfirm !== orderConfirmEnabled ||
    drawout !== drawoutEnabled ||
    drawoutScope !== savedScope ||
    !sameIdSet(drawoutUserIds, savedUserIds) ||
    catalogHybrid !== catalogHybridEnabled;

  const toggleDrawoutUser = (userId: string) => {
    setDrawoutUserIds((prev) => {
      const has = prev.some((id) => id.toLowerCase() === userId.toLowerCase());
      return has
        ? prev.filter((id) => id.toLowerCase() !== userId.toLowerCase())
        : [...prev, userId];
    });
  };

  const onSave = async () => {
    if (!dirty) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await updateBusiness({
        featureFlags: {
          posCashierPriceEdit: priceEdit,
          posCashierCreateProduct: createProduct,
          posCashierWeighedToggle: weighedToggle,
          posCashierAddPhoto: addPhoto,
          posCashierOrderPad: orderPad,
          posCashierOrderConfirm: orderConfirm,
          posCashierDrawout: drawout,
          posCashierDrawoutAccess: {
            scope: drawoutScope,
            userIds: drawoutUserIds,
          },
          posCatalogHybrid: catalogHybrid,
        },
      });
      await onSaved();
      toast.success("Till settings updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save cashier permissions",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="right"
        overlayClassName="bg-black/45 backdrop-blur-[3px] dark:bg-black/55"
        className={cn(
          "gap-0 overflow-hidden p-0",
          "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_92%,white)]",
          "dark:bg-background",
        )}
        style={brandTheme}
      >
        <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-5 pb-4 pt-5 pr-12">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-[1.0625rem] tracking-[-0.02em]">
              <Settings2
                className="size-4 text-[var(--pos-primary)]"
                aria-hidden
              />
              Till settings
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              What cashiers may do on this shop, and how this register looks.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <SettingSection title="Selling">
            <SettingToggle
              title="Edit prices"
              description="Change the unit price on a cart line."
              checked={priceEdit}
              onCheckedChange={setPriceEdit}
            />
            <SettingToggle
              title="Add products"
              description="Create a simple item and add it to the cart."
              checked={createProduct}
              onCheckedChange={setCreateProduct}
            />
            <SettingToggle
              title="Sell by weight"
              description="Enter quantity in kilograms on a line."
              checked={weighedToggle}
              onCheckedChange={setWeighedToggle}
            />
            <SettingToggle
              title="Add photos"
              description="Owners and admins can fill missing shelf photos."
              checked={addPhoto}
              onCheckedChange={setAddPhoto}
            />
          </SettingSection>

          <SettingSection title="Cash">
            <SettingToggle
              title="Drawouts"
              description="Cashiers can pull cash from an open till. Larger amounts still need your approval."
              checked={drawout}
              onCheckedChange={setDrawout}
            />
            {drawout ? (
              <div className="px-3.5 py-3">
                <p className="text-[13px] font-medium leading-snug text-foreground">
                  Who
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                  Owners, admins, and managers always can. Pick cashiers below,
                  or allow every cashier.
                </p>
                <ChoicePair className="mt-3" ariaLabel="Who may record drawouts">
                  <Choice
                    selected={drawoutScope === "all"}
                    title="All cashiers"
                    hint="Anyone on a till"
                    onSelect={() => setDrawoutScope("all")}
                  />
                  <Choice
                    selected={drawoutScope === "selected"}
                    title="Selected people"
                    hint="Only the names you tick"
                    onSelect={() => setDrawoutScope("selected")}
                  />
                </ChoicePair>
                {drawoutScope === "selected" ? (
                  <div className="mt-3">
                    {staffLoading ? (
                      <p className="text-[12px] text-muted-foreground">
                        Loading people…
                      </p>
                    ) : staffError ? (
                      <p className="text-[12px] text-muted-foreground">{staffError}</p>
                    ) : selectableStaff.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground">
                        No cashiers to pick yet. Add a cashier user first.
                      </p>
                    ) : (
                      <ul className="max-h-56 overflow-y-auto rounded-lg border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/60">
                        {selectableStaff.map((user) => {
                          const checked = drawoutUserIds.some(
                            (id) => id.toLowerCase() === user.id.toLowerCase(),
                          );
                          const roleName =
                            user.role?.name?.trim() ||
                            user.role?.key?.replace(/_/g, " ") ||
                            "Staff";
                          return (
                            <li
                              key={user.id}
                              className="flex cursor-pointer items-center gap-3 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2.5 last:border-b-0 dark:border-border/50"
                              onClick={(e) => {
                                if (
                                  (e.target as HTMLElement).closest(
                                    '[data-slot="switch"]',
                                  )
                                ) {
                                  return;
                                }
                                toggleDrawoutUser(user.id);
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium text-foreground">
                                  {user.name?.trim() || user.email}
                                </p>
                                <p className="truncate text-[11.5px] text-muted-foreground">
                                  {roleName}
                                </p>
                              </div>
                              <Switch
                                checked={checked}
                                onCheckedChange={() => toggleDrawoutUser(user.id)}
                                aria-label={`Allow drawouts for ${user.name?.trim() || user.email}`}
                                className="data-checked:bg-[var(--pos-primary)]"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {drawoutScope === "selected" &&
                    !staffLoading &&
                    drawoutUserIds.length === 0 ? (
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        No one selected — cashiers will not see Drawout until you
                        tick at least one name.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </SettingSection>

          <SettingSection title="Suppliers">
            <SettingToggle
              title="Order"
              description="Place a supplier order from the till."
              checked={orderPad}
              onCheckedChange={setOrderPad}
            />
            <SettingToggle
              title="Confirm"
              description="Receive a supplier order from the till."
              checked={orderConfirm}
              onCheckedChange={setOrderConfirm}
            />
          </SettingSection>

          <SettingSection
            title="This register"
            hint="Layout applies on this till immediately. Catalog layout saves with the rest."
          >
            <div className="px-3.5 py-3">
              <p className="text-[13px] font-medium leading-snug text-foreground">
                Till layout
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                Shelf for picture tiles. Ledger for a spreadsheet till — needs a
                wide screen; phones stay on Shelf.
              </p>
              <ChoicePair
                className="mt-3"
                ariaLabel="This till cashier layout"
              >
                {CASHIER_TEMPLATES.map((t) => (
                  <Choice
                    key={t.id}
                    selected={preferred === t.id}
                    title={t.name}
                    hint={t.blurb}
                    onSelect={() => void setTemplate(t.id as CashierTemplateId)}
                  />
                ))}
              </ChoicePair>
            </div>
            <div className="border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3.5 py-3">
              <p className="text-[13px] font-medium leading-snug text-foreground">
                Product shelf
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                Grid for visual retail. Hybrid for scan-first, SKU-heavy catalogs.
              </p>
              <ChoicePair
                className="mt-3"
                ariaLabel="POS product shelf layout"
              >
                <Choice
                  selected={!catalogHybrid}
                  title="Grid"
                  hint="Picture tiles"
                  onSelect={() => setCatalogHybrid(false)}
                />
                <Choice
                  selected={catalogHybrid}
                  title="Hybrid"
                  hint="Scan · search list"
                  onSelect={() => setCatalogHybrid(true)}
                />
              </ChoicePair>
            </div>
          </SettingSection>
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_78%,white)] px-5 py-3 dark:bg-background">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void onSave()}
            className="min-w-[5.5rem] bg-[var(--pos-primary)] text-[var(--pos-primary-foreground,#fff)] hover:bg-[var(--pos-primary)]/90 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2 text-[13px] font-semibold tracking-[-0.015em] text-[var(--pos-ink,#1c1915)] dark:text-foreground">
        {title}
      </h3>
      {hint ? (
        <p className="-mt-1 mb-2 text-[11.5px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]",
          "bg-[color-mix(in_srgb,var(--card)_86%,white)]",
          "dark:border-border/60 dark:bg-card",
        )}
      >
        <div className="divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:divide-border/50">
          {children}
        </div>
      </div>
    </section>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div
      className="flex cursor-pointer items-start gap-3 px-3.5 py-3"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-slot="switch"]')) return;
        onCheckedChange(!checked);
      }}
    >
      <div className="min-w-0 flex-1">
        <p
          id={id}
          className="text-[13px] font-medium leading-snug tracking-[-0.012em] text-foreground"
        >
          {title}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={id}
        className="mt-0.5 data-checked:bg-[var(--pos-primary)]"
      />
    </div>
  );
}

function ChoicePair({
  ariaLabel,
  className,
  children,
}: {
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-1.5", className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

function Choice({
  selected,
  title,
  hint,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
        selected
          ? "bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--pos-primary)_38%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] ring-1 ring-inset ring-transparent hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
      )}
    >
      <span className="block text-[13px] font-semibold tracking-[-0.015em] text-foreground">
        {title}
      </span>
      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
        {hint}
      </span>
    </button>
  );
}
