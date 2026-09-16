"use client";

import {
  ClipboardCheck,
  ClipboardList,
  LogOut,
  PackagePlus,
  PlusCircle,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type {
  CashierMobileTool,
  CashierMobileToolId,
} from "@/lib/cashier-mobile-events";

export const CASHIER_TOOL_ICONS: Record<CashierMobileToolId, LucideIcon> = {
  "add-product": PackagePlus,
  suppliers: Truck,
  "credit-tabs": Users,
  "order-pad": ClipboardList,
  "supplier-order": ShoppingCart,
  "order-confirm": ClipboardCheck,
  airtime: Smartphone,
  drawout: Wallet,
  "open-shift": PlusCircle,
  "close-shift": LogOut,
};

/** Menu section headers, in the order a sale moves through them. */
export const CASHIER_TOOL_SECTIONS = [
  { id: "sale", label: "This sale" },
  { id: "stock", label: "Stock" },
  { id: "shift", label: "Shift" },
] as const;

export type CashierToolCapabilities = {
  allowCreditTabs: boolean;
  allowAirtime: boolean;
  allowOrderPad: boolean;
  allowCreateProduct: boolean;
  allowManageSuppliers: boolean;
  allowSupplierOrder: boolean;
  allowOrderConfirm: boolean;
  posShiftLinks: {
    branchSelected: boolean;
    hasOpenShift: boolean;
    canDrawout: boolean;
    canOpenShift: boolean;
    canCloseShift: boolean;
  } | null;
};

/**
 * Everything this till can do besides selling, in one list.
 *
 * Both templates read from here — the shelf renders it as tiles in the mobile
 * till menu, the ledger as rows in its own menu — so an action can never exist
 * in one cashier chrome and be missing from the other.
 */
export function buildCashierTools(
  caps: CashierToolCapabilities,
): CashierMobileTool[] {
  const tools: CashierMobileTool[] = [];

  if (caps.allowCreditTabs) {
    tools.push({
      id: "credit-tabs",
      label: "Credit tabs",
      hint: "Put this sale on a customer's tab",
      section: "sale",
    });
  }
  if (caps.allowAirtime) {
    tools.push({
      id: "airtime",
      label: "Airtime",
      hint: "Sell M-Pesa airtime or data bundles",
      section: "sale",
    });
  }
  if (caps.allowOrderPad) {
    tools.push({
      id: "order-pad",
      label: "Order pad",
      hint: "Jot what to buy — the whole branch sees it",
      section: "sale",
    });
  }
  if (caps.allowCreateProduct) {
    tools.push({
      id: "add-product",
      label: "Add product",
      hint: "Create an item that is not in the catalog yet",
      section: "stock",
    });
  }
  if (caps.allowManageSuppliers) {
    tools.push({
      id: "suppliers",
      label: "Suppliers",
      hint: "Vendors, contacts, and till deliveries",
      section: "stock",
    });
  }
  if (caps.allowSupplierOrder) {
    tools.push({
      id: "supplier-order",
      label: "Order",
      hint: "Raise a purchase order for stock",
      section: "stock",
    });
  }
  if (caps.allowOrderConfirm) {
    tools.push({
      id: "order-confirm",
      label: "Confirm",
      hint: "Receive goods from an open supplier order",
      section: "stock",
    });
  }

  const shift = caps.posShiftLinks;
  if (shift?.branchSelected) {
    if (shift.canDrawout && shift.hasOpenShift) {
      tools.push({
        id: "drawout",
        label: "Drawout",
        hint: "Take cash out of the till",
        section: "shift",
      });
    }
    if (shift.canOpenShift && !shift.hasOpenShift) {
      tools.push({
        id: "open-shift",
        label: "Open shift",
        hint: "Start a shift and enter the opening float",
        section: "shift",
      });
    }
    if (shift.canCloseShift && shift.hasOpenShift) {
      tools.push({
        id: "close-shift",
        label: "Close shift",
        hint: "Count the drawer and close the shift",
        section: "shift",
        tone: "danger",
      });
    }
  }

  return tools;
}
