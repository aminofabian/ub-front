import { ImageResponse } from "next/og";

import { resolveGlobalSupplierStorefront } from "@/lib/global-supplier-hub";
import type { MarketplaceSupplierDetail } from "@/lib/marketplace-api";
import { formatMoney } from "@/lib/money";
import {
  PlatformMarkOg,
  platformAppIconDataUrl,
  platformOgBackground,
} from "@/lib/platform-mark-og";
import {
  resolveSupplierDisplayName,
  resolveSupplierServiceAreas,
} from "@/lib/supplier-passport-seo";

/**
 * Per-supplier branded OG/Twitter card (1200×630).
 *
 * `platformAppIconDataUrl()` reads `public/app-icon.png` from disk, so this
 * route runs in the Node runtime (default) — do not switch to edge.
 */
export const revalidate = 3600;

/**
 * Supplier usernames are unbounded, so the static export cannot enumerate
 * them — an empty set keeps the dynamic route out of the export build (it is
 * served by the live server, which still resolves params at runtime).
 */
export function generateStaticParams() {
  return [];
}

const CARD_SIZE = { width: 1200, height: 630 } as const;

type RouteContext = { params: Promise<{ username: string }> };

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type ProductLine = { label: string; price: string | null };

function productLines(
  detail: MarketplaceSupplierDetail | null,
  limit = 4,
): ProductLine[] {
  const out: ProductLine[] = [];
  const seen = new Set<string>();
  for (const product of detail?.products ?? []) {
    if (out.length >= limit) break;
    const label = (product.parentItemName?.trim() || product.name?.trim() || "").slice(
      0,
      40,
    );
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label,
      price:
        product.unitPrice != null
          ? formatMoney(product.unitPrice, product.currency ?? "KES")
          : null,
    });
  }
  return out;
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { username } = await ctx.params;
  const decoded = decodeURIComponent(username);
  const [storefront, markSrc] = await Promise.all([
    resolveGlobalSupplierStorefront(decoded),
    platformAppIconDataUrl(),
  ]);

  if (!storefront.detail && !storefront.hub) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 64,
            background: platformOgBackground(),
            fontFamily: SANS,
          }}
        >
          <PlatformMarkOg markSize={132} markSrc={markSrc} />
          <div
            style={{
              marginTop: 40,
              fontSize: 48,
              fontWeight: 700,
              color: "#f4f7f4",
            }}
          >
            Supplier not found
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 26,
              color: "#8fa894",
            }}
          >
            This supplier passport does not exist on Kiosk.ke.
          </div>
        </div>
      ),
      { ...CARD_SIZE, status: 404 },
    );
  }

  const detail = storefront.detail;
  const name = resolveSupplierDisplayName({
    username: storefront.hub?.username || decoded,
    displayName: storefront.hub?.displayName || detail?.name,
    detail,
  });
  const areas = resolveSupplierServiceAreas(detail);
  const lines = productLines(detail, 4);
  const packCount = detail?.products?.length ?? 0;
  const nameSize = name.length > 26 ? 44 : 56;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: 64,
          background: platformOgBackground(),
          fontFamily: SANS,
        }}
      >
        <PlatformMarkOg markSize={168} markSrc={markSrc} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginLeft: 52,
            maxWidth: 880,
            height: "100%",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "#45D078",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Wholesale Supplier · Kiosk.ke
          </div>
          <div
            style={{
              fontSize: nameSize,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f4f7f4",
              lineHeight: 1.08,
              marginBottom: 22,
            }}
          >
            {name}
          </div>
          {lines.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {lines.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    fontSize: 25,
                    color: "#c9d6cb",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 99,
                      marginRight: 14,
                      alignSelf: "center",
                      background: "#45D078",
                    }}
                  />
                  <span style={{ maxWidth: 560 }}>{line.label}</span>
                  {line.price ? (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontWeight: 600,
                        color: "#f4f7f4",
                      }}
                    >
                      {line.price}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 26,
                color: "#b8c4ba",
                marginBottom: 24,
              }}
            >
              Wholesale pack prices for Kenyan shops — order by the pack and
              restock your shelf.
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 21,
              color: "#8fa894",
            }}
          >
            {areas.slice(0, 3).map((area) => (
              <span
                key={area}
                style={{
                  display: "flex",
                  padding: "6px 14px",
                  borderRadius: 99,
                  border: "1px solid rgba(143, 168, 148, 0.35)",
                  color: "#c9d6cb",
                }}
              >
                {area}
              </span>
            ))}
            {packCount > 0 ? (
              <span style={{ color: "#8fa894" }}>
                {packCount} wholesale {packCount === 1 ? "line" : "lines"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE },
  );
}
