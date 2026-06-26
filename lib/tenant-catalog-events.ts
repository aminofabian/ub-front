type TenantCatalogChangedListener = () => void;

const TENANT_CATALOG_CHANNEL = "ub-tenant-catalog";
const TENANT_CATALOG_EVENT = "tenant-catalog-changed";

const listeners = new Set<TenantCatalogChangedListener>();

export function subscribeTenantCatalogChanged(
  listener: TenantCatalogChangedListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notify listeners that the tenant product catalog changed (create / update / delete / adopt). */
export function notifyTenantCatalogChanged(): void {
  for (const listener of listeners) {
    listener();
  }

  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  try {
    const channel = new BroadcastChannel(TENANT_CATALOG_CHANNEL);
    channel.postMessage({ type: TENANT_CATALOG_EVENT });
    channel.close();
  } catch {
    // ignore — same-tab listeners already ran
  }
}

export function subscribeTenantCatalogBroadcast(
  listener: TenantCatalogChangedListener,
): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }

  const channel = new BroadcastChannel(TENANT_CATALOG_CHANNEL);
  channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === TENANT_CATALOG_EVENT) {
      listener();
    }
  };

  return () => channel.close();
}
