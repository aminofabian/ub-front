"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  applyBusinessSnapshot,
  clampDailyAuditSampleSize,
  clampWhatsAppExpiryMins,
  isDailyAuditScheduleOrdered,
  normalizeDailyAuditTime,
  DEFAULT_MORNING_STARTS_AT,
  DEFAULT_MORNING_ENDS_AT,
  DEFAULT_EVENING_STARTS_AT,
  DEFAULT_EVENING_ENDS_AT,
  DEFAULT_CASHIER_CAPABILITIES,
  DEFAULT_EDITABLE,
  DEFAULT_INVENTORY,
  DEFAULT_POS_DRAFTS,
  DEFAULT_SHIFT_SETTINGS,
  DEFAULT_STOREFRONT,
  DEFAULT_TILL_LISTEN,
  DEFAULT_HUB_ALERTS,
  defaultCatalogBranchId,
  parseFeaturedLines,
  type CashierCapabilitiesForm,
  type EditableBusiness,
  type HubAlertSettings,
  type InventoryForm,
  type PosDraftsForm,
  type ShiftSettingsForm,
  type StorefrontForm,
  type TillListenSettings,
} from "@/components/business/business-settings-types";
import { useDashboard } from "@/components/dashboard-provider";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import {
  fetchBranches,
  fetchBusiness,
  updateBusiness,
  type BranchRecord,
  type BusinessRecord,
  type PatchBusinessPayload,
} from "@/lib/api";

const LOAD_TIMEOUT_MS = 20_000;

export type BusinessSettingsFeedback = {
  kind: "success" | "error";
  text: string;
};

export type BusinessSettingsSaveScope = "profile" | "operations" | "all";

