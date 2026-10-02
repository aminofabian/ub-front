import { ImageResponse } from "next/og";

import { cloudinaryTransformUrl } from "@/lib/cloudinary-transform";
import {
  formatSharePrice,
  productShareHeading,
} from "@/lib/product-share-seo";
import {
  fetchPublicItemDetail,
  fetchPublicStorefront,
  sanitizeStorefrontSlug,
} from "@/lib/public-storefront";

/**
 * Bold retail promo card (1200×630) for Facebook / WhatsApp link previews.
 * Full-bleed product photo, price sticker, CTA footer — carousel strip when
 * the gallery has extra shots.
 */
export const revalidate = 300;

const CARD_SIZE = { width: 1200, height: 630 } as const;

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function hasPrice(amount: number | null | undefined): amount is number {
  return amount != null && Number.isFinite(amount);
}

function sharePhotoUrl(
  raw: string | null | undefined,
  transform: string,
): string | null {
  const url = raw?.trim();
  if (!url) return null;
  return cloudinaryTransformUrl(url, transform) ?? url;
}

function fallbackCard(message: string, status = 404) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1a12",
          fontFamily: SANS,
          color: "#e8f5ec",
          fontSize: 44,
          fontWeight: 700,
        }}
      >
        {message}
      </div>
    ),
    { ...CARD_SIZE, status },
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = sanitizeStorefrontSlug(searchParams.get("slug"));
  const itemId = searchParams.get("item")?.trim() || "";
  if (!slug || !itemId) {
    return fallbackCard("Product");
  }

  const [item, storefront] = await Promise.all([
    fetchPublicItemDetail(slug, itemId),
    fetchPublicStorefront(slug),
  ]);
  if (!item) {
    return fallbackCard("Product not found");
  }

  const shopLabel =
    storefront?.label?.trim() ||
    storefront?.businessName?.trim() ||
    "Shop";
  const heading = productShareHeading(item);
  const priceLabel = hasPrice(item.price)
    ? formatSharePrice(item.currency, item.price)
    : null;

  const gallery = item.images
    .map((img) =>
      sharePhotoUrl(img.url, "c_fill,w_1200,h_900,q_auto:good,f_jpg"),
    )
    .filter((url): url is string => Boolean(url));
  const hero = gallery[0] ?? null;
  const thumbs = gallery.slice(1, 4);
  const nameSize =
    heading.length > 48 ? 34 : heading.length > 32 ? 42 : heading.length > 22 ? 50 : 58;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07140e",
          fontFamily: SANS,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Full-bleed product plane */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
          }}
        >
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element -- next/og
            <img
              src={hero}
              alt=""
              width={1200}
              height={630}
              style={{
                objectFit: "cover",
                width: 1200,
                height: 630,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background:
                  "radial-gradient(circle at 30% 20%, #1a4d32 0%, #07140e 70%)",
              }}
            />
          )}
        </div>

        {/* Atmospheric scrims */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(5,16,10,0.92) 0%, rgba(5,16,10,0.55) 42%, rgba(5,16,10,0.18) 68%, rgba(5,16,10,0.45) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(5,16,10,0.35) 0%, transparent 28%, transparent 55%, rgba(5,16,10,0.88) 100%)",
          }}
        />

        {/* Content column */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: "36px 44px 0",
          }}
        >
          {/* Top row: shop + NEW IN chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: "#3DDC84",
                }}
              />
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#f2fbf5",
                  textTransform: "uppercase",
                }}
              >
                {shopLabel}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 16px",
                borderRadius: 10,
                background: "#FF4D6D",
                color: "#fff",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              NEW IN
            </div>
          </div>

          {/* Price sticker + name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 48,
              maxWidth: 620,
            }}
          >
            {priceLabel ? (
              <div
                style={{
                  display: "flex",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "18px 28px 16px",
                    borderRadius: 22,
                    background: "#FFE566",
                    color: "#0b1a12",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      opacity: 0.7,
                      marginBottom: 4,
                    }}
                  >
                    ONLY
                  </div>
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {priceLabel}
                  </div>
                </div>
              </div>
            ) : null}

            <div
              style={{
                fontSize: nameSize,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#f7fff9",
                lineHeight: 1.08,
                textShadow: "0 2px 24px rgba(0,0,0,0.45)",
              }}
            >
              {heading}
            </div>
          </div>

          {/* Carousel insets */}
          {thumbs.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: "auto",
                marginBottom: 18,
              }}
            >
              {thumbs.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  style={{
                    display: "flex",
                    width: 168,
                    height: 112,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.55)",
                    boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- next/og */}
                  <img
                    src={src}
                    alt=""
                    width={168}
                    height={112}
                    style={{
                      objectFit: "cover",
                      width: 168,
                      height: 112,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flex: 1 }} />
          )}

          {/* CTA footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginLeft: -44,
              marginRight: -44,
              width: 1200,
              padding: "18px 44px",
              background: "#128C7E",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                color: "#ffffff",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              <span>ORDER NOW</span>
              <span style={{ opacity: 0.45 }}>|</span>
              <span>PAY ON DELIVERY</span>
              <span style={{ opacity: 0.45 }}>|</span>
              <span>FAST DELIVERY</span>
            </div>
            <div
              style={{
                display: "flex",
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              WhatsApp ready
            </div>
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE },
  );
}
