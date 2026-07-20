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

/** Jump targets for the settings page sidebar / mobile chips. */
export const BUSINESS_SETTINGS_NAV: BusinessSettingsNavItem[] = [
  { id: "settings-profile", label: "Profile", group: "Business", icon: Building2 },
  { id: "settings-storefront", label: "Storefront", group: "Business", icon: Store },
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

export const BUSINESS_SETTINGS_NAV_GROUPS = ["Business", "Inventory", "Till"] as const;
