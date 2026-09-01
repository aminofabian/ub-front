import type { BusinessRecord } from "@/lib/api";
import { POS_DRAFT_FLAGS } from "@/lib/pos-draft-api";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { SHIFT_SETTINGS_FLAGS } from "@/lib/shift-settings";
import {
  DEFAULT_TILL_LISTEN,
  tillListenFromFlags,
  type TillListenSettings,
} from "@/lib/till-listen-settings";
import {
  DEFAULT_HUB_ALERTS,
  hubAlertsFromBusiness,
  type HubAlertSettings,
} from "@/lib/hub-alert-settings";
import type { BranchRecord } from "@/lib/api";
import {
  DEFAULT_FRONT_WINDOW_FORM,
  frontWindowFormFromLandingContent,
  type FrontWindowLandingForm,
} from "@/lib/front-window-landing";
import {
  DEFAULT_BRAND_POSTER_FORM,
  brandPosterFormFromLandingContent,
  type BrandPosterLandingForm,
} from "@/lib/brand-poster-landing";

export const MAX_FEATURED = 12;

export const TIER_SUGGESTIONS = ["starter", "growth", "enterprise"] as const;

export type EditableBusiness = {
  name: string;
  subscriptionTier: string;
  active: boolean;
};

export type StorefrontForm = {
  enabled: boolean;
  catalogBranchId: string;
  label: string;
  announcement: string;
  featuredLines: string;
  deliveryAreas: { id: string; name: string; active: boolean }[];
  storeThemeId: string;
  landingTemplateId: string;
  landingHeadline: string;
  landingSubheadline: string;
  landingPhone: string;
  landingWhatsapp: string;
  landingHours: string;
  landingAddress: string;
  landingCtaLabel: string;
  /** Front window template — section copy, photos, highlights. */
  frontWindow: FrontWindowLandingForm;
  /** Brand poster template — print details, tone, secondary photo. */
  brandPoster: BrandPosterLandingForm;
  /** "Orders on WhatsApp" (all themes, scope §7). */
  waCheckoutMode: "off" | "fallback" | "always";
  waGreeting: string;
  waExpiryMins: string;
};

export type InventoryForm = {
  showSystemStockToStockManager: boolean;
  dailyAuditSampleSize: number;
  morningStartsAt: string;
  morningEndsAt: string;
  eveningStartsAt: string;
  eveningEndsAt: string;
  allowStockEditForStockManager: boolean;
  allowStockEditForGroceryClerk: boolean;
  allowSpoilsForGroceryClerk: boolean;
  allowMinStockForGroceryClerk: boolean;
  allowParLevelForGroceryClerk: boolean;
  allowOrderPadForGroceryClerk: boolean;
  allowOrderConfirmForGroceryClerk: boolean;
  allowNegativeStock: boolean;
  allowActivityForStockManager: boolean;
  allowStockPageForStockManager: boolean;
  allowSupplierWriteForStockManager: boolean;
  allowSupplierWriteForCashier: boolean;
  allowLinkProductsForStockManager: boolean;
  allowLinkProductsForCashier: boolean;
  allowReceiveForCashier: boolean;
  allowReceiveForStockManager: boolean;
  allowReceiveForGroceryClerk: boolean;
  allowCashierTabClearance: boolean;
  requirePhoneVerificationForNewTabCustomers: boolean;
  allowCashierSearchCustomersByName: boolean;
  /** When true, POS shows an optional add/select customer step on cash/M-Pesa sales. Default off. */
  captureCustomerForCashAndMpesa: boolean;
  /** When true, product names show exactly as entered on Products, Stock, and POS. */
  preserveProductNameCasing: boolean;
};

export type PosDraftsForm = {
  enabled: boolean;
  uiVisible: boolean;
  shadowWrites: boolean;
  offlineMirror: boolean;
  scanToCart: boolean;
};

export type CashierCapabilitiesForm = {
  priceEdit: boolean;
  createProduct: boolean;
  weighedToggle: boolean;
  addPhoto: boolean;
  orderPad: boolean;
  orderConfirm: boolean;
  /** Cashiers may record cash drawouts from an open till. */
  drawout: boolean;
  /** Search-first list catalog on POS (vs classic product grid). */
  catalogHybrid: boolean;
  /** One-tap Clear sale beside Checkout / Pay on the till. */
  clearSale: boolean;
};

