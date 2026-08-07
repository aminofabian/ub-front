/**
 * Shared platform marketing copy used by the homepage UI and JSON-LD.
 * Kept free of `server-only` so client landing sections can import it.
 */

export const PLATFORM_FAQS = [
  {
    question: "What is the best POS system in Kenya for small shops?",
    answer:
      "The best POS for Kenyan shops handles barcode scanning, native M-Pesa STK at the counter, offline sales when the network drops, and one inventory across the till and online storefront. Kiosk.ke is built for that floor — mini-marts, dukas, pharmacies, and multi-branch retailers — and is free to start.",
  },
  {
    question: "Does Kiosk POS support M-Pesa payments?",
    answer:
      "Yes. Kiosk includes native M-Pesa STK push at the counter and on your online storefront. Customers pay on their phone; you finish the sale without leaving the till. Cash and split payments are supported in the same flow.",
  },
  {
    question: "Can I use a POS offline in Kenya?",
    answer:
      "Yes. Kiosk keeps selling when Wi‑Fi or mobile data drops. Tickets queue on the device and sync automatically when you are back online — built for real Kenyan shop floors where outages are common.",
  },
  {
    question: "How much does a POS cost in Kenya?",
    answer:
      "Kiosk starts free with 300 products and one cashier — no credit card required. Paid plans begin at KES 300/month as your catalog or team grows, up to custom Enterprise pricing for multi-location shops.",
  },
  {
    question: "How long does it take to set up POS software in Kenya?",
    answer:
      "Most shops claim a subdomain, add products, and take their first sale the same day — typically under 10 minutes to open the till. No consultants or long rollout required.",
  },
  {
    question: "Is Kiosk POS good for mini-marts and dukas?",
    answer:
      "Yes. Kiosk is designed for Kenyan retail counters: fast barcode checkout, M-Pesa, stock alerts, shifts, and an optional online shop from the same stock count. It scales from a single duka to multi-branch retailers.",
  },
] as const;

export type PlatformFaq = (typeof PLATFORM_FAQS)[number];

export const PLATFORM_AUDIENCES = [
  {
    title: "Mini-marts & dukas",
    body: "Fast barcode checkout, M-Pesa STK, and stock alerts built for the neighborhood shop that never stops.",
  },
  {
    title: "Pharmacies & chemists",
    body: "Catalog control, receipts, and one stock count so the counter and the shelf stay honest.",
  },
  {
    title: "Salons & service shops",
    body: "Ring up products and services, take M-Pesa or cash, and close the day with a clear till.",
  },
  {
    title: "Butchery & fresh counters",
    body: "Weight-friendly selling, quick pay, and inventory that matches what you cut and wrap.",
  },
  {
    title: "Multi-branch retailers",
    body: "Transfers, roles, and one ledger across every location — no evening spreadsheet reconciliation.",
  },
  {
    title: "Shops going online",
    body: "Launch a branded storefront on the same inventory your cashiers see. M-Pesa at both ends.",
  },
] as const;

export const PLATFORM_GUIDES = [
  {
    title: "Top 10 POS systems in Kenya (2026)",
    href: "/blog/top-10-pos-systems-kenya-2026",
    blurb: "Ranked on setup speed, native M-Pesa, eTIMS fit, and shop-floor reality.",
  },
  {
    title: "Set up a POS in 30 minutes",
    href: "/blog/set-up-a-pos-in-30-minutes",
    blurb: "From signup to first sale — what actually happens on day one.",
  },
  {
    title: "Why M-Pesa integration matters",
    href: "/blog/why-m-pesa-integration-matters",
    blurb: "Native STK versus bolt-ons — and what that means at the till.",
  },
  {
    title: "Grow a mini-mart in Kenya",
    href: "/blog/how-to-grow-a-mini-mart-in-kenya",
    blurb: "Stock, systems, and routines that turn one shop into a real business.",
  },
] as const;
