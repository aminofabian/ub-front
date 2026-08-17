import { toKenyanLocal07 } from "@/lib/kenyan-phone";

export type LoyaltyCardCustomerInput = {
  id: string;
  name: string;
  phone?: string | null;
  loyaltyPoints?: number | string | null;
};

export type LoyaltyCardShopInput = {
  displayName?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type LoyaltyCardModel = {
  memberName: string;
  memberId: string;
  tierLabel: string;
  qrDataUrl: string;
  accountUrl: string;
  brandLeft: string;
  brandRight: string | null;
  tagline: string;
  address: string;
  phone: string;
  handle: string;
};

const DEFAULT_ADDRESS = "Mirema, Opp. Safari Park Gate B";
const DEFAULT_PHONE = "0708 123 456";
const DEFAULT_HANDLE = "@palmart.ke";
const TAGLINE = "Everyday essentials, close to you.";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Stable 12-digit member number derived from the customer id. */
export function formatLoyaltyMemberId(customerId: string): string {
  const hex = customerId.replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (!hex) return "0000 0000 0000";
  let n = BigInt(0);
  const radix = BigInt(16);
  const modulus = BigInt(1000000000000);
  for (const ch of hex.slice(0, 16)) {
    n = (n * radix + BigInt(Number.parseInt(ch, 16))) % modulus;
  }
  const s = n.toString().padStart(12, "0");
  return `${s.slice(0, 4)} ${s.slice(4, 8)} ${s.slice(8, 12)}`;
}

export function loyaltyCardTierLabel(
  points: number | string | null | undefined,
): string {
  const n = Number(points ?? 0);
  if (!Number.isFinite(n) || n < 150) return "MEMBER";
  if (n >= 2500) return "PLATINUM MEMBER";
  if (n >= 800) return "GOLD MEMBER";
  return "SILVER MEMBER";
}

export function loyaltyCardAccountUrl(
  phone: string | null | undefined,
  origin: string,
): string {
  const base = origin.replace(/\/+$/, "") || "";
  const local = phone ? toKenyanLocal07(phone) : null;
  if (local) return `${base}/${local}`;
  return `${base}/shop/account`;
}

export function loyaltyCardBrandParts(displayName: string | null | undefined): {
  left: string;
  right: string | null;
} {
  const name = displayName?.trim() || "palmart";
  if (/^palmart$/i.test(name)) return { left: "palm", right: "art" };
  return { left: name, right: null };
}

export function loyaltyCardHandle(website: string | null | undefined): string {
  const raw = website?.trim();
  if (!raw) return DEFAULT_HANDLE;
  try {
    const href = raw.includes("://") ? raw : `https://${raw}`;
    const host = new URL(href).hostname.replace(/^www\./i, "");
    return host ? `@${host}` : DEFAULT_HANDLE;
  } catch {
    const host = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
    return host ? `@${host}` : DEFAULT_HANDLE;
  }
}

export function buildLoyaltyCardModel(
  customer: LoyaltyCardCustomerInput,
  shop: LoyaltyCardShopInput,
  opts: { origin: string; qrDataUrl: string },
): LoyaltyCardModel {
  const brand = loyaltyCardBrandParts(shop.displayName);
  return {
    memberName: customer.name.trim() || "Member",
    memberId: formatLoyaltyMemberId(customer.id),
    tierLabel: loyaltyCardTierLabel(customer.loyaltyPoints),
    qrDataUrl: opts.qrDataUrl,
    accountUrl: loyaltyCardAccountUrl(customer.phone, opts.origin),
    brandLeft: brand.left,
    brandRight: brand.right,
    tagline: TAGLINE,
    address: shop.address?.trim() || DEFAULT_ADDRESS,
    phone: shop.phone?.trim() || DEFAULT_PHONE,
    handle: loyaltyCardHandle(shop.website),
  };
}

const BRAND_MARK_SVG = `<svg class="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <path d="M14 18C14 12 18 8 24 8C30 8 34 12 34 18" stroke="#0b4a36" stroke-width="3" stroke-linecap="round"/>
  <rect x="9" y="17" width="30" height="24" rx="7" fill="#0b4a36"/>
  <path d="M17 27C17 27 19.5 31 24 31C28.5 31 31 27 31 27" stroke="#e2571f" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

export const LOYALTY_CARD_CSS = `
.pm-loyalty{
  --green:#0b4a36;
  --green-dark:#083a2a;
  --orange:#e2571f;
  --cream:#faf8f3;
  --ink:#12251d;
  --muted:#5b6b63;
  box-sizing:border-box;
  font-family:"Avenir Next","Nunito Sans","Segoe UI",system-ui,sans-serif;
  color:var(--ink);
}
.pm-loyalty *,.pm-loyalty *::before,.pm-loyalty *::after{box-sizing:border-box;}
.pm-loyalty-sheet{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:28px;
}
.pm-loyalty h2.section-label{
  font-size:13px;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--muted);
  margin:0 0 -10px 0;
  font-weight:600;
}
.pm-loyalty .card{
  width:540px;
  height:340px;
  border-radius:22px;
  box-shadow:0 12px 30px rgba(11,74,54,.18), 0 2px 8px rgba(0,0,0,.06);
  overflow:hidden;
  position:relative;
  background:var(--cream);
}
.pm-loyalty .front{ display:grid; grid-template-columns: 1fr 200px; }
.pm-loyalty .front-left{ padding:30px 28px; display:flex; flex-direction:column; }
.pm-loyalty .brand{ display:flex; align-items:center; gap:10px; }
.pm-loyalty .brand-mark{ width:38px; height:38px; flex-shrink:0; }
.pm-loyalty .brand-name{ font-weight:700; font-size:26px; letter-spacing:-0.02em; line-height:1; }
.pm-loyalty .brand-name .p1{ color:var(--green); }
.pm-loyalty .brand-name .p2{ color:var(--orange); }
.pm-loyalty .brand-tag{ font-size:11.5px; color:var(--muted); margin:2px 0 0 48px; }
.pm-loyalty .card-title{ font-weight:700; font-size:15px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink); margin-top:22px; }
.pm-loyalty .card-sub{ font-size:12px; color:var(--muted); margin-top:2px; }
.pm-loyalty .tier{
  margin-top:14px;
  display:inline-flex; align-items:center; gap:6px;
  background:#fff3ec; border:1px solid #f4c7ae; color:var(--orange);
  font-weight:600; font-size:11px;
  padding:5px 10px; border-radius:20px; width:fit-content;
  letter-spacing:.04em;
}
.pm-loyalty .id-block{ margin-top:auto; }
.pm-loyalty .id-label{ font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.pm-loyalty .id-number{ font-weight:600; font-size:21px; color:var(--ink); letter-spacing:.03em; margin-top:2px; }
.pm-loyalty .member-name{ font-size:12px; color:var(--ink); margin-top:4px; font-weight:600; }
.pm-loyalty .barcode{ margin-top:10px; height:30px; width:100%;
  background:repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 5px, transparent 5px 9px, var(--ink) 9px 10px, transparent 10px 13px);
  opacity:.85; border-radius:2px;
}
.pm-loyalty .front-right{
  background:var(--green);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:20px 16px; text-align:center; gap:10px;
}
.pm-loyalty .qr-label{ color:#eaf3ee; font-size:10.5px; font-weight:500; line-height:1.4; }
.pm-loyalty .qr-box{ width:118px; height:118px; background:#fff; border-radius:10px; padding:8px; }
.pm-loyalty .qr-box img{ width:100%; height:100%; display:block; }
.pm-loyalty .qr-note{ color:#cfe3d7; font-size:9.5px; }
.pm-loyalty .back{ display:flex; flex-direction:column; }
.pm-loyalty .back-top{ flex:1; display:grid; grid-template-columns: 210px 1fr; }
.pm-loyalty .steps{ background:var(--green); color:#fff; padding:22px 20px; display:flex; flex-direction:column; gap:0; }
.pm-loyalty .step{ display:flex; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.14); }
.pm-loyalty .step:last-child{ border-bottom:none; }
.pm-loyalty .step-num{
  width:24px; height:24px; border-radius:50%; background:var(--orange); color:#fff;
  display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;
}
.pm-loyalty .step-title{ font-weight:600; font-size:12.5px; }
.pm-loyalty .step-desc{ font-size:10.5px; color:#cfe3d7; line-height:1.4; margin-top:2px; }
.pm-loyalty .back-right{ padding:26px 24px; display:flex; flex-direction:column; justify-content:center; }
.pm-loyalty .headline{ font-size:21px; font-weight:600; color:var(--ink); line-height:1.35; }
.pm-loyalty .headline .accent{ color:var(--orange); }
.pm-loyalty .headline-rule{ width:34px; height:3px; background:var(--orange); border-radius:2px; margin-bottom:10px; }
.pm-loyalty .back-footer{
  background:var(--green-dark); color:#eaf3ee; display:flex; align-items:center; justify-content:space-between;
  padding:11px 22px; font-size:10.5px; gap:8px;
}
.pm-loyalty .back-footer span{ display:flex; align-items:center; gap:6px; min-width:0; }
.pm-loyalty .terms{ background:#fff; color:var(--muted); text-align:center; font-size:9px; padding:6px 20px; border-top:1px solid #eee; }
`;

export function buildLoyaltyCardMarkup(model: LoyaltyCardModel): string {
  const name = escapeHtml(model.memberName);
  const id = escapeHtml(model.memberId);
  const tier = escapeHtml(model.tierLabel);
  const left = escapeHtml(model.brandLeft);
  const right = model.brandRight ? `<span class="p2">${escapeHtml(model.brandRight)}</span>` : "";
  const tagline = escapeHtml(model.tagline);
  const address = escapeHtml(model.address);
  const phone = escapeHtml(model.phone);
  const handle = escapeHtml(model.handle);
  const qr = escapeHtml(model.qrDataUrl);

  return `
<div class="pm-loyalty">
  <div class="pm-loyalty-sheet">
    <h2 class="section-label">Front</h2>
    <div class="card front">
      <div class="front-left">
        <div class="brand">
          ${BRAND_MARK_SVG}
          <div class="brand-name"><span class="p1">${left}</span>${right}</div>
        </div>
        <div class="brand-tag">${tagline}</div>
        <div class="card-title">Rewards card</div>
        <div class="card-sub">Earn points. Redeem discounts. Build credit.</div>
        <div class="tier">★ ${tier}</div>
        <div class="id-block">
          <div class="id-label">Member ID</div>
          <div class="id-number">${id}</div>
          <div class="member-name">${name}</div>
          <div class="barcode" aria-hidden="true"></div>
        </div>
      </div>
      <div class="front-right">
        <div class="qr-label">SCAN TO OPEN<br>YOUR PALMART ACCOUNT</div>
        <div class="qr-box">
          <img src="${qr}" alt="Account QR code" width="102" height="102" />
        </div>
        <div class="qr-note">View points, offers &amp; credit status</div>
      </div>
    </div>

    <h2 class="section-label">Back</h2>
    <div class="card back">
      <div class="back-top">
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div>
              <div class="step-title">Shop &amp; earn</div>
              <div class="step-desc">Every purchase adds points to your account.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div>
              <div class="step-title">Redeem rewards</div>
              <div class="step-desc">Use points for discounts on your next shop.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div>
              <div class="step-title">Unlock credit</div>
              <div class="step-desc">Steady shopping history raises your spending limit.</div>
            </div>
          </div>
        </div>
        <div class="back-right">
          <div class="headline-rule"></div>
          <div class="headline">More shopping.<br>More rewards.<br><span class="accent">That's Palmart.</span></div>
        </div>
      </div>
      <div class="back-footer">
        <span>📍 ${address}</span>
        <span>📞 ${phone}</span>
        <span>${handle}</span>
      </div>
      <div class="terms">This card is non-transferable. Palmart reserves the right to update terms and conditions.</div>
    </div>
  </div>
</div>`;
}

export function buildLoyaltyCardPrintDocument(model: LoyaltyCardModel): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(model.memberName)} — Palmart rewards card</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  html, body {
    margin: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { padding: 8mm 0; }
  ${LOYALTY_CARD_CSS}
  .pm-loyalty .card { page-break-inside: avoid; box-shadow: 0 0 0 1px rgba(11,74,54,.12); }
  .pm-loyalty-sheet { gap: 16mm; }
  @media print {
    body { padding: 0; }
    .pm-loyalty .card { box-shadow: none; }
    h2.section-label { color: #5b6b63 !important; }
  }
</style>
</head>
<body>
${buildLoyaltyCardMarkup(model)}
</body>
</html>`;
}

export async function loyaltyCardQrDataUrl(url: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(url, {
    width: 236,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b4a36", light: "#ffffff" },
  });
}
