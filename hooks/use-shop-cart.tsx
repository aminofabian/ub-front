"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  WEB_CART_CHANGED_EVENT,
  clearWebCartHandle,
  deleteWebCartLine,
  ensureWebCartId,
  fetchWebCart,
  notifyShopItemAdded,
  notifyWebCartChanged,
  readWebCartHandle,
  type PublicWebCart,
  upsertWebCartLine,
} from "@/lib/web-cart";

/** Whole-unit quantity from API (may arrive as decimal). */
export function cartLineQuantity(qty: number): number {
  const n = Number(qty);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export function findCartLine(cart: PublicWebCart | null, itemId: string) {
  const id = itemId.trim();
  return cart?.lines.find((l) => l.itemId === id) ?? null;
}

type ShopCartContextValue = {
  slug: string;
  cart: PublicWebCart | null;
  loading: boolean;
  error: string | null;
  lineCount: number;
  itemCount: number;
  drawerOpen: boolean;
  checkoutOpen: boolean;
  /** When set, mobile float shows only this line until user expands. */
  focusItemId: string | null;
  cartViewMode: "focus" | "all";
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  showAllCartItems: () => void;
  refresh: () => Promise<void>;
  /** Set absolute line quantity (0 removes). Updates shared cart state immediately. */
  setLineQty: (itemId: string, quantity: number) => Promise<void>;
  changeQty: (itemId: string, nextQty: number) => Promise<void>;
  removeLine: (itemId: string) => Promise<void>;
  /** Open cart focused on the product just added (mobile-friendly). */
  notifyAdded: (itemId: string) => void;
};

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

export function ShopCartProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<PublicWebCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [cartViewMode, setCartViewMode] = useState<"focus" | "all">("all");

  const applyCart = useCallback((next: PublicWebCart | null) => {
    setCart(next);
    setLoading(false);
  }, []);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const s = slug.trim();
      if (!s) {
        applyCart(null);
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      const h = readWebCartHandle();
      if (!h || h.slug !== s) {
        applyCart(null);
        return;
      }
      const data = await fetchWebCart(s, h.cartId);
      if (!data) {
        clearWebCartHandle();
        applyCart(null);
        return;
      }
      applyCart(data);
    },
    [slug, applyCart],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh({ silent: true });
    window.addEventListener(WEB_CART_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(WEB_CART_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refresh]);

  const lineCount = cart?.lines.length ?? 0;
  const itemCount = useMemo(
    () =>
      cart?.lines.reduce((sum, line) => sum + cartLineQuantity(line.quantity), 0) ?? 0,
    [cart],
  );

  const setLineQty = useCallback(
    async (itemId: string, quantity: number) => {
      const s = slug.trim();
      const id = itemId.trim();
      const q = Math.max(0, Math.round(quantity));
      if (!s || !id) return;

      setError(null);
      const handle = readWebCartHandle();
      let cartId = handle?.slug === s ? handle.cartId : null;
      if (!cartId) {
        cartId = (await ensureWebCartId(s)) ?? null;
      }
      if (!cartId) {
        setError("Could not start a cart.");
        return;
      }

      try {
        if (q <= 0) {
          const next = await deleteWebCartLine(s, cartId, id);
          if (!next) {
            clearWebCartHandle();
            applyCart(null);
            notifyWebCartChanged();
            return;
          }
          applyCart(next);
          notifyWebCartChanged();
          return;
        }

        let next = await upsertWebCartLine(s, cartId, id, q);
        if (!next) {
          clearWebCartHandle();
          cartId = (await ensureWebCartId(s)) ?? null;
          if (!cartId) {
            setError("Could not start a cart.");
            return;
          }
          next = await upsertWebCartLine(s, cartId, id, q);
        }
        if (!next) {
          applyCart(null);
          notifyWebCartChanged();
          return;
        }
        applyCart(next);
        notifyWebCartChanged();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update cart.");
        throw e;
      }
    },
    [slug, applyCart],
  );

  const changeQty = useCallback(
    async (itemId: string, nextQty: number) => {
      await setLineQty(itemId, nextQty);
    },
    [setLineQty],
  );

  const removeLine = useCallback(
    async (itemId: string) => {
      await setLineQty(itemId, 0);
    },
    [setLineQty],
  );

  const openFullCart = useCallback(() => {
    setFocusItemId(null);
    setCartViewMode("all");
    setDrawerOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setDrawerOpen(false);
    setFocusItemId(null);
    setCartViewMode("all");
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  const openCheckout = useCallback(() => {
    setDrawerOpen(false);
    setFocusItemId(null);
    setCartViewMode("all");
    setCheckoutOpen(true);
  }, []);

  const value = useMemo<ShopCartContextValue>(
    () => ({
      slug,
      cart,
      loading,
      error,
      lineCount,
      itemCount,
      drawerOpen,
      checkoutOpen,
      focusItemId,
      cartViewMode,
      openDrawer: openFullCart,
      closeDrawer: closeCart,
      openCheckout,
      closeCheckout,
      toggleDrawer: () => {
        setDrawerOpen((open) => {
          if (open) {
            setFocusItemId(null);
            setCartViewMode("all");
            return false;
          }
          setFocusItemId(null);
          setCartViewMode("all");
          return true;
        });
      },
      showAllCartItems: () => {
        setFocusItemId(null);
        setCartViewMode("all");
      },
      refresh: () => refresh(),
      setLineQty,
      changeQty,
      removeLine,
      notifyAdded: (itemId: string) => {
        const id = itemId.trim();
        if (!id) {
          openFullCart();
          return;
        }
        setFocusItemId(id);
        setCartViewMode("focus");
        // Defer drawer until delivery-area modal completes (or skips).
        notifyShopItemAdded(id, () => setDrawerOpen(true));
      },
    }),
    [
      slug,
      cart,
      loading,
      error,
      lineCount,
      itemCount,
      drawerOpen,
      checkoutOpen,
      focusItemId,
      cartViewMode,
      openFullCart,
      closeCart,
      openCheckout,
      closeCheckout,
      refresh,
      setLineQty,
      changeQty,
      removeLine,
    ],
  );

  return (
    <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>
  );
}

export function useShopCart(): ShopCartContextValue {
  const ctx = useContext(ShopCartContext);
  if (!ctx) {
    throw new Error("useShopCart must be used within ShopCartProvider");
  }
  return ctx;
}

export function useShopCartOptional(): ShopCartContextValue | null {
  return useContext(ShopCartContext);
}
