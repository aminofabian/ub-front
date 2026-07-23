"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchTenantIdForHost, resolveBusinessByShopQuery } from "@/lib/api";
import { APP_ROUTES, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import {
  businessNameToSlug,
  normalizeShopLookupQuery,
} from "@/lib/shop-lookup";
import { cn } from "@/lib/utils";

import { landingRootStyle } from "./landing-styles";

type LandingFindShopModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateShop: () => void;
};

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; tenantName: string; slug: string; host: string }
  | { status: "miss"; query: string };

async function lookupShop(normalized: string): Promise<{
  tenantId: string;
  tenantName: string;
  slug: string;
} | null> {
  const byApi = await resolveBusinessByShopQuery(normalized);
  if (byApi?.slug) {
    return byApi;
  }

  const slug = businessNameToSlug(normalized);
  if (!slug) {
    return null;
  }

  const shopUrl = slugDerivedShopUrl(slug);
  if (!shopUrl) {
    return null;
  }

  try {
    const host = new URL(shopUrl).hostname;
    const tenantId = await fetchTenantIdForHost(host);
    if (!tenantId) {
      return null;
    }
    return { tenantId, tenantName: normalized, slug };
  } catch {
    return null;
  }
}

export function LandingFindShopModal({
  open,
  onOpenChange,
  onCreateShop,
}: LandingFindShopModalProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LookupState>({ status: "idle" });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setState({ status: "idle" });
    }
  }, [open]);

  const previewSlug = businessNameToSlug(normalizeShopLookupQuery(query) || query);
  const previewHost = previewSlug
    ? `${previewSlug}.${PLATFORM_DOMAIN}`
    : `yourshop.${PLATFORM_DOMAIN}`;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeShopLookupQuery(query);
    if (!normalized) {
      setState({ status: "miss", query: "" });
      return;
    }

    setState({ status: "loading" });
    const result = await lookupShop(normalized);
    if (!result?.slug) {
      setState({ status: "miss", query: normalized });
      return;
    }

    const shopUrl = slugDerivedShopUrl(result.slug);
    let host = `${result.slug}.${PLATFORM_DOMAIN}`;
    try {
      if (shopUrl) host = new URL(shopUrl).hostname;
    } catch {
      /* keep default */
    }

    setState({
      status: "found",
      tenantName: result.tenantName || result.slug,
      slug: result.slug,
      host,
    });

    window.setTimeout(() => {
      const loginPath = `${APP_ROUTES.staffLogin}?mode=office`;
      const dest = shopUrl ? `${shopUrl}${loginPath}` : loginPath;
      window.location.assign(dest);
    }, 900);
  };

  const startCreate = () => {
    onOpenChange(false);
    onCreateShop();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "landing-page max-h-[min(92dvh,640px)] w-[calc(100vw-2rem)] max-w-md gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:size-8 [&>button]:rounded-none [&>button]:border [&>button]:border-[var(--kiosk-border)] [&>button]:bg-[var(--kiosk-elevated)] [&>button]:text-[var(--kiosk-text-muted)]",
        )}
        overlayClassName="bg-[rgba(20,20,18,0.62)] backdrop-blur-[3px]"
        style={landingRootStyle()}
      >
        <div className="landing-find-shop overflow-hidden border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_96%,#f3efe6)] shadow-[0_28px_80px_-24px_rgba(20,20,18,0.42)]">
          <div aria-hidden className="landing-find-shop-perf h-3 w-full" />

          <div className="px-5 pb-6 pt-4 sm:px-7">
            <DialogHeader className="space-y-2 text-left">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                Ticket · Find till
              </p>
              <DialogTitle className="font-heading text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--kiosk-text)]">
                Where do you sell?
              </DialogTitle>
              <DialogDescription className="text-[14px] leading-relaxed text-[var(--kiosk-text-muted)]">
                Enter your business name. We&apos;ll look up your shop and open
                the till on your subdomain.
              </DialogDescription>
            </DialogHeader>

            {state.status === "found" ? (
              <div className="mt-6 border border-dashed border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                  Match found
                </p>
                <p className="mt-2 font-heading text-2xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                  {state.tenantName}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--kiosk-text-muted)]">
                  {state.host}
                </p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                  Opening till…
                </p>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    Business name
                  </span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      if (state.status !== "idle" && state.status !== "loading") {
                        setState({ status: "idle" });
                      }
                    }}
                    autoFocus
                    autoComplete="organization"
                    placeholder="e.g. Mama Njeri Shop"
                    className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
                  />
                </label>

                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                  Looking for{" "}
                  <span className="text-[var(--kiosk-gold)]">{previewHost}</span>
                </p>

                {state.status === "miss" ? (
                  <div className="border border-dashed border-[color-mix(in_srgb,var(--kiosk-danger)_35%,var(--kiosk-border))] bg-[var(--kiosk-danger-bg)] px-3.5 py-3">
                    <p className="text-[13px] text-[var(--kiosk-text)]">
                      No ticket on file
                      {state.query ? ` for “${state.query}”` : ""}.
                    </p>
                    <button
                      type="button"
                      className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                      onClick={startCreate}
                    >
                      Open a new till instead →
                    </button>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={state.status === "loading" || !query.trim()}
                  className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
                >
                  <span className="landing-nav-ticket-code">
                    {state.status === "loading" ? "…" : "GO"}
                  </span>
                  <span className="landing-nav-ticket-label">
                    {state.status === "loading" ? "Looking up" : "Find my shop"}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
