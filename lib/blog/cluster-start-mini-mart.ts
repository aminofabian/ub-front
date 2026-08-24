import type { BlogArticle } from "./types";

export const START_MINI_MART_SLUG = "how-to-start-a-mini-mart-in-kenya";

export const START_MINI_MART_ARTICLE: BlogArticle = {
  slug: START_MINI_MART_SLUG,
  title: "How to Start a Mini-Mart in Kenya: From Idea to Opening Day",
  description:
    "How to start a mini-mart in Kenya — capital, location, licenses, first stock, and the till that keeps it honest. A step-by-step plan from idea to opening day.",
  category: "Getting started",
  publishedAt: "2026-08-23",
  updatedAt: "2026-08-24",
  tags: [
    "Mini-mart",
    "Kenya",
    "Retail",
    "Getting started",
    "Startup",
    "Inventory",
    "M-Pesa",
  ],
  keywords: [
    "how to start a mini mart in Kenya",
    "start a mini mart Kenya",
    "mini mart startup cost Kenya",
    "mini mart business plan Kenya",
    "licenses for mini mart Kenya",
    "first stock mini mart",
    "mini mart POS Kenya",
  ],
  author: "Kiosk",
  relatedSlugs: [
    "how-to-grow-a-mini-mart-in-kenya",
    "set-up-a-pos-in-30-minutes",
    "top-10-pos-systems-kenya-2026",
    "online-physical-one-inventory",
    "barcode-search-kenya-lookup-guide",
    "what-hardware-do-you-actually-need",
    "why-m-pesa-integration-matters",
    "building-systems-for-your-mini-mart",
  ],
  faqs: [
    {
      question: "How much money do I need to start a mini-mart in Kenya?",
      answer:
        "A realistic budget for a single-branch estate mini-mart is KSh 350,000–500,000 — initial stock, a three-month rent deposit, basic fixtures, licenses, and a small cash float. You can start leaner with second-hand fixtures and a tighter first order.",
    },
    {
      question: "What licenses do I need to open a mini-mart in Kenya?",
      answer:
        "Register your business name on eCitizen, get your county single business permit (trade license), attach your KRA PIN to the business, register for eTIMS invoicing, and set up an M-Pesa till or Buy Goods number. Start them the day you sign the lease.",
    },
    {
      question: "What should I sell first in my mini-mart?",
      answer:
        "Start with a deep basket of best sellers: staples (maize flour, rice, sugar, cooking oil) at roughly 40% of your stock budget, then drinks, dairy and bread, snacks, toiletries, and airtime. About 20 well-stocked items per category beats a thin spread over 200.",
    },
    {
      question: "Do I need a POS from day one?",
      answer:
        "Yes. Every sale should be rung from day one so your stock counts are honest from day one. Kiosk runs on the phone you already own and starts free — 300 products and one cashier — with M-Pesa and a storefront included.",
    },
    {
      question: "How much stock should I buy before opening?",
      answer:
        "Buy deep on the items you know will sell and keep a working-capital cushion for your first restock cycle. Stock is your cash until it sells — the shops that fail are usually the ones with empty shelves or overflowing slow movers.",
    },
    {
      question: "Is a mini-mart profitable in Kenya?",
      answer:
        "Margins in the category typically run 15–30%, and most owners consider the business genuinely profitable once daily sales cross roughly KSh 50,000 — the point where the shop stops just covering rent and stock and starts generating real profit.",
    },
  ],
  body: [
    {
      type: "paragraph",
      text: "Every mini-mart in Kenya starts with the same picture in someone's head: a bright little shop in the estate, shelves full, the smell of fresh bread, regulars calling your name from the door. The gap between that picture and an actual opening day is mostly decisions — where, how much, what to stock, and which tools to trust. This guide walks the whole journey, step by step, with the numbers and screenshots to make it real.",
    },
    {
      type: "callout",
      tone: "info",
      text: "The honest preview: this is not a get-rich-quick plan. It's a get-it-right plan — realistic capital, the right paperwork, a first order that sells, and a till that keeps every shilling accountable from day one.",
    },
    {
      type: "heading",
      text: "1. Before You Sign Anything: Is This the Right Business?",
    },
    {
      type: "paragraph",
      text: "Mini-marts sit in a sweet spot in Kenyan retail — bigger than a duka, smaller than a supermarket — serving estates, small towns, and peri-urban centers that want convenience close to home. Margins in the space typically run 15–30%, and most owners consider the business genuinely profitable once daily sales cross roughly KSh 50,000. But the business runs on foot traffic, and foot traffic is local.",
    },
    {
      type: "list",
      items: [
        "Location — is there a real crowd? Count people past the shop at 7am and 6pm before you sign.",
        "Capital — can you cover the setup budget and still breathe for two months?",
        "Competition — three dukas on the same street is a war; one supermarket down the road is a signal to specialise.",
        "Your time — you'll be the owner, cashier, stock-taker, and cleaner for the first months. That's the tuition.",
      ],
    },
    {
      type: "callout",
      tone: "warning",
      text: "The most expensive mistake in mini-mart retail is a cheap location. A shop on a quiet street doesn't fail slowly — it fails invisibly. Rent is negotiable; foot traffic is not.",
    },
    {
      type: "heading",
      text: "2. The Money: Startup Budget",
    },
    {
      type: "paragraph",
      text: "Here's where the money actually goes — and the honest range for a single-branch estate shop in 2026:",
    },
    {
      type: "image",
      src: "/blog/mini-mart-startup-budget.svg",
      alt: "Startup budget breakdown for a Kenyan mini-mart: initial stock, rent deposit, shelving and chiller, till setup, licenses, and cash float",
      caption:
        "Stock is the heart of the budget — everything else is the stage. Keep a cushion for the first restock.",
    },
    {
      type: "table",
      headers: ["Item", "Typical cost", "Why it matters"],
      rows: [
        [
          "Initial stock",
          "KSh 200,000–300,000",
          "The only line that makes money; everything else just holds it.",
        ],
        [
          "Rent deposit (3 months)",
          "KSh 60,000–120,000",
          "Landlords want a deposit; negotiate the terms in writing.",
        ],
        [
          "Shelving, chiller & fixtures",
          "KSh 40,000–90,000",
          "Second-hand is fine — a working chiller beats a shiny empty one.",
        ],
        [
          "Till setup",
          "KSh 20,000–50,000",
          "A phone you own plus a scanner and printer is enough to start.",
        ],
        [
          "Licenses & registration",
          "KSh 10,000–20,000",
          "Business name, county permit, KRA and eTIMS, M-Pesa number.",
        ],
        [
          "Cash float & misc",
          "KSh 15,000–30,000",
          "Change, carrier bags, signage, and the surprises of week one.",
        ],
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "Three levers control the total: stock depth over breadth, second-hand fixtures, and a till that runs on the phone you already own. Never spend your last shilling on the shop — the first restock cycle is what proves the business works.",
    },
    {
      type: "heading",
      text: "3. Location & the Floor Plan That Sells",
    },
    {
      type: "paragraph",
      text: "A mini-mart earns per square metre, so layout is strategy. The classic layout that works in Kenyan estates: impulse items at the front, staples along the walls, the chiller at the back, and the counter by the door with a clear view of everything.",
    },
    {
      type: "image",
      src: "/blog/mini-mart-floor-plan.svg",
      alt: "Mini-mart floor plan: entrance at the front, impulse snacks by the door, staples along the walls, chiller at the back, counter with a Kiosk till near the entrance, and visible storage",
      caption:
        "A simple floor plan that moves customers through the shop and keeps every shelf in view from the counter.",
    },
    {
      type: "list",
      items: [
        "Front = impulse — snacks, sodas, and chewing gum catch every walk-in.",
        "Walls = staples — flour, rice, sugar, and oil carry the weekly basket.",
        "Back corner = the chiller — milk and drinks pull customers the full length of the shop.",
        "Counter by the door — the till faces the entrance, so you see who comes, who leaves, and who lingers.",
        "Storage visible from the counter — restocking becomes a walk, not a hunt.",
      ],
    },
    {
      type: "heading",
      text: "4. Licenses & Compliance, Done Once",
    },
    {
      type: "paragraph",
      text: "Paperwork is the least glamorous part of opening — which is exactly why it should be done first. Start the day you sign the lease, in parallel with fitting the shop, so nothing waits on anything else.",
    },
    {
      type: "image",
      src: "/blog/mini-mart-licenses.svg",
      alt: "The licenses checklist: business name registration on eCitizen, county single business permit, KRA PIN, eTIMS invoicing, and an M-Pesa till number",
      caption:
        "Five documents, done once, in the background — while the shelves go up in front.",
    },
    {
      type: "list",
      items: [
        "Business name — registered on eCitizen; sole proprietorship or LLC.",
        "County single business permit — your trade license, displayed near the entrance.",
        "KRA PIN — attached to the business, not just to you.",
        "eTIMS — KRA's electronic invoicing; a modern POS keeps it current automatically.",
        "M-Pesa till or Buy Goods number — how your customers will actually pay you.",
      ],
    },
    {
      type: "callout",
      tone: "info",
      text: "Banks, wholesalers, and county inspectors all ask the same question: is this business registered and tax-clean? Doing it early also unlocks the boring-but-important stuff — supplier credit, M-Pesa limits, and a clean path to a second branch later.",
    },
    {
      type: "heading",
      text: "5. Stock: The Art of the First Order",
    },
    {
      type: "paragraph",
      text: "The first order is where most new shopkeepers either shine or bleed. The rule: deep on best sellers, not wide on everything. Here's a starter shelf split that has walked through a thousand Kenyan doors:",
    },
    {
      type: "image",
      src: "/blog/mini-mart-opening-stock.svg",
      alt: "First stock plan: staples 40%, drinks 15%, dairy and fresh 15%, snacks 12%, toiletries 10%, airtime and data 8%, with pricing and reordering tips",
      caption:
        "A starter shelf split — about 20 best sellers per category, with pricing and reorder rules attached.",
    },
    {
      type: "paragraph",
      text: "Pricing is simple once the till shows you the truth: sell price = buying price + margin, targeting 15–30% across the basket — leaner on staples, fatter on impulse. When the till records every purchase, reordering becomes math: restock fast movers at a third remaining, and never chase slow movers with fresh cash.",
    },
    {
      type: "heading",
      text: "6. The Till: Get Kiosk",
    },
    {
      type: "paragraph",
      text: "Now the tool that holds it all together. When we say get Kiosk, we mean it — it's the POS built for exactly this business: a Kenyan mini-mart with a phone at the counter, M-Pesa in front, and a shelf that needs to stay honest.",
    },
    {
      type: "list",
      items: [
        "Runs on your phone — no terminal wall, no IT project, no card required to start.",
        "Barcode scanning builds your catalog fast — scan a product once and it's in with prices and stock.",
        "Native M-Pesa STK at the till — one tap sends the push, the sale auto-completes on confirmation.",
        "eTIMS-ready — invoices generated per sale, ready for KRA reporting without month-end archaeology.",
        "Free to start — 300 products and one cashier, with your storefront included.",
      ],
    },
    {
      type: "callout",
      tone: "tip",
      text: "The cheapest time to install a good till is day one. Every sale rung from the first morning means stock counts you can trust from the first morning — and a shop where 'shrinkage' stays a word you read, not a cost you feel. Kiosk starts free; set it up before the first customer walks in.",
    },
    {
      type: "heading",
      text: "7. Opening Day",
    },
    {
      type: "paragraph",
      text: "If the prep is done, opening day is almost boring — and that's the goal. Here's a timeline that has worked, from till setup to close:",
    },
    {
      type: "image",
      src: "/blog/mini-mart-opening-day.svg",
      alt: "Opening day timeline: set up the till at 6am, add products and prices at 7am, open at 8am, first M-Pesa sale, and a close-and-check routine at 6pm",
      caption:
        "Morning for setup, morning for the first sale, evening for the truth — and the shop is ready for day two.",
    },
    {
      type: "list",
      items: [
        "Ring every sale, no exceptions — an un-rung sale is a stock ghost you'll chase for weeks.",
        "Get M-Pesa right from the start — if it works on day one, it works forever, and reconciles itself.",
        "Restock on evidence, not mood — let the till's numbers pick tomorrow's order.",
      ],
    },
    {
      type: "heading",
      text: "8. The First Month: Three Numbers to Watch",
    },
    {
      type: "list",
      items: [
        "Daily sales — are you trending toward the KSh 50,000/day zone where the shop stops surviving and starts earning?",
        "Margin % — is the basket earning its 15–30%, or are you discounting winners by accident?",
        "Stockouts — which best sellers keep running out? That's your restock list, straight from the till.",
      ],
    },
    {
      type: "paragraph",
      text: "Watch those three and the shop teaches you what it needs. Ignore them and the shop teaches you anyway — the expensive way.",
    },
    {
      type: "heading",
      text: "Bottom Line",
    },
    {
      type: "callout",
      tone: "tip",
      text: "Starting a mini-mart in Kenya is a sequence of honest decisions: a real location, realistic capital, paperwork done once, a first order that sells, and a till that tells the truth from day one. Get those right and opening day is just the beginning — the growth guide in this series covers what comes next.",
    },
    {
      type: "paragraph",
      text: "Read next:",
    },
    {
      type: "links",
      items: [
        {
          label: "How to Grow a Mini-Mart in Kenya",
          href: "/blog/how-to-grow-a-mini-mart-in-kenya",
          blurb: "From surviving to scaling — compliance, stock control, and reinvestment.",
        },
        {
          label: "Set Up a POS in Kenya in 30 Minutes",
          href: "/blog/set-up-a-pos-in-30-minutes",
          blurb: "Till, storefront, M-Pesa, and eTIMS live the same afternoon.",
        },
        {
          label: "Barcode Search in Kenya: Look Up Any Product",
          href: "/blog/barcode-search-kenya-lookup-guide",
          blurb: "Build your catalog faster by scanning instead of typing.",
        },
        {
          label: "Top 10 POS Systems in Kenya (2026)",
          href: "/blog/top-10-pos-systems-kenya-2026",
          blurb: "The ranking that compares Kenya's POS platforms on M-Pesa, eTIMS, and fit.",
        },
        {
          label: "Online + Physical: One Inventory",
          href: "/blog/online-physical-one-inventory",
          blurb: "One stock count across your web shop and your counter.",
        },
      ],
    },
  ],
};