export type ShiftSettingsForm = {
  prefillOpeningFromLastClose: boolean;
};

export const DEFAULT_CASHIER_CAPABILITIES: CashierCapabilitiesForm = {
  priceEdit: false,
  createProduct: false,
  /** Default on — cashiers need this for produce/kg sales; admin can still disable. */
  weighedToggle: true,
  addPhoto: false,
  orderPad: true,
  orderConfirm: true,
  /** Default off — cash leaving the till is opt-in for cashiers. */
  drawout: false,
  /** Default off — keep classic grid for existing grocery tills. */
  catalogHybrid: false,
  /** Default on — cashiers can abandon a wrong sale in one tap. */
  clearSale: true,
};

export const DEFAULT_SHIFT_SETTINGS: ShiftSettingsForm = {
  prefillOpeningFromLastClose: false,
};

export function cashierCapabilitiesFromRecord(
  b: BusinessRecord | null,
): CashierCapabilitiesForm {
  const ff = b?.featureFlags ?? {};
  return {
    priceEdit: ff[POS_CASHIER_CAPABILITY_FLAGS.priceEdit] === true,
    createProduct: ff[POS_CASHIER_CAPABILITY_FLAGS.createProduct] === true,
    // Absent flag → enabled (matches DEFAULT_CASHIER_CAPABILITIES).
    weighedToggle: ff[POS_CASHIER_CAPABILITY_FLAGS.weighedToggle] !== false,
    addPhoto: ff[POS_CASHIER_CAPABILITY_FLAGS.addPhoto] === true,
    orderPad: ff[POS_CASHIER_CAPABILITY_FLAGS.orderPad] !== false,
    orderConfirm: ff[POS_CASHIER_CAPABILITY_FLAGS.orderConfirm] !== false,
    drawout: ff[POS_CASHIER_CAPABILITY_FLAGS.drawout] === true,
    catalogHybrid: ff[POS_CASHIER_CAPABILITY_FLAGS.catalogHybrid] === true,
    clearSale: ff[POS_CASHIER_CAPABILITY_FLAGS.clearSale] !== false,
  };
}

export function shiftSettingsFromRecord(
  b: BusinessRecord | null,
): ShiftSettingsForm {
  const ff = b?.featureFlags ?? {};
  return {
    prefillOpeningFromLastClose:
      ff[SHIFT_SETTINGS_FLAGS.prefillOpeningFromLastClose] === true,
  };
}

export const DEFAULT_EDITABLE: EditableBusiness = {
  name: "",
  subscriptionTier: "starter",
  active: true,
};

export const DEFAULT_STOREFRONT: StorefrontForm = {
  enabled: false,
  catalogBranchId: "",
  label: "",
  announcement: "",
  featuredLines: "",
  deliveryAreas: [],
  storeThemeId: "mart",
  landingTemplateId: "coming-soon-editorial",
  landingHeadline: "",
  landingSubheadline: "",
  landingPhone: "",
  landingWhatsapp: "",
  landingHours: "",
  landingAddress: "",
  landingCtaLabel: "",
  frontWindow: DEFAULT_FRONT_WINDOW_FORM,
  brandPoster: DEFAULT_BRAND_POSTER_FORM,
  waCheckoutMode: "fallback",
  waGreeting: "",
  waExpiryMins: "180",
};

export const DEFAULT_DAILY_AUDIT_SAMPLE_SIZE = 25;
export const MIN_DAILY_AUDIT_SAMPLE_SIZE = 1;
export const MAX_DAILY_AUDIT_SAMPLE_SIZE = 200;

export const DEFAULT_MORNING_STARTS_AT = "08:00";
export const DEFAULT_MORNING_ENDS_AT = "09:00";
export const DEFAULT_EVENING_STARTS_AT = "20:00";
export const DEFAULT_EVENING_ENDS_AT = "21:00";

