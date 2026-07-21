import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Building2,
  ClipboardList,
  MonitorSmartphone,
  ShoppingCart,
  Store,
  Truck,
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

/** Inventory + till jump targets (Configuration page). */
export const BUSINESS_CONFIGURATION_NAV: BusinessSettingsNavItem[] = [
  { id: "settings-stock-take", label: "Stock take", group: "Inventory", icon: ClipboardList },
  { id: "settings-stock-levels", label: "Stock levels", group: "Inventory", icon: Warehouse },
  { id: "settings-receive", label: "Receive stock", group: "Inventory", icon: Truck },
  { id: "settings-credit-tabs", label: "Credit tabs", group: "Inventory", icon: Users },
  { id: "settings-suppliers", label: "Suppliers", group: "Inventory", icon: Truck },
  { id: "settings-shifts", label: "Shifts & cash", group: "Till", icon: Banknote },
  { id: "settings-cashier", label: "Cashier", group: "Till", icon: ShoppingCart },
  { id: "settings-pos-drafts", label: "POS drafts", group: "Till", icon: ClipboardList },
  {
    id: "settings-trusted-tills",
    label: "Trusted tills",
    group: "Till",
    icon: MonitorSmartphone,
  },
];

/** @deprecated Prefer BUSINESS_PROFILE_NAV / BUSINESS_CONFIGURATION_NAV */
export const BUSINESS_SETTINGS_NAV: BusinessSettingsNavItem[] = [
  ...BUSINESS_PROFILE_NAV,
  ...BUSINESS_CONFIGURATION_NAV,
];

export const BUSINESS_SETTINGS_NAV_GROUPS = ["Business", "Inventory", "Till"] as const;

export const BUSINESS_CONFIGURATION_NAV_GROUPS = ["Inventory", "Till"] as const;

export type ConfigurationWorkspace = "inventory" | "till";

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
    blurb: "Shifts, cashier powers, drafts, and trusted devices",
    groups: ["Till"],
  },
];
