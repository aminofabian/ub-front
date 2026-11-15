import type { MenuQrCell, MenuQrOptions } from "@/lib/menu-qr";
import { menuQrHeadline } from "@/lib/menu-qr";

/**
 * The QR sheets, page by page. Rendered inside the preview frame, never in the app's own page.
 *
 * @param codes each address's QR code as an SVG drawing, made by the `qrcode` library
 */
export function MenuQrSheet({
  options,
  pages,
  codes,
  emptyText,
}: {
  options: MenuQrOptions;
  pages: MenuQrCell[][];
  codes: Record<string, string>;
  emptyText: string;
}) {
  if (pages.length === 0) return <p className="empty">{emptyText}</p>;
  const headline = menuQrHeadline(options);
  return (
    <>
      {pages.map((cells, index) => (
        <div key={index} className={`pg l-${options.layout}`}>
          {cells.map((cell) => (
            <div key={cell.key} className="cell">
              <p className="shop">{options.title.trim() || "Menu"}</p>
              <p className="head">{headline}</p>
              {/* The drawing comes from the QR library, built from an address this page made itself. */}
              <div className="qr" role="img" aria-label="QR code" dangerouslySetInnerHTML={{ __html: codes[cell.url] ?? "" }} />
              {cell.label ? <p className="label">{cell.label}</p> : null}
              <p className="how">Open your phone&rsquo;s camera and point it at the code</p>
              {cell.address ? <p className="addr">{cell.address}</p> : null}
              {options.line.trim() ? <p className="line">{options.line.trim()}</p> : null}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