export const DEFAULT_INVENTORY: InventoryForm = {
  showSystemStockToStockManager: false,
  dailyAuditSampleSize: DEFAULT_DAILY_AUDIT_SAMPLE_SIZE,
  morningStartsAt: DEFAULT_MORNING_STARTS_AT,
  morningEndsAt: DEFAULT_MORNING_ENDS_AT,
  eveningStartsAt: DEFAULT_EVENING_STARTS_AT,
  eveningEndsAt: DEFAULT_EVENING_ENDS_AT,
  allowStockEditForStockManager: false,
  /** Match backend: grocery counter Edit stock defaults on. */
  allowStockEditForGroceryClerk: true,
  /** Match backend: grocery counter Spoils defaults on. */
  allowSpoilsForGroceryClerk: true,
  /** Match backend: grocery min / reorder in Edit stock defaults on. */
  allowMinStockForGroceryClerk: true,
  /** Match backend: grocery order-up-to (par) in Edit stock defaults on. */
  allowParLevelForGroceryClerk: true,
  /** Match backend: grocery supplier Order defaults on. */
  allowOrderPadForGroceryClerk: true,
  /** Match backend: grocery Confirm orders defaults on. */
  allowOrderConfirmForGroceryClerk: true,
  allowNegativeStock: false,
  /** Match backend: Activity + Stock pages default on for stock managers. */
  allowActivityForStockManager: true,
  allowStockPageForStockManager: true,
  allowSupplierWriteForStockManager: false,
  allowSupplierWriteForCashier: false,
  allowLinkProductsForStockManager: false,
  allowLinkProductsForCashier: false,
  /** Match backend: receive stock defaults on for cashier / stock manager / grocery. */
  allowReceiveForCashier: true,
  allowReceiveForStockManager: true,
  allowReceiveForGroceryClerk: true,
  /** Match backend: cashier tab clearance defaults off. */
  allowCashierTabClearance: false,
  /** Match backend: phone verification for new tabs defaults on. */
  requirePhoneVerificationForNewTabCustomers: true,
  /** Match backend: name search on Tab checkout defaults off. */
  allowCashierSearchCustomersByName: false,
  /** Match backend: customer capture on cash/M-Pesa checkout defaults off. */
  captureCustomerForCashAndMpesa: false,
  /** Match backend: exact product names default on. */
  preserveProductNameCasing: true,
};

export const DEFAULT_POS_DRAFTS: PosDraftsForm = {
  enabled: false,
  uiVisible: false,
  shadowWrites: false,
  offlineMirror: false,
  scanToCart: false,
};

export function parseFeaturedLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_FEATURED);
}

export function posDraftsFromRecord(b: BusinessRecord | null): PosDraftsForm {
  const ff = b?.featureFlags ?? {};
  return {
    enabled: ff[POS_DRAFT_FLAGS.enabled] === true,
    uiVisible: ff[POS_DRAFT_FLAGS.uiVisible] === true,
    shadowWrites: ff[POS_DRAFT_FLAGS.shadowWrites] === true,
    offlineMirror: ff[POS_DRAFT_FLAGS.offlineMirror] === true,
    scanToCart: ff[POS_CASHIER_CAPABILITY_FLAGS.scanToCart] === true,
  };
}

export function tillListenSettingsFromRecord(
  b: BusinessRecord | null,
): TillListenSettings {
  return tillListenFromFlags(b?.featureFlags);
}

export function hubAlertSettingsFromRecord(
  b: BusinessRecord | null,
): HubAlertSettings {
  return hubAlertsFromBusiness({
    flags: b?.featureFlags,
    volume: b?.hubAlerts?.volume,
  });
}

export { DEFAULT_TILL_LISTEN, DEFAULT_HUB_ALERTS };
export type { TillListenSettings, HubAlertSettings };

export function defaultCatalogBranchId(
  branches: BranchRecord[],
  currentId: string,
): string {
  if (currentId.trim()) {
    return currentId.trim();
  }
  const active = branches.filter((b) => b.active);
  const pool = active.length > 0 ? active : branches;
  return pool[0]?.id ?? "";
}

