/** JSX marks for `next/og` ImageResponse — shopper PWA icons and screenshots. */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = c(A.r + (B.r - A.r) * t);
  const g = c(A.g + (B.g - A.g) * t);
  const bl = c(A.b + (B.b - A.b) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export function inkOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.62 ? "#141816" : "#ffffff";
}

export type ShopperPwaMarkProps = {
  size: number;
  name: string;
  monogram: string;
  primary: string;
  markSrc: string | null;
  maskable?: boolean;
};

export function ShopperPwaMark({
  size,
  name,
  monogram,
  primary,
  markSrc,
  maskable = false,
}: ShopperPwaMarkProps) {
  const deep = mixHex(primary, "#000000", 0.22);
  const ink = inkOn(primary);
  const pad = maskable ? Math.round(size * 0.18) : 0;
  const inner = size - pad * 2;
  const radius = Math.round(inner * 0.22);
  const glyph = monogram.slice(0, 2);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? primary : "transparent",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius,
          overflow: "hidden",
          background: `linear-gradient(145deg, ${primary} 0%, ${deep} 100%)`,
        }}
      >
        {markSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={markSrc}
            alt={name}
            width={inner}
            height={inner}
            style={{
              width: inner,
              height: inner,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: glyph.length > 1 ? Math.round(inner * 0.38) : Math.round(inner * 0.46),
              fontWeight: 700,
              letterSpacing: glyph.length > 1 ? "-0.06em" : "-0.03em",
              color: ink,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
          >
            {glyph}
          </div>
        )}
      </div>
    </div>
  );
}

export type ShopperPwaShotProduct = {
  name: string;
  price: string | null;
};

export type ShopperPwaShotProps = {
  width: number;
  height: number;
  name: string;
  monogram: string;
  primary: string;
  products: ShopperPwaShotProduct[];
  wide?: boolean;
};

export function ShopperPwaScreenshot({
  width,
  height,
  name,
  monogram,
  primary,
  products,
  wide = false,
}: ShopperPwaShotProps) {
  const paper = "#f4f5f4";
  const ink = "#141816";
  const muted = "#5c6560";
  const deep = mixHex(primary, "#000000", 0.18);
  const tiles = products.slice(0, wide ? 4 : 4);
  const pad = wide ? 36 : 28;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: paper,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        color: ink,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: `${pad}px ${pad}px ${Math.round(pad * 0.7)}px`,
          background: `linear-gradient(135deg, ${primary} 0%, ${deep} 100%)`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {monogram.slice(0, 2)}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: wide ? 36 : 30,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "#fff",
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            Order from this shop
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          padding: pad,
          flex: 1,
        }}
      >
        {(tiles.length ? tiles : [{ name: "Fresh today", price: null }]).map(
          (item, i) => (
            <div
              key={`${item.name}-${i}`}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                width: wide ? 280 : 300,
                height: wide ? 220 : 260,
                borderRadius: 18,
                background: i % 2 === 0 ? mixHex(primary, "#ffffff", 0.88) : "#eceeea",
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: ink,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 16,
                  color: item.price ? primary : muted,
                  fontWeight: 600,
                }}
              >
                {item.price ?? "In store"}
              </div>
            </div>
          ),
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "16px 24px 28px",
          borderTop: "1px solid #e4e6e4",
          background: "#fff",
        }}
      >
        {["Shop", "Cart", "Orders"].map((label) => (
          <div
            key={label}
            style={{
              display: "flex",
              fontSize: 15,
              fontWeight: label === "Shop" ? 700 : 500,
              color: label === "Shop" ? primary : muted,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
