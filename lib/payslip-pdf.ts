import {
  buildPayslipModel,
  formatPayrollMoney,
  hexToRgb,
  type PayslipDocumentData,
  type PayslipDocumentOptions,
  type PayslipModel,
} from "@/lib/payroll-utils";

/**
 * Vector (text-selectable, crisp) payslip PDF built with jsPDF.
 *
 * Mirrors the printed HTML payslip: masthead with tenant logo, employee &
 * payroll details, earnings/deductions tables, net-pay band and footer.
 * jsPDF is loaded on demand so it never lands in the main bundle.
 */

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK: [number, number, number] = [22, 32, 43];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [219, 227, 236];
const NOTE_BG: [number, number, number] = [248, 250, 252];

type Rgb = [number, number, number];

function softTint(accent: Rgb): Rgb {
  return accent.map((c) => Math.round(c * 0.08 + 255 * 0.92)) as Rgb;
}

/** Loads the tenant logo as a data URL; returns null on any CORS/network error. */
async function tryLoadLogo(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      const timer = window.setTimeout(() => reject(new Error("timeout")), 3000);
      el.onload = () => {
        window.clearTimeout(timer);
        resolve(el);
      };
      el.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("load failed"));
      };
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !img.naturalWidth || !img.naturalHeight) return null;
    ctx.drawImage(img, 0, 0);
    return {
      data: canvas.toDataURL("image/png"),
      w: img.naturalWidth,
      h: img.naturalHeight,
    };
  } catch {
    return null;
  }
}

