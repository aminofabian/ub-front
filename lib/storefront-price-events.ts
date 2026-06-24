type StorefrontPriceRefreshListener = (itemIds?: string[]) => void;

const listeners = new Set<StorefrontPriceRefreshListener>();

export function subscribeStorefrontPriceRefresh(
  listener: StorefrontPriceRefreshListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyStorefrontPriceRefresh(itemIds?: string[]): void {
  for (const listener of listeners) {
    listener(itemIds);
  }
}
