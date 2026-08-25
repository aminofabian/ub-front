import type { BlogArticle } from "./types";

/**
 * Full, detailed "how to set up a POS in Kenya" guide.
 * Replaces the listed-only placeholder spoke of the same slug so all
 * existing cross-links keep working.
 */
export const SETUP_POS_ARTICLE: BlogArticle = {
  slug: "set-up-a-pos-in-30-minutes",
  title: "Set Up a POS in Kenya in 30 Minutes",
  description:
    "How to set up a POS in Kenya in 30 minutes — create your account, add products, take M-Pesa payments, and stay eTIMS-ready with KRA. No IT project required.",
  category: "Getting started",
  publishedAt: "2026-07-19",
  updatedAt: "2026-08-24",
  tags: ["Setup", "POS", "Getting started", "Kenya", "eTIMS", "M-Pesa"],
  keywords: [
    "how to set up a POS in Kenya",
    "POS setup guide Kenya",
    "eTIMS POS Kenya",
    "M-Pesa POS setup",
    "POS hardware Kenya",
    "KRA eTIMS invoicing",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "choosing-the-right-pos-kiosk-vs-odoo",
    "what-hardware-do-you-actually-need",
    "why-m-pesa-integration-matters",
    "online-physical-one-inventory",
    "why-kiosk-beats-odoo-for-kenyan-shops",
    "5-signs-youve-outgrown-your-pos",
    "taxes-for-mini-marts-in-kenya",
  ],
  faqs: [
    {
      question: "How much does it cost to set up a POS in Kenya?",
      answer:
        "Kiosk.ke starts free — 300 products and one cashier, with M-Pesa and a storefront included. Hardware is optional at first: most shops begin with a phone or tablet they already own, then add a scanner or receipt printer later.",
    },
    {
      question: "Do I need special hardware or a dedicated machine?",
      answer:
        "No. A phone or tablet is enough to start — that's the whole point of a mobile-first till. If you later want a faster checkout, a barcode scanner and a receipt printer are the two upgrades that pay for themselves.",
    },
    {
      question: "Is the POS eTIMS-compliant with KRA?",
      answer:
        "Kiosk.ke includes built-in tax reporting for day-to-day retail, so invoices generated at the till are kept ready for KRA eTIMS reporting. If eTIMS obligations apply to you, having that built in beats reconciling manually at month end.",
    },
    {
      question: "How do I accept M-Pesa at the till?",
      answer:
        "M-Pesa is built in. Ring up the sale, tap M-Pesa, and the till sends an STK Push to the customer's phone — no gateway, API keys, or third-party plugin required. The till auto-credits the sale on confirmation.",
    },
    {
      question: "Can I also sell online?",
      answer:
        "Yes. Claiming your shop also claims your storefront (yourshop.kiosk.ke). Products you add to the till appear online with the same stock count, so what's on the shelf is what's on the website.",
    },
    {
      question: "How long does it really take?",
      answer:
        "Most shops are live the same afternoon. Account creation takes about two minutes, adding products another 10–20, and your first sale can happen the same hour. Thirty minutes is an honest promise for a modest product list.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Setting up a POS in Kenya shouldn't feel like an IT project. A modern till needs to do four things for a Kenyan shop — record sales, accept M-Pesa, keep stock honest, and stay aligned with KRA reporting. This guide walks through all four, step by step, and shows you exactly what each screen looks like.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The honest promise: with your phone in hand and a list of your best-selling products, most shops are live the same afternoon. No consultant, no implementation weeks, no modules to switch on.",
    },
    {
      type: "heading",
      text: "1. What You Need Before You Start",
    },
    {
      type: "list",
      items: [
        "A phone or tablet — the till lives on the device you already carry.",
        "Your KRA PIN — you'll need it for tax compliance and invoicing.",
        "A product list with prices — start with your 20 best sellers, not the whole shelf.",
        "A phone number for M-Pesa — this is how customers will pay you.",
        "About 30 quiet minutes — that's the whole appointment.",
      ],
    },
    {
      type: "paragraph",
      text: "That's it. You do not need a computer, a dedicated terminal, or a wall of hardware. The software is the POS; your phone is the counter.",
    },
    {
      type: "heading",
      text: "2. Step 1 — Create Your Account",
    },
    {
      type: "paragraph",
      text: "Sign up with your name, email, and a password. Kiosk.ke starts free — 300 products and one cashier — with M-Pesa and a storefront included, so you can get a real feel for the till before paying anything.",
    },
    {
      type: "image",
      src: "/blog/pos-setup-1-account.svg",
      alt: "Creating a Kiosk.ke account with name, email, and password, then verifying the email to get the shop ready",
      caption:
        "Account creation takes about two minutes. The free plan includes M-Pesa and your storefront, so there's nothing to buy before you start.",
    },
    {
      type: "paragraph",
      text: "Check your inbox, tap the verification link, and the account is live. Have your KRA PIN and the phone number you use for M-Pesa nearby — they're needed in the next step.",
    },
    {
      type: "heading",
      text: "3. Step 2 — Claim Your Shop & Storefront",
    },
    {
      type: "paragraph",
      text: "Next you name your business, pick your type (grocery, pharmacy, boutique…), and claim your storefront address — something like yourshop.kiosk.ke. This URL is your shop's home on the internet, and it comes with every plan.",
    },
    {
      type: "image",
      src: "/blog/pos-setup-2-shop.svg",
      alt: "Business setup form claiming a storefront address on kiosk.ke, with a live welcome screen and storefront preview",
      caption:
        "Your storefront is live the moment you create the shop — you can share the link on WhatsApp before dinner.",
    },
    {
      type: "paragraph",
      text: "You'll also connect your M-Pesa details here. Once that's in, the shop is ready: a live storefront URL, an empty catalogue waiting for products, and a till that's seconds away from its first ring.",
    },
    {
      type: "heading",
      text: "4. Step 3 — Add Your Products",
    },
    {
      type: "paragraph",
      text: "This is the step that usually surprises people — because it's fast. Instead of typing every field from scratch, search the product name or scan the barcode. The global catalogue finds the item and pre-fills the details; you just confirm your prices and stock.",
    },
    {
      type: "image",
      src: "/blog/pos-setup-3-products.svg",
      alt: "Adding products in Kiosk.ke: a global product search pre-fills details, and the add-product drawer sets buying price, sell price, barcode, and opening stock",
      caption:
        "The catalogue lookup fills the boring parts. You supply the prices and the opening stock — that's where your margin lives.",
    },
    {
      type: "list",
      items: [
        "Buying price — what you paid the supplier; the till uses it to show your margin.",
        "Sell price — what the customer pays; the difference is your profit per unit.",
        "Barcode — scan or type it; the SKU fills itself if you leave it blank.",
        "Opening quantity — what's on the shelf today; this is your stock baseline.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "Selling one brand in several sizes — Coca-Cola in 300 ml, 500 ml, and 1 L? Create a Group product and add each size as a variant. One catalogue entry, one stock view, three sellable items. It keeps your product list tidy from day one.",
    },
    {
      type: "heading",
      text: "5. Step 4 — Take Your First Sale",
    },
    {
      type: "paragraph",
      text: "Now the fun part. Tap through your till, add items to the cart, and take payment — cash or M-Pesa. With M-Pesa, one tap sends an STK Push to the customer's phone, and the sale auto-completes the moment they confirm their PIN.",
    },
    {
      type: "image",
      src: "/blog/pos-setup-4-sale.svg",
      alt: "The till showing a cart of two products with M-Pesa STK Push sent to the customer's phone, then a completed sale receipt",
      caption:
        "First sale done: stock decremented, eTIMS invoice queued, and the storefront updated — all from one ring at the till.",
    },
    {
      type: "paragraph",
      text: "Watch what happens automatically: the stock count drops, the storefront shows the same new number, and the invoice is queued for tax reporting. That single shared stock count is what stops you from selling things you don't have.",
    },
    {
      type: "heading",
      text: "6. Step 5 — Stay eTIMS-Ready with KRA",
    },
    {
      type: "paragraph",
      text: "eTIMS — KRA's electronic tax invoice management system — is now part of doing business in Kenya. The painless way to stay compliant is software that does the record-keeping for you, not a notebook you reconstruct at month end.",
    },
    {
      type: "image",
      src: "/blog/pos-setup-5-compliance.svg",
      alt: "The tax and compliance dashboard showing eTIMS connected with all invoices synced, plus a month-end recap of sales, stock accuracy, and M-Pesa share",
      caption:
        "Compliance is a background process: every sale generates the right paper trail without you thinking about it.",
    },
    {
      type: "paragraph",
      text: "Kiosk.ke includes built-in tax reporting for day-to-day retail, so the invoice for every till and online sale is kept ready for eTIMS reporting. When your accountant asks for numbers, they're already there — accurate, dated, and reconciled with your stock.",
    },
    {
      type: "heading",
      text: "7. Common Setup Mistakes to Avoid",
    },
    {
      type: "list",
      items: [
        "Trying to add the entire shelf on day one — your 20 best sellers cover 80% of sales; the rest can follow.",
        "Guessing sell prices — enter a real buying price so the margin column is honest.",
        "Mixing units — decide early whether rice sells by the kilo, the packet, or both, and stick to one for each product.",
        "Trusting a barcode scan blindly — glance at the picture and name; two products can share a digit.",
        "Waiting for 'the right time' — the right time is this afternoon, while your competitor's WhatsApp line is busy.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "You don't need an IT project to go digital — you need a phone, a product list, and half an hour. Start with your best sellers, take the first M-Pesa payment, and let the till earn its keep from day one. The rest of the catalogue can catch up tomorrow.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "What Hardware Do You Actually Need?",
          href: "/blog/what-hardware-do-you-actually-need",
          blurb: "Phone, scanner, printer — the only kit a Kenyan counter really needs.",
        },
        {
          label: "Why M-Pesa Integration Matters",
          href: "/blog/why-m-pesa-integration-matters",
          blurb: "Why native mobile money beats bolted-on payment plugins.",
        },
        {
          label: "Online + Physical: One Inventory",
          href: "/blog/online-physical-one-inventory",
          blurb: "One stock count across your web shop and your counter.",
        },
        {
          label: "Why Kiosk.ke Beats Odoo for Kenyan Shops",
          href: "/blog/why-kiosk-beats-odoo-for-kenyan-shops",
          blurb: "The case for a turnkey till over a months-long ERP setup.",
        },
        {
          label: "Choosing the Right POS: Kiosk.ke vs. Odoo",
          href: "/blog/choosing-the-right-pos-kiosk-vs-odoo",
          blurb: "The balanced guide to picking the platform that fits your business.",
        },
      ],
    },
  ],
};
