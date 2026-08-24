import {
  ClipboardList,
  CreditCard,
  Package,
  Rocket,
  RotateCcw,
  ScanBarcode,
  Smartphone,
  Store,
  Truck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { HelpCategoryIcon } from "@/lib/help";

/** Lucide icon per help category — shared by the nav rail and the category grid. */
export const HELP_CATEGORY_ICONS: Record<HelpCategoryIcon, LucideIcon> = {
  rocket: Rocket,
  scan: ScanBarcode,
  smartphone: Smartphone,
  package: Package,
  store: Store,
  users: Users,
  user: User,
  truck: Truck,
  "credit-card": CreditCard,
  "rotate-ccw": RotateCcw,
  "clipboard-list": ClipboardList,
};
