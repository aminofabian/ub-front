import JsBarcode from "jsbarcode";

import { canEncodeBarcode, assessBarcodeCode } from "@/lib/barcode-label";

const OPTIONS = {
  format: "CODE128" as const,
  lineColor: "#121A16",
  background: "#ffffff",
  width: 1.6,
  height: 54,
  displayValue: false,
  margin: 0,
};

export function barcodeSvgMarkup(code: string): string {
  const assessed = assessBarcodeCode(code);
  if (!canEncodeBarcode(assessed.state) || typeof document === "undefined") return "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, assessed.code, OPTIONS);
  } catch {
    return "";
  }
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Barcode ${assessed.code}`);
  svg.setAttribute("preserveAspectRatio", "none");
  return svg.outerHTML;
}

/**
 * PNG for the PDF and the label printer. `rotated` turns it a quarter turn
 * anticlockwise to match a vertical tag face, so the bars stay perpendicular
 * to the reading direction instead of being squashed into a strip.
 * `modulePx` is the narrowest bar in pixels: 2 looks smooth in a PDF; the
 * label printer asks for 1 so it can scale each module to a whole number of dots.
 */
export function barcodePngDataUrl(code: string, rotated = false, modulePx = 2): string {
  const assessed = assessBarcodeCode(code);
  if (!canEncodeBarcode(assessed.state) || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, assessed.code, { ...OPTIONS, width: modulePx, height: 80 });
  } catch {
    return "";
  }
  if (!rotated) return canvas.toDataURL("image/png");
  const turned = document.createElement("canvas");
  turned.width = canvas.height;
  turned.height = canvas.width;
  const draw = turned.getContext("2d");
  if (!draw) return "";
  draw.translate(0, turned.height);
  draw.rotate(-Math.PI / 2);
  draw.drawImage(canvas, 0, 0);
  return turned.toDataURL("image/png");
}
