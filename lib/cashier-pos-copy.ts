/**
 * Single place for cashier / POS UI strings (shelf price, tiles, status).
 * Swap this object at runtime or replace with i18n when you add translations.
 */
export type CashierPosUiCopy = {
  shelfHeading: string;
  modalOfflineShelfHint: string;
  modalShelfLoading: string;
  modalShelfNone: string;
  modalShelfUnavailable: string;
  unitPricePlaceholder: string;
  tileShelfLoading: string;
  tileShelfEmpty: string;
  offlinePill: string;
};

export const CASHIER_POS_UI_COPY: CashierPosUiCopy = {
  shelfHeading: "Shelf",
  modalOfflineShelfHint: "Offline · enter below",
  modalShelfLoading: "…",
  modalShelfNone: "No shelf price",
  modalShelfUnavailable: "—",
  unitPricePlaceholder: "Price",
  tileShelfLoading: "…",
  tileShelfEmpty: "—",
  offlinePill: "Offline",
};