export function useBusinessSettingsEditor() {
  const router = useRouter();
  const { canManageBusinessSettings, refreshSession } = useDashboard();
  const bootstrapBusiness = useSessionBootstrapSnapshot().business;
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [editable, setEditable] = useState<EditableBusiness>(DEFAULT_EDITABLE);
  const [storefront, setStorefront] =
    useState<StorefrontForm>(DEFAULT_STOREFRONT);
  const [inventory, setInventory] = useState<InventoryForm>(DEFAULT_INVENTORY);
  const [posDrafts, setPosDrafts] = useState<PosDraftsForm>(DEFAULT_POS_DRAFTS);
  const [cashierCapabilities, setCashierCapabilities] =
    useState<CashierCapabilitiesForm>(DEFAULT_CASHIER_CAPABILITIES);
  const [shiftSettings, setShiftSettings] = useState<ShiftSettingsForm>(
    DEFAULT_SHIFT_SETTINGS,
  );
  const [tillListen, setTillListen] =
    useState<TillListenSettings>(DEFAULT_TILL_LISTEN);
  const [hubAlerts, setHubAlerts] =
    useState<HubAlertSettings>(DEFAULT_HUB_ALERTS);
  const [feedback, setFeedback] = useState<BusinessSettingsFeedback | null>(
    null,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hydratedFromBootstrap = useRef(Boolean(bootstrapBusiness));
  const effectiveSnapshot = snapshot ?? bootstrapBusiness;

  const branchesRef = useRef<BranchRecord[]>([]);
  useEffect(() => {
    branchesRef.current = branches;
  }, [branches]);

  const load = useCallback(() => {
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Request timed out. Tap Try again.")),
        LOAD_TIMEOUT_MS,
      );
    });

    return Promise.race([fetchBusiness(), timeout])
      .then((payload) => {
        setLoadFailed(false);
        setFeedback(null);
        setSnapshot(payload);
        hydratedFromBootstrap.current = true;
        const next = applyBusinessSnapshot(payload, branchesRef.current);
        setEditable(next.editable);
        setStorefront(next.storefront);
        setInventory(next.inventory);
        setPosDrafts(next.posDrafts);
        setCashierCapabilities(next.cashierCapabilities);
        setShiftSettings(next.shiftSettings);
        setTillListen(next.tillListen);
        setHubAlerts(next.hubAlerts);
      })
      .catch((error) => {
        if (hydratedFromBootstrap.current) {
          return;
        }
        setLoadFailed(true);
        setSnapshot(null);
        setFeedback({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not load your business.",
        });
      });
  }, []);

  useEffect(() => {
    if (bootstrapBusiness) {
      hydratedFromBootstrap.current = true;
      setLoadFailed(false);
      setSnapshot(bootstrapBusiness);
      const next = applyBusinessSnapshot(bootstrapBusiness, branchesRef.current);
      setEditable(next.editable);
      setStorefront(next.storefront);
      setInventory(next.inventory);
      setPosDrafts(next.posDrafts);
      setCashierCapabilities(next.cashierCapabilities);
      setShiftSettings(next.shiftSettings);
      setTillListen(next.tillListen);
      setHubAlerts(next.hubAlerts);
    }
    void load();
  }, [load, bootstrapBusiness]);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    fetchBranches()
      .then((list) => {
        setBranches(list);
        setStorefront((prev) => {
          const catalogBranchId = defaultCatalogBranchId(
            list,
            prev.catalogBranchId,
          );
          if (catalogBranchId === prev.catalogBranchId) {
            return prev;
          }
          return { ...prev, catalogBranchId };
        });
      })
      .catch(() => setBranches([]));
  }, [canManageBusinessSettings]);

  useEffect(() => {
    if (branches.length === 0) {
      return;
    }
    setStorefront((prev) => {
      const catalogBranchId = defaultCatalogBranchId(
        branches,
        prev.catalogBranchId,
      );
      if (!catalogBranchId || catalogBranchId === prev.catalogBranchId) {
        return prev;
      }
      return { ...prev, catalogBranchId };
    });
  }, [branches]);

  const resetFormFromSnapshot = useCallback(() => {
    if (!effectiveSnapshot) {
      return;
    }
    const next = applyBusinessSnapshot(effectiveSnapshot, branches);
    setEditable(next.editable);
    setStorefront(next.storefront);
    setInventory(next.inventory);
    setPosDrafts(next.posDrafts);
    setCashierCapabilities(next.cashierCapabilities);
    setShiftSettings(next.shiftSettings);
    setTillListen(next.tillListen);
    setHubAlerts(next.hubAlerts);
  }, [effectiveSnapshot, branches]);

  const removeDeliveryArea = useCallback(
    async (areaId: string) => {
      if (!canManageBusinessSettings || isSaving) {
        return;
      }

      let previousAreas = storefront.deliveryAreas;
      let nextAreas = previousAreas;
      setStorefront((current) => {
        previousAreas = current.deliveryAreas;
        nextAreas = current.deliveryAreas.filter((area) => area.id !== areaId);
        if (nextAreas.length === previousAreas.length) {
          return current;
        }
        return { ...current, deliveryAreas: nextAreas };
      });
      if (nextAreas.length === previousAreas.length) {
        return;
      }

      setIsSaving(true);
      setFeedback(null);
      try {
        const deliveryAreas = nextAreas
          .map((area) => ({
            id: area.id.trim() || crypto.randomUUID(),
            name: area.name.trim(),
            active: area.active,
          }))
          .filter((area) => area.name.length > 0);

        await updateBusiness({ storefront: { deliveryAreas } });
        await refreshSession();
        router.refresh();
        setSnapshot((current) => {
          if (!current?.storefront) {
            return current;
          }
          return {
            ...current,
            storefront: {
              ...current.storefront,
              deliveryAreas,
            },
          };
        });
        setFeedback({
          kind: "success",
          text: "Delivery area removed.",
        });
      } catch (error) {
        setStorefront((current) => ({
          ...current,
          deliveryAreas: previousAreas,
        }));
        setFeedback({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not remove the delivery area.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [canManageBusinessSettings, isSaving, refreshSession, router],
  );

  const save = useCallback(
    async (scope: BusinessSettingsSaveScope = "all") => {
      setIsSaving(true);
      setFeedback(null);
      try {
        const morningStartsAt = normalizeDailyAuditTime(
          inventory.morningStartsAt,
          DEFAULT_MORNING_STARTS_AT,
        );
        const morningEndsAt = normalizeDailyAuditTime(
          inventory.morningEndsAt,
          DEFAULT_MORNING_ENDS_AT,
        );
        const eveningStartsAt = normalizeDailyAuditTime(
          inventory.eveningStartsAt,
          DEFAULT_EVENING_STARTS_AT,
        );
        const eveningEndsAt = normalizeDailyAuditTime(
          inventory.eveningEndsAt,
          DEFAULT_EVENING_ENDS_AT,
        );

        const includeProfile = scope === "profile" || scope === "all";
        const includeOperations = scope === "operations" || scope === "all";

        if (
          canManageBusinessSettings &&
          includeOperations &&
          !isDailyAuditScheduleOrdered(
            morningStartsAt,
            morningEndsAt,
            eveningStartsAt,
            eveningEndsAt,
          )
        ) {
          setFeedback({
            kind: "error",
            text: "Daily audit windows must satisfy morning start < morning end ≤ evening start < evening end.",
          });
          setIsSaving(false);
          return false;
        }

        const body: PatchBusinessPayload = {};
        if (includeProfile) {
          body.name = editable.name;
          body.subscriptionTier = editable.subscriptionTier;
          body.active = editable.active;
        }

        if (canManageBusinessSettings && includeProfile) {
          body.storefront = {
            enabled: storefront.enabled,
            catalogBranchId: storefront.enabled
              ? storefront.catalogBranchId.trim()
              : "",
            label: storefront.label.trim() || null,
            announcement: storefront.announcement.trim() || null,
            featuredItemIds: parseFeaturedLines(storefront.featuredLines),
            deliveryAreas: storefront.deliveryAreas
              .map((area) => ({
                id: area.id.trim() || crypto.randomUUID(),
                name: area.name.trim(),
                active: area.active,
              }))
              .filter((area) => area.name.length > 0),
            storeThemeId: storefront.storeThemeId.trim() || "mart",
            landingTemplateId:
              storefront.landingTemplateId.trim() || "coming-soon-editorial",
            landingContent: {
              headline: storefront.landingHeadline.trim() || null,
              subheadline: storefront.landingSubheadline.trim() || null,
              phone: storefront.landingPhone.trim() || null,
              whatsapp: storefront.landingWhatsapp.trim() || null,
              hours: storefront.landingHours.trim() || null,
              address: storefront.landingAddress.trim() || null,
              ctaLabel: storefront.landingCtaLabel.trim() || null,
            },
            whatsappCheckout: {
              mode: storefront.waCheckoutMode,
              greeting: storefront.waGreeting.trim() || null,
              expiryMins: clampWhatsAppExpiryMins(storefront.waExpiryMins),
            },
          };
        }

        if (canManageBusinessSettings && includeOperations) {
          body.inventory = {
            stocktake: {
              showSystemStockToStockManager:
                inventory.showSystemStockToStockManager,
              dailyAuditSampleSize: clampDailyAuditSampleSize(
                inventory.dailyAuditSampleSize,
              ),
              morningStartsAt,
              morningEndsAt,
              eveningStartsAt,
              eveningEndsAt,
            },
            stockLevels: {
              allowStockEditForStockManager:
                inventory.allowStockEditForStockManager,
              allowStockEditForGroceryClerk:
                inventory.allowStockEditForGroceryClerk,
              allowNegativeStock: inventory.allowNegativeStock,
              allowActivityForStockManager:
                inventory.allowActivityForStockManager,
              allowStockPageForStockManager:
                inventory.allowStockPageForStockManager,
              allowSpoilsForGroceryClerk: inventory.allowSpoilsForGroceryClerk,
              allowMinStockForGroceryClerk:
                inventory.allowMinStockForGroceryClerk,
              allowParLevelForGroceryClerk:
                inventory.allowParLevelForGroceryClerk,
              allowOrderPadForGroceryClerk:
                inventory.allowOrderPadForGroceryClerk,
              allowOrderConfirmForGroceryClerk:
                inventory.allowOrderConfirmForGroceryClerk,
            },
            suppliers: {
              allowSupplierWriteForStockManager:
                inventory.allowSupplierWriteForStockManager,
              allowSupplierWriteForCashier:
                inventory.allowSupplierWriteForCashier,
              allowLinkProductsForStockManager:
                inventory.allowLinkProductsForStockManager,
              allowLinkProductsForCashier:
                inventory.allowLinkProductsForCashier,
            },
            receiveStock: {
              allowReceiveForCashier: inventory.allowReceiveForCashier,
              allowReceiveForStockManager:
                inventory.allowReceiveForStockManager,
              allowReceiveForGroceryClerk:
                inventory.allowReceiveForGroceryClerk,
            },
            creditTabs: {
              allowCashierTabClearance: inventory.allowCashierTabClearance,
              requirePhoneVerificationForNewTabCustomers:
                inventory.requirePhoneVerificationForNewTabCustomers,
              allowCashierSearchCustomersByName:
                inventory.allowCashierSearchCustomersByName,
            },
          };
          body.featureFlags = {
            posDrafts: {
              enabled: posDrafts.enabled,
              uiVisible: posDrafts.uiVisible,
              shadowWrites: posDrafts.shadowWrites,
              offlineMirror: posDrafts.offlineMirror,
              scanToCart: posDrafts.scanToCart,
            },
            posCashierPriceEdit: cashierCapabilities.priceEdit,
            posCashierCreateProduct: cashierCapabilities.createProduct,
            posCashierWeighedToggle: cashierCapabilities.weighedToggle,
            posCashierAddPhoto: cashierCapabilities.addPhoto,
            posCashierOrderPad: cashierCapabilities.orderPad,
            posCashierOrderConfirm: cashierCapabilities.orderConfirm,
            posCatalogHybrid: cashierCapabilities.catalogHybrid,
            shiftsPrefillOpeningFromLastClose:
              shiftSettings.prefillOpeningFromLastClose,
            tillListen: {
              checkout: tillListen.checkout,
              openCart: tillListen.openCart,
              mpesaSelected: tillListen.mpesaSelected,
              storefront: tillListen.storefront,
            },
            hubAlerts: {
              beepOnSale: hubAlerts.beepOnSale,
              beepOnSupply: hubAlerts.beepOnSupply,
            },
          };
          body.hubAlerts = {
            volume: hubAlerts.volume,
          };
        }

        await updateBusiness(body);
        await refreshSession();
        router.refresh();
        const next = await fetchBusiness();
        setSnapshot(next);
        const applied = applyBusinessSnapshot(next, branches);
        setEditable(applied.editable);
        setStorefront(applied.storefront);
        setInventory(applied.inventory);
        setPosDrafts(applied.posDrafts);
        setCashierCapabilities(applied.cashierCapabilities);
        setShiftSettings(applied.shiftSettings);
        setTillListen(applied.tillListen);
        setHubAlerts(applied.hubAlerts);
        setFeedback({
          kind: "success",
          text:
            includeOperations && canManageBusinessSettings
              ? `Saved. Daily audit will sample ${applied.inventory.dailyAuditSampleSize} products sold yesterday.`
              : "Your changes were saved.",
        });
        return true;
      } catch (error) {
        setFeedback({
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving.",
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      branches,
      canManageBusinessSettings,
      cashierCapabilities,
      editable,
      inventory,
      posDrafts,
      refreshSession,
      router,
      shiftSettings,
      storefront,
      tillListen,
      hubAlerts,
    ],
  );

  const activeBranches = branches.filter((b) => b.active);
  const storefrontNeedsBranch =
    canManageBusinessSettings &&
    storefront.enabled &&
    (activeBranches.length === 0 || !storefront.catalogBranchId.trim());
  const isLoading = effectiveSnapshot === null && !loadFailed;

  return {
    canManageBusinessSettings,
    effectiveSnapshot,
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
    tillListen,
    setTillListen,
    hubAlerts,
    setHubAlerts,
    feedback,
    setFeedback,
    loadFailed,
    setLoadFailed,
    isSaving,
    isLoading,
    activeBranches,
    storefrontNeedsBranch,
    load,
    resetFormFromSnapshot,
    removeDeliveryArea,
    save,
  };
}
