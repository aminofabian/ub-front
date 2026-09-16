import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  Building2,
  ClipboardList,
  MessageCircle,
  MonitorSmartphone,
  Package,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";

export type BusinessSettingsNavItem = {
  id: string;
  label: string;
  group: "Business" | "Inventory" | "Till";
  icon: LucideIcon;
};

/** Profile & storefront jump targets (Settings page). */
export const BUSINESS_PROFILE_NAV: BusinessSettingsNavItem[] = [
  { id: "settings-profile", label: "Profile", group: "Business", icon: Building2 },
  { id: "settings-storefront", label: "Storefront", group: "Business", icon: Store },
];

/** Titles and hints for settings theatre roster / focus pane. */
export const PROFILE_SECTION_META: Record<
  string,
  { title: string; hint: string }
> = {
  "settings-profile": {
    title: "Profile & billing",
    hint: "How your business appears internally, plan label, and whether the shop is live.",
  },
  "settings-storefront": {
    title: "Online storefront",
    hint: "Public catalog, landing page, WhatsApp orders, delivery areas, and catalog branch.",
  },
};

/** Inventory + till jump targets (Configuration page). */
export const BUSINESS_CONFIGURATION_NAV: BusinessSettingsNavItem[] = [
  { id: "settings-stock-take", label: "Stock take", group: "Inventory", icon: ClipboardList },
  { id: "settings-stock-levels", label: "Stock levels", group: "Inventory", icon: Warehouse },
  { id: "settings-catalog", label: "Product names", group: "Inventory", icon: Package },
  { id: "settings-receive", label: "Receive stock", group: "Inventory", icon: Truck },
  { id: "settings-credit-tabs", label: "Credit tabs", group: "Inventory", icon: Users },
  { id: "settings-suppliers", label: "Suppliers", group: "Inventory", icon: Truck },
  { id: "settings-shifts", label: "Shifts & cash", group: "Till", icon: Banknote },
  { id: "settings-checkout", label: "Checkout", group: "Till", icon: UserRound },
  { id: "settings-cashier", label: "Cashier", group: "Till", icon: ShoppingCart },
  { id: "settings-pos-drafts", label: "Pending carts", group: "Till", icon: ClipboardList },
  {
    id: "settings-trusted-tills",
    label: "Trusted tills",
    group: "Till",
    icon: MonitorSmartphone,
  },
  {
    id: "settings-till-listen",
    label: "M-Pesa listen",
    group: "Till",
    icon: ShoppingCart,
  },
  {
    id: "settings-hub-alerts",
    label: "Hub alerts",
    group: "Till",
    icon: Bell,
  },
];

/** Always listed on Configuration (Inventory + Till workspaces). */
export const BUSINESS_OPS_ALERT_NAV: BusinessSettingsNavItem = {
  id: "settings-whatsapp-alerts",
  label: "WhatsApp alerts",
  group: "Till",
  icon: MessageCircle,
};

/** @deprecated Prefer BUSINESS_PROFILE_NAV / BUSINESS_CONFIGURATION_NAV */
export const BUSINESS_SETTINGS_NAV: BusinessSettingsNavItem[] = [
  ...BUSINESS_PROFILE_NAV,
  ...BUSINESS_CONFIGURATION_NAV,
  BUSINESS_OPS_ALERT_NAV,
];

export const BUSINESS_SETTINGS_NAV_GROUPS = ["Business", "Inventory", "Till"] as const;

export const BUSINESS_CONFIGURATION_NAV_GROUPS = ["Inventory", "Till"] as const;

export type ConfigurationWorkspace = "inventory" | "till";

/** Titles and hints for configuration theatre roster / focus pane. */
export const CONFIGURATION_SECTION_META: Record<
  string,
  { title: string; hint: string }
> = {
  "settings-stock-take": {
    title: "Stock take & daily audit",
    hint: "How many SKUs get sampled overnight, when counts happen, and what stock managers can see while counting.",
  },
  "settings-stock-levels": {
    title: "Stock levels",
    hint: "Who can change quantities, and whether the till may oversell.",
  },
  "settings-catalog": {
    title: "Product names",
    hint: "How product titles read on Products, Stock, and POS.",
  },
  "settings-receive": {
    title: "Receive stock",
    hint: "Who can post supplier deliveries into on-hand.",
  },
  "settings-credit-tabs": {
    title: "Credit tabs",
    hint: "Cashier access to customer tab balances and clearance requests.",
  },
  "settings-suppliers": {
    title: "Suppliers",
    hint: "Who can create supplier profiles and link catalog products.",
  },
  "settings-shifts": {
    title: "Shifts & cash drawer",
    hint: "How opening float is prepared when a cashier starts a shift.",
  },
  "settings-checkout": {
    title: "Checkout",
    hint: "Attach repeat cash and M-Pesa sales to the customer directory.",
  },
  "settings-cashier": {
    title: "Cashier capabilities",
    hint: "What cashiers can do on the POS. Weighted marking is on by default.",
  },
  "settings-pos-drafts": {
    title: "Live pending carts",
    hint: "Save in-progress till carts so admins can watch live from Sales → Pending carts.",
  },
  "settings-trusted-tills": {
    title: "Trusted tills",
    hint: "Register devices that may open the till without repeating trust prompts.",
  },
  "settings-till-listen": {
    title: "When to listen for till payments",
    hint: "Buy Goods webhooks can auto-confirm sales. Default is checkout only — turn on earlier surfaces if cashiers pay before opening pay.",
  },
  "settings-hub-alerts": {
    title: "Live beeps on /business",
    hint: "When the Morning board is open, play a short chime for new activity. Click the page once so the browser allows sound.",
  },
  [BUSINESS_OPS_ALERT_NAV.id]: {
    title: "WhatsApp alerts",
    hint: "Text alerts to your phone for sales, supplies, tab activity, and other ops events.",
  },
};

export const CONFIGURATION_WORKSPACES: {
  id: ConfigurationWorkspace;
  label: string;
  blurb: string;
  groups: readonly ("Inventory" | "Till")[];
}[] = [
  {
    id: "inventory",
    label: "Inventory",
    blurb: "Counts, stock rules, receiving, and suppliers",
    groups: ["Inventory"],
  },
  {
    id: "till",
    label: "Till & POS",
    blurb: "Shifts, cashier powers, hub beeps, WhatsApp alerts, M-Pesa listen, drafts, and trusted devices",
    groups: ["Till"],
  },
];
