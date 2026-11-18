import { ShopRoomBookingView } from "@/components/storefront/shop-room-booking-view";
import type { PublicRoomInfo } from "@/lib/public-rooms";

/**
 * The public lodging landing (ADR 0031): a house that lets rooms and has no shelf to show leads its
 * storefront with its rooms. A quiet hero in the store's own accent, then the booking flow. Mirrors
 * the service-booking landing's shape; it can grow photos and a room gallery later.
 */
export function ShopRoomLanding({
  slug,
  info,
  storeName,
  tagline,
  phone,
  address,
  primaryHex,
}: {
  slug: string;
  info: PublicRoomInfo;
  storeName: string;
  tagline: string | null;
  phone: string | null;
  address: string | null;
  primaryHex: string | null;
}) {
  const accent = primaryHex?.trim() || "#1D4B3B";
  const telHref = phone?.trim() ? `tel:${phone.replace(/[^0-9+]/g, "")}` : null;
  return (
    <main
      style={
        {
          "--sf-accent": accent,
          "--sf-on-accent": "#fff",
          "--sf-ink": "#1a1a1a",
          "--sf-muted": "#6b6b6b",
          minHeight: "100dvh",
          background: "#faf8f3",
          padding: "clamp(24px, 6vw, 72px) 20px",
        } as React.CSSProperties
      }
    >
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "clamp(20px, 5vw, 40px)" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: "clamp(2rem, 7vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--sf-ink)",
            }}
          >
            {storeName}
          </h1>
          <p style={{ margin: "10px auto 0", maxWidth: 420, fontSize: 15, lineHeight: 1.6, color: "var(--sf-muted)" }}>
            {tagline?.trim() || "A few rooms to let. Choose your nights and we will hold one for you."}
          </p>
          {address?.trim() ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--sf-muted)" }}>{address}</p>
          ) : null}
        </header>

        {info.bookable ? (
          <ShopRoomBookingView slug={slug} initialInfo={info} embedded />
        ) : (
          <p style={{ textAlign: "center", fontSize: 14, color: "var(--sf-muted)" }}>
            To book a room, call the house{telHref ? "." : ""}
            {telHref ? (
              <>
                {" "}
                <a href={telHref} style={{ color: "var(--sf-accent)" }}>
                  {phone}
                </a>
              </>
            ) : null}
          </p>
        )}
      </div>
    </main>
  );
}