export function storefrontFromRecord(
  b: BusinessRecord | null,
  branches: BranchRecord[] = [],
): StorefrontForm {
  const s = b?.storefront;
  const catalogBranchId = defaultCatalogBranchId(
    branches,
    String(s?.catalogBranchId ?? "").trim(),
  );
  const lc = s?.landingContent;
  return {
    enabled: Boolean(s?.enabled),
    catalogBranchId,
    label: String(s?.label ?? ""),
    announcement: String(s?.announcement ?? ""),
    featuredLines: (s?.featuredItemIds ?? []).join("\n"),
    deliveryAreas: (s?.deliveryAreas ?? []).map((area) => ({
      id: String(area.id ?? crypto.randomUUID()),
      name: String(area.name ?? "").trim(),
      active: area.active !== false,
    })),
    storeThemeId: String(s?.storeThemeId ?? "mart"),
    landingTemplateId: String(s?.landingTemplateId ?? "coming-soon-editorial"),
    landingHeadline: String(lc?.headline ?? ""),
    landingSubheadline: String(lc?.subheadline ?? ""),
    landingPhone: String(lc?.phone ?? ""),
    landingWhatsapp: String(lc?.whatsapp ?? ""),
    landingHours: String(lc?.hours ?? ""),
    landingAddress: String(lc?.address ?? ""),
    landingCtaLabel: String(lc?.ctaLabel ?? ""),
    frontWindow: frontWindowFormFromLandingContent(
      String(b?.name ?? b?.branding?.displayName ?? "Your shop"),
      lc ?? null,
    ),
    brandPoster: brandPosterFormFromLandingContent(
      String(b?.name ?? b?.branding?.displayName ?? "Your shop"),
      lc ?? null,
    ),
    waCheckoutMode:
      s?.whatsappCheckout?.mode === "always" || s?.whatsappCheckout?.mode === "off"
        ? s.whatsappCheckout.mode
        : "fallback",
    waGreeting: String(s?.whatsappCheckout?.greeting ?? ""),
    waExpiryMins: String(s?.whatsappCheckout?.expiryMins ?? 180),
  };
}

export const DEFAULT_WHATSAPP_EXPIRY_MINS = 180;
export const MIN_WHATSAPP_EXPIRY_MINS = 15;
export const MAX_WHATSAPP_EXPIRY_MINS = 10080;

/** Clamp the "hold stock for unconfirmed orders" window (scope §7). */
export function clampWhatsAppExpiryMins(raw: string | number): number {
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return DEFAULT_WHATSAPP_EXPIRY_MINS;
  return Math.max(
    MIN_WHATSAPP_EXPIRY_MINS,
    Math.min(MAX_WHATSAPP_EXPIRY_MINS, Math.round(n)),
  );
}

export function clampDailyAuditSampleSize(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_DAILY_AUDIT_SAMPLE_SIZE;
  }
  return Math.max(
    MIN_DAILY_AUDIT_SAMPLE_SIZE,
    Math.min(MAX_DAILY_AUDIT_SAMPLE_SIZE, Math.round(raw)),
  );
}

/** Normalize to HH:mm; invalid/blank → fallback. */
export function normalizeDailyAuditTime(
  raw: string | null | undefined,
  fallback: string,
): string {
  const value = (raw ?? "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) {
    return fallback;
  }
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return fallback;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isDailyAuditScheduleOrdered(
  morningStartsAt: string,
  morningEndsAt: string,
  eveningStartsAt: string,
  eveningEndsAt: string,
): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    toMinutes(morningStartsAt) < toMinutes(morningEndsAt) &&
    toMinutes(morningEndsAt) <= toMinutes(eveningStartsAt) &&
    toMinutes(eveningStartsAt) < toMinutes(eveningEndsAt)
  );
}

