"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  addOrderLine,
  buildComingSoonOrderUrl,
  orderItemCount,
  orderSummary,
  orderTotalLabel,
  readStoredOrder,
  setOrderQuantity,
  type ComingSoonOrderDraft,
  type ComingSoonOrderLine,
} from "@/lib/coming-soon-order";

const STORAGE_PREFIX = "kiosk.coming-soon-order.";

type ComingSoonOrderValue = {
  lines: ComingSoonOrderLine[];
  itemCount: number;
  summary: string;
  totalLabel: string | null;
  currency: string | null;
  open: boolean;
  notice: string;
  sendHref: string | null;
  quantityOf: (id: string) => number;
  add: (draft: ComingSoonOrderDraft) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

const ComingSoonOrderContext = createContext<ComingSoonOrderValue | null>(null);

export function ComingSoonOrderProvider({
  shopName,
  contactHref,
  currency = null,
  paysWithMpesa,
  children,
}: {
  shopName: string;
  contactHref: string | null;
  currency?: string | null;
  paysWithMpesa: boolean;
  children: ReactNode;
}) {
  const key = storageKey(shopName);
  const skipWrite = useRef(true);
  const [lines, setLines] = useState<ComingSoonOrderLine[]>([]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    skipWrite.current = true;
    setLines(readStored(key));
    setOpen(false);
  }, [key]);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeStored(key, lines);
    if (lines.length === 0) setOpen(false);
  }, [key, lines]);

  const add = useCallback((draft: ComingSoonOrderDraft) => {
    const name = draft.name.trim();
    let announced: string | null = null;
    setLines((current) => {
      const next = addOrderLine(current, draft);
      const qty = next.find((line) => line.id === draft.id.trim())?.quantity ?? 0;
      if (next === current || qty === 0) announced = "";
      else announced = qty === 1 ? `${name} is on your list.` : `${qty} ${name} on your list.`;
      return next;
    });
    if (announced) setNotice(announced);
    else if (announced === null && name) setNotice(`${name} is on your list.`);
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setLines((current) => setOrderQuantity(current, id, quantity));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setNotice("List cleared.");
  }, []);

  const value = useMemo<ComingSoonOrderValue>(
    () => ({
      lines,
      itemCount: orderItemCount(lines),
      summary: orderSummary(lines),
      totalLabel: orderTotalLabel(lines, currency),
      currency,
      open,
      notice,
      sendHref: buildComingSoonOrderUrl({
        shopName,
        contactHref,
        lines,
        currency,
        paysWithMpesa,
      }),
      quantityOf: (id: string) => lines.find((line) => line.id === id)?.quantity ?? 0,
      add,
      setQuantity,
      clear,
      setOpen,
    }),
    [add, clear, contactHref, currency, lines, notice, open, paysWithMpesa, setQuantity, shopName],
  );

  return (
    <ComingSoonOrderContext.Provider value={value}>{children}</ComingSoonOrderContext.Provider>
  );
}

export function useComingSoonOrder(): ComingSoonOrderValue {
  const value = useContext(ComingSoonOrderContext);
  if (!value) {
    throw new Error("useComingSoonOrder must be used within ComingSoonOrderProvider");
  }
  return value;
}

function storageKey(shopName: string): string {
  return `${STORAGE_PREFIX}${shopName.trim().toLowerCase().slice(0, 80)}`;
}

function readStored(key: string): ComingSoonOrderLine[] {
  if (typeof window === "undefined") return [];
  try {
    return readStoredOrder(window.sessionStorage.getItem(key));
  } catch {
    return [];
  }
}

function writeStored(key: string, lines: readonly ComingSoonOrderLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(lines));
  } catch {
    /* Private mode can refuse storage. The list still lives for this view. */
  }
}
