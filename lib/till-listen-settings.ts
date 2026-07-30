/** Business feature flags: when Buy Goods till listening starts on POS / storefront. */
export const TILL_LISTEN_FLAGS = {
  /** Default ON — listen when checkout / pay drawer opens. */
  checkout: "pos.till_listen_checkout",
  /** Default OFF — listen on any open cart tab with a total. */
  openCart: "pos.till_listen_open_cart",
  /** Default OFF — listen when M-Pesa tender is selected. */
  mpesaSelected: "pos.till_listen_mpesa",
  /** Default ON — listen on storefront cart preview + checkout. */
  storefront: "storefront.till_listen",
} as const;

export type TillListenSettings = {
  checkout: boolean;
  openCart: boolean;
  mpesaSelected: boolean;
  storefront: boolean;
};

export const DEFAULT_TILL_LISTEN: TillListenSettings = {
  checkout: true,
  openCart: false,
  mpesaSelected: false,
  storefront: true,
};

export function tillListenFromFlags(
  flags: Record<string, boolean> | null | undefined,
): TillListenSettings {
  const ff = flags ?? {};
  return {
    checkout: ff[TILL_LISTEN_FLAGS.checkout] !== false,
    openCart: ff[TILL_LISTEN_FLAGS.openCart] === true,
    mpesaSelected: ff[TILL_LISTEN_FLAGS.mpesaSelected] === true,
    storefront: ff[TILL_LISTEN_FLAGS.storefront] !== false,
  };
}

/** Whether POS should register a till-await given current surface state. */
export function shouldListenOnPos(
  settings: TillListenSettings,
  opts: {
    checkoutDrawerOpen: boolean;
    hasOpenCartTotal: boolean;
    mpesaSelected: boolean;
  },
): boolean {
  if (settings.checkout && opts.checkoutDrawerOpen) return true;
  if (settings.openCart && opts.hasOpenCartTotal) return true;
  if (settings.mpesaSelected && opts.mpesaSelected) return true;
  return false;
}