function pdfFileName(model: PayslipModel, periodYear: number, periodMonth: number): string {
  const period = model.payslipNumber
    ? model.payslipNumber
    : `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
  const who = model.staffName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `payslip-${period}${who ? `-${who}` : ""}.pdf`.toLowerCase();
}

export async function downloadPayslipPdf(
  payslip: PayslipDocumentData,
  staffName: string,
  options: PayslipDocumentOptions = {},
): Promise<void> {
  const model = buildPayslipModel(payslip, staffName, options);
  const accent: Rgb = hexToRgb(model.accent) ?? [15, 118, 110];
  const tint = softTint(accent);
  const logo = model.logoUrl ? await tryLoadLogo(model.logoUrl) : null;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // ── Masthead ────────────────────────────────────────────────────────────
  const brandX = MARGIN + (logo ? 20 : 0);
  if (logo) {
    const box = 16;
    const scale = Math.min(box / logo.w, box / logo.h);
    doc.addImage(logo.data, "PNG", MARGIN, y, logo.w * scale, logo.h * scale);
  }
  doc.setTextColor(...INK);
  if (model.shopName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(model.shopName, brandX, y + 5.5);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setCharSpace(1.2);
  doc.text("PAYROLL", brandX, y + (model.shopName ? 11.5 : 5.5));
  doc.setCharSpace(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...accent);
  doc.text("MONTHLY PAYSLIP", PAGE_W - MARGIN, y + 4.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(model.period, PAGE_W - MARGIN, y + 10, { align: "right" });
  if (model.payslipNumber) {
    doc.setFontSize(8);
    doc.text(`No. ${model.payslipNumber}`, PAGE_W - MARGIN, y + 14.5, { align: "right" });
  }
  y += 20;
  doc.setFillColor(...accent);
  doc.rect(MARGIN, y, CONTENT_W, 1.1, "F");
  y += 1.1;

  // ── Section band helper ─────────────────────────────────────────────────
  const band = (label: string, x: number, width: number) => {
    doc.setFillColor(...accent);
    doc.rect(x, y, width, 6.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.setCharSpace(0.5);
    doc.text(label.toUpperCase(), x + 2.6, y + 4.2);
    doc.setCharSpace(0);
    y += 6.2;
  };

  // ── Employee & payroll details ──────────────────────────────────────────
  y += 6;
  band("Employee & Payroll Details", MARGIN, CONTENT_W);
  const detailRows = Math.max(model.leftDetails.length, model.rightDetails.length);
  const detailH = detailRows * 7 + 1;
  const colW = CONTENT_W / 2;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, y, CONTENT_W, detailH);
  doc.line(MARGIN + colW, y, MARGIN + colW, y + detailH);
  const drawDetailCell = ([label, value]: [string, string], x: number, row: number, width: number) => {
    const rowY = y + row * 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 2.6, rowY + 4.6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(value, x + width - 2.6, rowY + 4.6, { align: "right", maxWidth: width - 30 });
    if (row > 0) {
      doc.setDrawColor(...LINE);
      doc.line(x + 2.6, rowY, x + width - 2.6, rowY);
    }
  };
  model.leftDetails.forEach((row, i) => drawDetailCell(row, MARGIN, i, colW));
  model.rightDetails.forEach((row, i) => drawDetailCell(row, MARGIN + colW, i, colW));
  y += detailH + 6;

  // ── Earnings & deductions ───────────────────────────────────────────────
  const gap = 8;
  const half = (CONTENT_W - gap) / 2;
  const drawTable = (
    x: number,
    topY: number,
    title: string,
    rows: Array<{ label: string; value: number }>,
    totalLabel: string,
    total: number,
  ): number => {
    let ty = topY;
    doc.setFillColor(...accent);
    doc.rect(x, ty, half, 6.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.setCharSpace(0.5);
    doc.text(title.toUpperCase(), x + 2.6, ty + 4.2);
    doc.setCharSpace(0);
    ty += 6.2;

    const body = rows.length > 0 ? rows : [{ label: "—", value: 0 }];
    const tableH = body.length * 6.6 + 8;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(x, ty, half, tableH);
    body.forEach((row, i) => {
      if (i > 0) {
        doc.line(x, ty + i * 6.6, x + half, ty + i * 6.6);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.setTextColor(...INK);
      doc.text(row.label, x + 2.6, ty + i * 6.6 + 4.4, { maxWidth: half - 28 });
      doc.text(formatPayrollMoney(row.value), x + half - 2.6, ty + i * 6.6 + 4.4, { align: "right" });
    });
    const totalY = ty + body.length * 6.6;
    doc.setFillColor(...tint);
    doc.rect(x, totalY, half, 8, "F");
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.6);
    doc.line(x, totalY, x + half, totalY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(...INK);
    doc.text(totalLabel, x + 2.6, totalY + 5.2);
    doc.text(formatPayrollMoney(total), x + half - 2.6, totalY + 5.2, { align: "right" });
    return totalY + 8;
  };
  const leftBottom = drawTable(
    MARGIN,
    y,
    "Earnings",
    model.earnings,
    "Total earnings",
    model.totalEarnings,
  );
  const rightBottom = drawTable(
    MARGIN + half + gap,
    y,
    "Deductions",
    model.deductions,
    "Total deductions",
    model.totalDeductions,
  );
  y = Math.max(leftBottom, rightBottom) + 7;

  // ── Net salary band ─────────────────────────────────────────────────────
  doc.setFillColor(...accent);
  doc.rect(MARGIN, y, CONTENT_W, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  doc.setTextColor(255, 255, 255);
  doc.setCharSpace(0.6);
  doc.text("NET SALARY PAYABLE", MARGIN + 4, y + 7.6);
  doc.setCharSpace(0);
  doc.setFontSize(13.5);
  doc.text(formatPayrollMoney(model.net), PAGE_W - MARGIN - 4, y + 8.2, { align: "right" });
  y += 12 + 6;

  // ── Note ────────────────────────────────────────────────────────────────
  if (model.note) {
    const noteLines = doc.splitTextToSize(model.note, CONTENT_W - 8) as string[];
    const noteH = 11 + noteLines.length * 4;
    doc.setFillColor(...NOTE_BG);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, CONTENT_W, noteH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.5);
    doc.text("NOTE", MARGIN + 4, y + 5);
    doc.setCharSpace(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(...INK);
    noteLines.forEach((line, i) => doc.text(line, MARGIN + 4, y + 9.6 + i * 4));
    y += noteH + 5;
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.6);
  doc.setTextColor(...MUTED);
  doc.text(
    "This is a computer-generated document and does not require a signature.",
    PAGE_W / 2,
    Math.min(y + 2, PAGE_H - MARGIN),
    { align: "center" },
  );

  doc.save(pdfFileName(model, payslip.periodYear, payslip.periodMonth));
}
