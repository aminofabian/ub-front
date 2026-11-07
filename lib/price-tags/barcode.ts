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
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return svg.outerHTML;
}

export function barcodePngDataUrl(code: string): string {
  const assessed = assessBarcodeCode(code);
  if (!canEncodeBarcode(assessed.state) || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, assessed.code, { ...OPTIONS, width: 2, height: 80 });
  } catch {
    return "";
  }
  return canvas.toDataURL("image/png");
}