export function inventoryFromRecord(b: BusinessRecord | null): InventoryForm {
  const configuredSample = b?.inventory?.stocktake?.dailyAuditSampleSize;
  return {
    showSystemStockToStockManager: Boolean(
      b?.inventory?.stocktake?.showSystemStockToStockManager,
    ),
    dailyAuditSampleSize: clampDailyAuditSampleSize(
      typeof configuredSample === "number"
        ? configuredSample
        : DEFAULT_DAILY_AUDIT_SAMPLE_SIZE,
    ),
    morningStartsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.morningStartsAt,
      DEFAULT_MORNING_STARTS_AT,
    ),
    morningEndsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.morningEndsAt ??
        b?.inventory?.stocktake?.eveningStartsAt,
      DEFAULT_MORNING_ENDS_AT,
    ),
    eveningStartsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.eveningStartsAt,
      DEFAULT_EVENING_STARTS_AT,
    ),
    eveningEndsAt: normalizeDailyAuditTime(
      b?.inventory?.stocktake?.eveningEndsAt ??
        b?.inventory?.stocktake?.countingEndsAt,
      DEFAULT_EVENING_ENDS_AT,
    ),
    allowStockEditForStockManager: Boolean(
      b?.inventory?.stockLevels?.allowStockEditForStockManager,
    ),
    allowStockEditForGroceryClerk:
      b?.inventory?.stockLevels?.allowStockEditForGroceryClerk !== false,
    allowSpoilsForGroceryClerk:
      b?.inventory?.stockLevels?.allowSpoilsForGroceryClerk !== false,
    allowMinStockForGroceryClerk:
      b?.inventory?.stockLevels?.allowMinStockForGroceryClerk !== false,
    allowParLevelForGroceryClerk:
      b?.inventory?.stockLevels?.allowParLevelForGroceryClerk !== false,
    allowOrderPadForGroceryClerk:
      b?.inventory?.stockLevels?.allowOrderPadForGroceryClerk !== false,
    allowOrderConfirmForGroceryClerk:
      b?.inventory?.stockLevels?.allowOrderConfirmForGroceryClerk !== false,
    allowNegativeStock: Boolean(
      b?.inventory?.stockLevels?.allowNegativeStock,
    ),
    allowActivityForStockManager:
      b?.inventory?.stockLevels?.allowActivityForStockManager !== false,
    allowStockPageForStockManager:
      b?.inventory?.stockLevels?.allowStockPageForStockManager !== false,
    allowSupplierWriteForStockManager: Boolean(
      b?.inventory?.suppliers?.allowSupplierWriteForStockManager,
    ),
    allowSupplierWriteForCashier: Boolean(
      b?.inventory?.suppliers?.allowSupplierWriteForCashier,
    ),
    allowLinkProductsForStockManager: Boolean(
      b?.inventory?.suppliers?.allowLinkProductsForStockManager,
    ),
    allowLinkProductsForCashier: Boolean(
      b?.inventory?.suppliers?.allowLinkProductsForCashier,
    ),
    allowReceiveForCashier:
      b?.inventory?.receiveStock?.allowReceiveForCashier !== false,
    allowReceiveForStockManager:
      b?.inventory?.receiveStock?.allowReceiveForStockManager !== false,
    allowReceiveForGroceryClerk:
      b?.inventory?.receiveStock?.allowReceiveForGroceryClerk !== false,
    allowCashierTabClearance: Boolean(
      b?.inventory?.creditTabs?.allowCashierTabClearance,
    ),
    requirePhoneVerificationForNewTabCustomers:
      b?.inventory?.creditTabs?.requirePhoneVerificationForNewTabCustomers !==
      false,
    allowCashierSearchCustomersByName: Boolean(
      b?.inventory?.creditTabs?.allowCashierSearchCustomersByName,
    ),
    captureCustomerForCashAndMpesa: Boolean(
      b?.inventory?.checkout?.captureCustomerForCashAndMpesa,
    ),
    preserveProductNameCasing:
      b?.inventory?.catalog?.preserveProductNameCasing !== false,
  };
}

export function applyBusinessSnapshot(
  payload: BusinessRecord,
  branchList: BranchRecord[],
): {
  editable: EditableBusiness;
  storefront: StorefrontForm;
  inventory: InventoryForm;
  posDrafts: PosDraftsForm;
  cashierCapabilities: CashierCapabilitiesForm;
  shiftSettings: ShiftSettingsForm;
  tillListen: TillListenSettings;
  hubAlerts: HubAlertSettings;
} {
  return {
    editable: {
      name: String(payload.name ?? ""),
      subscriptionTier: String(payload.subscriptionTier ?? "starter"),
      active: Boolean(payload.active ?? true),
    },
    storefront: storefrontFromRecord(payload, branchList),
    inventory: inventoryFromRecord(payload),
    posDrafts: posDraftsFromRecord(payload),
    cashierCapabilities: cashierCapabilitiesFromRecord(payload),
    shiftSettings: shiftSettingsFromRecord(payload),
    tillListen: tillListenSettingsFromRecord(payload),
    hubAlerts: hubAlertSettingsFromRecord(payload),
  };
}
