const CC_SLDS = new Set([
  "co",
  "com",
  "org",
  "net",
  "gov",
  "edu",
  "ac",
  "or",
  "ne",
  "go",
]);

export function exampleShopHost(): string {
  if (typeof window === "undefined") {
    return "yourshop.palmart.co.ke";
  }
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const port = window.location.port ? `:${window.location.port}` : "";
    return `yourshop.localhost${port}`;
  }
  const parts = hostname.split(".");
  const minParts = CC_SLDS.has(parts[parts.length - 2] ?? "") ? 4 : 3;
  const base =
    parts.length >= minParts ? parts.slice(1).join(".") : hostname;
  return `yourshop.${base}`;
}

export function domainSuffix(fullHost: string): string {
  const dot = fullHost.indexOf(".");
  return dot === -1 ? fullHost : fullHost.slice(dot);
}
