import type { TagDoc } from "@/lib/price-tags/pdf";

const PT_PER_MM = 72 / 25.4;
const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * A TagDoc that draws on a canvas instead of a PDF, in millimetres, at the
 * label printer's resolution. Tags drawn here are the same tags the PDF shows.
 */
export class CanvasTagDoc implements TagDoc {
  readonly canvas: HTMLCanvasElement;
  readonly widthDots: number;
  readonly heightDots: number;
  private readonly ctx: CanvasRenderingContext2D;
  private bold = false;
  private sizeMm = 3;

  constructor(
    widthMm: number,
    heightMm: number,
    /** Printer resolution; drawing code snaps barcodes to whole dots with it. */
    readonly dotsPerMm: number,
    /** Decoded images for the data URLs addImage will be asked for. */
    private readonly images: ReadonlyMap<string, CanvasImageSource>,
  ) {
    this.widthDots = Math.round(widthMm * dotsPerMm);
    this.heightDots = Math.round(heightMm * dotsPerMm);
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.widthDots;
    this.canvas.height = this.heightDots;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("This browser cannot draw labels (no canvas).");
    this.ctx = ctx;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, this.widthDots, this.heightDots);
    ctx.scale(dotsPerMm, dotsPerMm);
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.textBaseline = "alphabetic";
    // Barcode bars must stay hard-edged; smoothing greys them out.
    ctx.imageSmoothingEnabled = false;
  }

  private applyFont() {
    this.ctx.font = `${this.bold ? "700" : "400"} ${this.sizeMm}px ${FONT_STACK}`;
  }

  setDrawColor(r: number, g = r, b = r) {
    this.ctx.strokeStyle = `rgb(${r},${g},${b})`;
  }

  setLineWidth(width: number) {
    this.ctx.lineWidth = width;
  }

  setLineDashPattern(pattern: number[], phase = 0) {
    this.ctx.setLineDash(pattern);
    this.ctx.lineDashOffset = phase;
  }

  rect(x: number, y: number, w: number, h: number) {
    this.ctx.strokeRect(x, y, w, h);
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  setTextColor(r: number, g = r, b = r) {
    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
  }

  setFont(_font: string, style: string) {
    this.bold = style === "bold";
    this.applyFont();
  }

  /** jsPDF takes points; the canvas works in millimetres. */
  setFontSize(sizePt: number) {
    this.sizeMm = sizePt / PT_PER_MM;
    this.applyFont();
  }

  getTextWidth(text: string): number {
    return this.ctx.measureText(text).width;
  }

  /** Same convention as jsPDF: (x, y) is the baseline start; angle is degrees anticlockwise. */
  text(text: string, x: number, y: number, options?: { angle?: number }) {
    const angle = options?.angle ?? 0;
    if (!angle) {
      this.ctx.fillText(text, x, y);
      return;
    }
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate((-angle * Math.PI) / 180);
    this.ctx.fillText(text, 0, 0);
    this.ctx.restore();
  }

  /** Greedy word wrap; a single word longer than the width is broken by characters. */
  splitTextToSize(text: string, width: number): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.getTextWidth(candidate) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      while (this.getTextWidth(rest) > width && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && this.getTextWidth(rest.slice(0, cut)) > width) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [""];
  }

  addImage(data: string, _format: string, x: number, y: number, w: number, h: number) {
    const image = this.images.get(data);
    if (image) this.ctx.drawImage(image, x, y, w, h);
  }

  /**
   * One bit per dot, rows top to bottom, 8 dots per byte, most significant
   * bit first. A dot is black when its luminance falls below `threshold`.
   */
  toMonochrome(threshold = 160): { bytesPerRow: number; black: Uint8Array } {
    const { data } = this.ctx.getImageData(0, 0, this.widthDots, this.heightDots);
    const bytesPerRow = Math.ceil(this.widthDots / 8);
    const black = new Uint8Array(bytesPerRow * this.heightDots);
    for (let row = 0; row < this.heightDots; row += 1) {
      for (let col = 0; col < this.widthDots; col += 1) {
        const at = (row * this.widthDots + col) * 4;
        const luminance = 0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2];
        if (luminance < threshold) black[row * bytesPerRow + (col >> 3)] |= 0x80 >> (col & 7);
      }
    }
    return { bytesPerRow, black };
  }
}
