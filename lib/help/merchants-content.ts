import type { HelpArticle, HelpCategoryDef } from "./types";

export const MERCHANT_CATEGORIES: HelpCategoryDef[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Create your shop, claim a subdomain, and go live.",
    icon: "rocket",
  },
  {
    slug: "point-of-sale",
    title: "Point of sale",
    description: "Scan, sell, print receipts, and run the till.",
    icon: "scan",
  },
  {
    slug: "mpesa-payments",
    title: "M-Pesa & payments",
    description: "STK Push, cash, split payments, and settlements.",
    icon: "smartphone",
  },
  {
    slug: "inventory",
    title: "Inventory & stock",
    description: "Catalog, barcodes, stock takes, and transfers.",
    icon: "package",
  },
  {
    slug: "suppliers-supplies",
    title: "Suppliers & supplies",
    description: "Vendors, receiving stock, costs, and what you owe.",
    icon: "truck",
  },
  {
    slug: "storefront",
    title: "Online storefront",
    description: "Yourshop.kiosk.ke, branding, and web orders.",
    icon: "store",
  },
  {
    slug: "staff-branches",
    title: "Staff & branches",
    description: "Users, roles, PIN login, and multi-branch stock.",
    icon: "users",
  },
];

export const MERCHANT_ARTICLES: HelpArticle[] = [
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "get-the-most-from-kiosk",
    title: "Get the most out of Kiosk",
    description:
      "The master guide: one catalog, one till, one storefront. Follow the daily rhythm, then jump into every deeper guide from here.",
    updatedAt: "2026-08-24",
    tags: [
      "kiosk",
      "POS",
      "guide",
      "getting started",
      "best practices",
      "workflow",
      "checklist",
      "hub",
    ],
    popular: true,
    relatedSlugs: [
      "how-to-add-products",
      "complete-supplier-flow",
      "user-roles-add-users",
      "open-the-cashier-for-the-first-time",
      "set-up-your-online-store",
    ],
    body: [
      {
        type: "paragraph",
        text: "Kiosk is one system for the whole shop: the till, the catalog, suppliers, staff, and your online storefront all share one stock count. This is the anchor guide — read the daily rhythm below, then open the deeper guide for whatever you are doing next. Every section links to the full walkthrough.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "The one idea that makes everything else easy: everything lives in one catalog. Add a product once, and it is at the till, in stock reports, and on your storefront. Record a supply and stock rises everywhere. No spreadsheets to reconcile.",
      },
      {
        type: "heading",
        text: "Start here — the daily rhythm",
      },
      {
        type: "steps",
        items: [
          "Open the day: glance at low-stock counters, top up the till float, and unlock the cashier with your PIN.",
          "Sell: scan or search products, take cash or send an M-Pesa STK prompt, split a payment when a customer is short.",
          "Hand out the receipt — printed or digital — and move to the next customer.",
          "Close the shift: reconcile the day, note anything odd, and deposit the cash float.",
          "Weekly: record every delivery as a supply so stock stays honest, and pay suppliers from the ledger.",
          "Monthly: review unpaid bills in AP aging, spot-check margins, and tidy the catalog (missing barcodes, no-price items).",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "If the network drops mid-rush, keep selling — cash sales continue offline and sync when you reconnect. M-Pesa can wait for the connection to return.",
      },
      {
        type: "heading",
        text: "Set up once, sell forever",
      },
      {
        type: "links",
        items: [
          {
            label: "Create your Kiosk shop",
            description: "Sign up, name your business, and claim your subdomain.",
            href: "/help/merchants/getting-started/create-your-kiosk-shop",
          },
          {
            label: "Claim your subdomain",
            description: "Pick yourshop.kiosk.ke — the address customers will remember.",
            href: "/help/merchants/getting-started/claim-your-subdomain",
          },
          {
            label: "Add products the right way",
            description: "Single, groups, variants, and packages — with screenshots.",
            href: "/help/merchants/inventory/how-to-add-products",
          },
          {
            label: "User roles & how to add users",
            description: "Invite staff, pick roles, assign branches and PINs.",
            href: "/help/merchants/staff-branches/user-roles-add-users",
          },
        ],
      },
      {
        type: "heading",
        text: "Sell at the till",
      },
      {
        type: "links",
        items: [
          {
            label: "Open the cashier for the first time",
            description: "Launch the till and take your first sale.",
            href: "/help/merchants/getting-started/open-the-cashier-for-the-first-time",
          },
          {
            label: "Scan barcodes at the till",
            description: "USB, Bluetooth, or camera scanning for fast checkout.",
            href: "/help/merchants/point-of-sale/scan-barcodes-at-the-till",
          },
          {
            label: "Accept M-Pesa with STK Push",
            description: "Send a payment prompt to the customer's phone.",
            href: "/help/merchants/mpesa-payments/accept-mpesa-stk",
          },
          {
            label: "Apply discounts & split payments",
            description: "Reduce a line or cart, and take cash plus M-Pesa.",
            href: "/help/merchants/point-of-sale/apply-discounts-and-split-payments",
          },
          {
            label: "Print or share receipts",
            description: "Paper or digital — get the receipt out fast.",
            href: "/help/merchants/point-of-sale/print-or-share-receipts",
          },
          {
            label: "Sell when the network drops",
            description: "Offline cash sales that sync when you reconnect.",
            href: "/help/merchants/point-of-sale/sell-when-offline",
          },
        ],
      },
      {
        type: "heading",
        text: "Stock & suppliers",
      },
      {
        type: "links",
        items: [
          {
            label: "The complete supplier flow",
            description: "Connect, order, receive, pay — the full vendor loop.",
            href: "/help/merchants/suppliers-supplies/complete-supplier-flow",
          },
          {
            label: "Understand stock levels",
            description: "How on-hand updates after sales, supplies, and transfers.",
            href: "/help/merchants/inventory/understand-stock-levels",
          },
          {
            label: "Run a stock take",
            description: "Count shelves and reconcile so reports stay honest.",
            href: "/help/merchants/inventory/run-a-stock-take",
          },
          {
            label: "Transfer stock between branches",
            description: "Move inventory between locations without double-counting.",
            href: "/help/merchants/inventory/transfer-stock-between-branches",
          },
          {
            label: "Fix missing barcodes",
            description: "Attach codes before peak hours so the till stays fast.",
            href: "/help/merchants/inventory/fix-missing-barcodes",
          },
        ],
      },
      {
        type: "heading",
        text: "Grow online",
      },
      {
        type: "links",
        items: [
          {
            label: "Set up your online store",
            description: "Turn on yourshop.kiosk.ke so customers can order.",
            href: "/help/merchants/storefront/set-up-your-online-store",
          },
          {
            label: "Brand your storefront",
            description: "Logo, colors, and the title customers see in search.",
            href: "/help/merchants/storefront/brand-your-storefront",
          },
          {
            label: "Manage web orders",
            description: "Fulfill online orders without juggling WhatsApp screenshots.",
            href: "/help/merchants/storefront/manage-web-orders",
          },
        ],
      },
      {
        type: "heading",
        text: "Run the team",
      },
      {
        type: "links",
        items: [
          {
            label: "Staff PIN login at the till",
            description: "Unlock a shared device with a short PIN.",
            href: "/help/merchants/staff-branches/staff-pin-login",
          },
          {
            label: "Add staff and roles",
            description: "Cashiers sell, managers run, owners own.",
            href: "/help/merchants/staff-branches/add-staff-and-roles",
          },
          {
            label: "Work with multiple branches",
            description: "Track stock and sales per location.",
            href: "/help/merchants/staff-branches/work-with-multiple-branches",
          },
        ],
      },
      {
        type: "heading",
        text: "Payments",
      },
      {
        type: "links",
        items: [
          {
            label: "Configure payment settings",
            description: "Connect M-Pesa credentials and review settlements.",
            href: "/help/merchants/mpesa-payments/configure-payment-settings",
          },
          {
            label: "Accept card payments with Paystack",
            description: "Let customers pay by card on your storefront.",
            href: "/help/merchants/mpesa-payments/accept-card-payments-paystack",
          },
          {
            label: "Troubleshoot a failed STK payment",
            description: "Why prompts fail and what to do next.",
            href: "/help/merchants/mpesa-payments/troubleshoot-failed-stk",
          },
        ],
      },
      {
        type: "heading",
        text: "Habits that keep the shop honest",
      },
      {
        type: "list",
        items: [
          "Record every supply — stock updates itself and cost stays attached to the vendor.",
          "Group products by brand with variants instead of near-duplicate singles.",
          "Set a reorder level on fast movers so the low-stock counters tell you what to buy.",
          "Pay suppliers from the ledger weekly — unpaid bills stack up quietly.",
          "Deactivate leavers the same day and never share the owner login.",
          "Let the storefront sell for you: one catalog feeds the till and the website together.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Where do I start if I am brand new?",
            answer:
              "Follow the Set up section: create the shop, claim the subdomain, add a few products (single or group), then add the first user. Take a test sale on the cashier the same day.",
          },
          {
            question: "How do I keep stock accurate without extra work?",
            answer:
              "Record deliveries as supplies instead of editing stock by hand. Sales and the storefront already update stock automatically — supplies are the missing piece.",
          },
          {
            question: "What is the best way to organise products?",
            answer:
              "Use groups with variants for any brand that comes in sizes or colours, packages for trays and crates, and plain single products only for true one-offs.",
          },
          {
            question: "Can I run the till without the internet?",
            answer:
              "Yes. Cash sales keep working offline and sync when you reconnect. Finish M-Pesa payments once the network is back.",
          },
          {
            question: "How do I get customers ordering online?",
            answer:
              "Finish your branding, make sure products have prices and stock, then share yourshop.kiosk.ke on WhatsApp and social media. Orders land in Web orders.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "create-your-kiosk-shop",
    title: "Create your Kiosk shop",
    description:
      "Sign up, name your business, verify your email, and set up the till — screenshots for every step of the journey.",
    updatedAt: "2026-08-24",
    tags: ["signup", "subdomain", "onboarding", "verify email", "business name", "questionnaire"],
    popular: true,
    relatedSlugs: [
      "why-kiosk-stands-out",
      "claim-your-subdomain",
      "invite-your-first-staff",
      "get-the-most-from-kiosk",
      "how-to-add-products",
    ],
    body: [
      {
        type: "paragraph",
        text: "Kiosk is built for shop counters in Kenya — one system for the till, your catalog, suppliers, staff, and a free online storefront that shares the same stock. Creating your shop takes about ten minutes: create the account, name the business, verify your email, answer six quick questions, and you can take your first sale the same day.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "You get a free yourshop.kiosk.ke subdomain with every shop, so you can start selling online without buying a domain. Add a custom domain later from Business → Domains when you are ready.",
      },
      {
        type: "heading",
        text: "What you need before you start",
      },
      {
        type: "list",
        items: [
          "A business name — use the one customers already know; it appears on receipts and your online storefront.",
          "An email address you can check right now (verification is the one blocker).",
          "About ten minutes and any device — phone, tablet, or desktop.",
          "Nothing else. No merchant ID, no hardware, no installation.",
        ],
      },
      {
        type: "heading",
        text: "Step 1 — Create your account",
      },
      {
        type: "steps",
        items: [
          "Open kiosk.ke and choose Get started (or visit the signup page directly).",
          "Enter your full name — this is the owner account.",
          "Add your email and a password of at least 8 characters.",
          "Tap Submit. You will verify the email in Step 3.",
        ],
      },
      {
        type: "image",
        src: "/help/signup-create-account.svg",
        alt: "Create your account signup page with full name, email, and password fields, a Create your shop call-to-action card, and a branded operations-hub panel on the right",
        caption:
          "The signup page — full name, email, password. The Create your shop card above the form is the fast path for new businesses.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Prefer to skip the form? Tap “Create your shop” on the signup page to name the business first — the account form fills in afterwards and you still become the owner.",
      },
      {
        type: "heading",
        text: "Step 2 — Name your business",
      },
      {
        type: "paragraph",
        text: "Back on the signup page, the Create your shop card asks for the business name and country. Your shop gets a free subdomain from the name, and you become the owner — no invite token needed.",
      },
      {
        type: "steps",
        items: [
          "Tap Create your shop on the signup page.",
          "Enter the Business name exactly as customers know it (e.g. Sunrise Groceries).",
          "Choose where you operate — Kiosk uses the country for currency, phone formats, and region defaults.",
          "Tap Create business & sign up.",
        ],
      },
      {
        type: "image",
        src: "/help/signup-name-business.svg",
        alt: "Name your business card with business name Sunrise Groceries showing an Available check, a country selector for Kenya, and a Create business and sign up button",
        caption:
          "Name the business — availability is checked instantly and your free subdomain follows (sunrisegroceries.kiosk.ke).",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Keep the name short and close to your trading name. The subdomain is derived from it, and the name appears on receipts, reports, and the storefront.",
      },
      {
        type: "heading",
        text: "Step 3 — Verify your email",
      },
      {
        type: "steps",
        items: [
          "Watch for an email from Kiosk — check the spam or promotions folder if nothing arrives in a minute.",
          "Open the verification link in the same browser you signed up in. No need to sign in again.",
          "You land straight in your dashboard, where the short setup questionnaire waits.",
        ],
      },
      {
        type: "image",
        src: "/help/verify-email.svg",
        alt: "Email verification success screen with a green checkmark, a message that a link was sent to jane@company.com, an Open verification page button, and a note to check the inbox and spam",
        caption:
          "Verify once and the door opens — after the link, you are straight into your account.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Still no email after a few minutes? Re-enter your email on the signup page or use the Open verification page button on screen.",
      },
      {
        type: "heading",
        text: "Step 4 — Tell us about your shop",
      },
      {
        type: "paragraph",
        text: "A six-question setup walks you through the decisions that shape your workspace. Answer honestly — everything is editable later, and the answers pre-fill your departments, storefront, and branding.",
      },
      {
        type: "list",
        items: [
          "Locations — how many branches you run and what you call each one.",
          "Shop type — mini mart, butchery, full grocery, fresh market, mixed shop, and more (pick all that apply).",
          "Product sections — the departments you sell now; suggested automatically from your shop types.",
          "Online store — turn on yourshop.kiosk.ke now, or stay in-store only and enable it later.",
          "Branding — your display name and colours; the logo is optional.",
          "Stock your shelves — import starter products from the shared catalog, or add products manually.",
        ],
      },
      {
        type: "image",
        src: "/help/onboarding-questionnaire.svg",
        alt: "Setup questionnaire showing the shop-type step with Mini mart and Butchery selected, progress at 50 percent, and other options like full grocery and fresh market",
        caption:
          "The questionnaire — six steps, about a minute, and it pre-fills your shop.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "A mini mart can also include a butchery — select every format you sell. Sections and the online store can be changed later in Business settings, so do not overthink it.",
      },
      {
        type: "heading",
        text: "Step 5 — Land in your dashboard",
      },
      {
        type: "paragraph",
        text: "Setup ends in your dashboard, where a welcome drawer shows the fastest path to your first sale: add products (or import a starter pack), then open the cashier.",
      },
      {
        type: "steps",
        items: [
          "Tap Add your first product — the create drawer opens ready for a name and price.",
          "Or import common products from the shared catalog in the final setup step.",
          "Open Cashier and take a test sale — cash or M-Pesa STK.",
          "Invite your first staff member from Users so the till is ready for the team.",
        ],
      },
      {
        type: "image",
        src: "/help/welcome-dashboard.svg",
        alt: "Dashboard with a welcome drawer showing three mini steps for picking product type, setting prices and barcodes, and adding stock, plus an Add your first product button",
        caption:
          "The welcome drawer — a guided start to your first products, with the full guide one tap away.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Nothing here is permanent: rename the business, tweak departments, redo branding, or change the subdomain (with care — shared links break) any time from Business settings.",
      },
      {
        type: "heading",
        text: "Where to go next",
      },
      {
        type: "links",
        items: [
          {
            label: "Get the most out of Kiosk",
            description: "The master guide — daily rhythm and every deeper guide linked from one page.",
            href: "/help/merchants/getting-started/get-the-most-from-kiosk",
          },
          {
            label: "Add products the right way",
            description: "Single, groups, variants, and packages — with screenshots.",
            href: "/help/merchants/inventory/how-to-add-products",
          },
          {
            label: "Claim your subdomain",
            description: "Choose and reserve the perfect yourshop.kiosk.ke address.",
            href: "/help/merchants/getting-started/claim-your-subdomain",
          },
          {
            label: "User roles & how to add users",
            description: "Invite staff, pick roles, assign branches and PINs.",
            href: "/help/merchants/staff-branches/user-roles-add-users",
          },
          {
            label: "Open the cashier for the first time",
            description: "Launch the till and take your first sale.",
            href: "/help/merchants/getting-started/open-the-cashier-for-the-first-time",
          },
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Is Kiosk free to start?",
            answer:
              "Yes. You can create a shop and start selling without paying upfront. Pricing plans are listed on the kiosk.ke home page.",
          },
          {
            question: "Do I need a custom domain on day one?",
            answer:
              "No. Every shop gets a free yourshop.kiosk.ke subdomain. Add a custom domain later from Business → Domains.",
          },
          {
            question: "What device do I need?",
            answer:
              "Any phone, tablet, or desktop with a browser. The cashier screen works on shared tablets with PIN login, and you can add a barcode scanner or receipt printer whenever you want.",
          },
          {
            question: "Can I change the business name or country later?",
            answer:
              "The display name is editable from Business settings any time. The country drives currency and region defaults — change it early if you picked the wrong one, before suppliers and stock accumulate.",
          },
          {
            question: "What if the verification email never arrives?",
            answer:
              "Check spam and promotions first, then re-enter your email on the signup page or use the Open verification page button. If it still fails, contact support from the help center.",
          },
          {
            question: "Can I run more than one shop?",
            answer:
              "Yes. Add branches from Branches in the dashboard — each location keeps its own stock and sales under one business account.",
          },
          {
            question: "Do I need a printer or scanner to start?",
            answer:
              "No. Search and camera scanning work without hardware, and receipts can be shared digitally. Add a thermal printer or USB scanner whenever the counter demands it.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "why-kiosk-stands-out",
    title: "Why Kiosk stands out from other POS",
    description:
      "Built for Kenyan counters: M-Pesa STK, offline sales, one stock count for till and storefront — without bolt-on modules.",
    updatedAt: "2026-07-21",
    tags: [
      "POS Kenya",
      "comparison",
      "M-Pesa",
      "offline",
      "storefront",
      "why Kiosk",
    ],
    popular: true,
    relatedSlugs: [
      "create-your-kiosk-shop",
      "sell-when-offline",
      "accept-mpesa-stk",
      "set-up-your-online-store",
      "why-record-supplies",
    ],
    body: [
      {
        type: "paragraph",
        text: "Most POS tools were designed for other markets and bolted onto Kenya later — or they sell you a till, then charge again for stock, suppliers, and an online shop. Kiosk is built for the counter you already run: scan barcodes, take M-Pesa, keep selling when the network drops, and share one catalog with yourshop.kiosk.ke.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "One system at the till and online — not a cashier app plus a separate inventory spreadsheet plus a third storefront.",
      },
      {
        type: "heading",
        text: "What makes Kiosk different",
      },
      {
        type: "list",
        items: [
          "M-Pesa STK at the counter — send a prompt to the customer’s phone; no shouting till numbers across the shop.",
          "Offline-ready selling — cash sales continue when Wi‑Fi or mobile data drops; they sync when you reconnect.",
          "One stock truth — sales, supplies, transfers, and the online storefront share the same on-hand count.",
          "Storefront included — every shop gets yourshop.kiosk.ke with branding, so counter and online are not two catalogs.",
          "Supplies that update stock — post a delivery and quantities rise automatically; costs and payables stay attached to the vendor.",
          "Groups and variants — keep brands tidy (Coca-Cola → 300 ml / 500 ml) instead of a flat mess of near-duplicate products.",
          "Built with shop owners — barcode scan, split cash + M-Pesa, multi-branch transfers, and staff PIN login for shared tills.",
          "No module maze — barcode, M-Pesa, offline POS, inventory, suppliers, and analytics ship as one platform, not a shopping list of add-ons.",
        ],
      },
      {
        type: "heading",
        text: "Where generic POS often falls short in Kenya",
      },
      {
        type: "list",
        items: [
          "Weak or afterthought M-Pesa — or only “enter amount on the customer’s phone” without a proper STK flow from the till.",
          "Cloud-only tills that freeze when Safaricom/Airtel or Wi‑Fi blips during a rush.",
          "Inventory and e‑commerce sold separately, so stock on the shelf never matches the website.",
          "Receiving goods by manually editing stock, with no supplier bill or cost history.",
          "Designed for US/EU card rails first — Kenya’s cash + M-Pesa reality is secondary.",
        ],
      },
      {
        type: "heading",
        text: "Who Kiosk is for",
      },
      {
        type: "paragraph",
        text: "Kiosks, dukas, groceries, butcheries, and multi-branch shops that need a fast till today and a real online shop without hiring a systems integrator. Free to start on kiosk.ke — claim a subdomain and sell the same afternoon.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Is Kiosk only a cashier screen?",
            answer:
              "No. Cashier is the front door. Behind it you get catalog, supplies, stock takes, branches, staff roles, analytics, and a branded storefront on the same stock.",
          },
          {
            question: "Do I need extra apps for M-Pesa or inventory?",
            answer:
              "No. STK payments, inventory, suppliers, and the online shop are part of the same Kiosk workspace — not separate products you stitch together.",
          },
          {
            question: "What if the internet goes down mid-sale?",
            answer:
              "Keep taking cash sales offline. Complete M-Pesa when the network returns. Offline sales sync so stock and reports catch up.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "claim-your-subdomain",
    title: "Claim your subdomain",
    description:
      "Pick a unique yourshop.kiosk.ke address for your branded storefront.",
    updatedAt: "2026-07-01",
    tags: ["subdomain", "domain", "branding"],
    relatedSlugs: ["create-your-kiosk-shop", "set-up-your-online-store"],
    body: [
      {
        type: "paragraph",
        text: "Your subdomain is the public address for your online shop, for example mama-mboga.kiosk.ke. Choose something short, memorable, and close to your trading name.",
      },
      {
        type: "steps",
        items: [
          "During onboarding, enter the subdomain you want.",
          "Kiosk checks availability instantly.",
          "Confirm to reserve it for your business.",
          "Later, open Business → Domains if you want to connect a custom domain.",
        ],
      },
      {
        type: "list",
        items: [
          "Use letters, numbers, and hyphens only.",
          "Avoid spaces and special characters.",
          "Prefer the name customers already search for.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Changing a subdomain later can break shared links. Pick carefully the first time.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "add-your-first-products",
    title: "Add your first products",
    description:
      "Create product groups and variants so one brand (like Coca-Cola) stays tidy at the till, online, and in stock counts.",
    updatedAt: "2026-07-21",
    tags: ["products", "catalog", "groups", "variants", "barcode", "import"],
    popular: true,
    relatedSlugs: ["scan-barcodes-at-the-till", "run-a-stock-take", "how-to-add-products"],
    body: [
      {
        type: "paragraph",
        text: "Sales and your online storefront share one catalog. Before your first shift, add products so cashiers can scan instead of typing — and set them up as groups with variants whenever the same brand comes in more than one size, colour, or pack.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Default habit: create a Group for the brand or product line, then add Variants for each sellable SKU (300 ml, 500 ml, 1 L, Red, Blue, …). Use Single product only for one-off items that will never have siblings.",
      },
      {
        type: "heading",
        text: "Why groups and variants matter",
      },
      {
        type: "list",
        items: [
          "One place to find the brand — cashiers search “Coca-Cola” and pick 300 ml or 500 ml instead of hunting three separate products.",
          "Cleaner catalog — stock, pricing, and barcodes live on each variant, while the group holds the shared name and category.",
          "Variants inherit the group’s category — set Soft drinks once on the group; every size you add stays correctly classified.",
          "Storefront stays organized — shoppers see one product family with size options instead of a flat list of near-duplicates.",
          "Easier stock takes and reports — you count and sell by SKU, but browse by brand.",
        ],
      },
      {
        type: "heading",
        text: "Step 1 — Create a product group",
      },
      {
        type: "steps",
        items: [
          "Open Products in the dashboard, then choose Add / New product.",
          "At the top of the drawer, switch from Single product to Group.",
          "Enter the Group name (the brand or family — e.g. Coca-Cola).",
          "Pick Category and Department. Variants you add next will inherit this category.",
          "Tap Create group. The group itself is not sold at the till — the variants are.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-group.png",
        alt: "New product group drawer with Group selected, group name Coca-Cola, Soft drinks category, and Create group button",
        caption:
          "Toggle Group, name the brand, set category once — then Create group.",
      },
      {
        type: "heading",
        text: "Step 2 — Add variants under the group",
      },
      {
        type: "steps",
        items: [
          "Open the group you just created in Products.",
          "Choose Add variant (on the product detail panel).",
          "For each sellable size or option, enter a Variant name (e.g. 300 ml, 500 ml), sell price, and barcode if you have one.",
          "Use Add another variant to create several sizes in one go.",
          "Tap Create variants. Each variant becomes its own SKU with its own stock and barcode — still nested under the group.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-variants.png",
        alt: "Add variants drawer for Coca-Cola showing 300 ml and 500 ml rows with prices and Create 2 variants",
        caption:
          "Add every size or option as a variant under the group — each gets its own price and barcode.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Package sizes (tray, crate) are different: on a single product you can enable “Sell in different units” so a tray deducts shared parent stock. Option variants under a group (sizes/colours) usually keep their own stock. Pick the model that matches how you receive goods.",
      },
      {
        type: "heading",
        text: "When a single product is fine",
      },
      {
        type: "list",
        items: [
          "Truly unique items with no sizes or colours (e.g. one handmade craft).",
          "You will never add a sibling SKU under the same brand name.",
        ],
      },
      {
        type: "steps",
        items: [
          "Leave Single product selected.",
          "Enter name, price, barcode, and opening stock.",
          "Optionally enable Sell in different units for trays/crates of that same item.",
          "Or import many SKUs at once from Business → Import / CSV — then convert families into groups + variants as you tidy the catalog.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Avoid creating “Coca-Cola 300ml”, “Coca-Cola 500ml”, and “Coca-Cola 1L” as three unrelated single products. That duplicates search noise, breaks category inheritance, and makes the storefront harder to shop. Prefer one group + variants from day one.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Can I turn an existing single product into a group later?",
            answer:
              "Yes — open the product and use Add variant / Add sibling to grow a family under a parent. Starting as a group is cleaner when you already know sizes are coming.",
          },
          {
            question: "Do groups appear on the cashier?",
            answer:
              "Cashiers sell variants (the SKUs with prices and barcodes). Searching the brand name surfaces those variants under the group so checkout stays fast.",
          },
          {
            question: "What if an item has no barcode?",
            answer:
              "You can still sell it by searching the product or variant name on the cashier screen. Add the barcode later from the product detail when packaging arrives.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "getting-started",
    slug: "open-the-cashier-for-the-first-time",
    title: "Open the cashier for the first time",
    description:
      "Launch the till on a phone, tablet, or desktop and take your first sale.",
    updatedAt: "2026-07-01",
    tags: ["cashier", "pos", "first sale"],
    relatedSlugs: ["scan-barcodes-at-the-till", "accept-mpesa-stk"],
    body: [
      {
        type: "paragraph",
        text: "The cashier screen is optimized for speed at the counter. Staff can sign in with a PIN on shared devices.",
      },
      {
        type: "steps",
        items: [
          "Sign in as staff or owner.",
          "Open Cashier from the main navigation.",
          "Add items by scanning or searching.",
          "Collect cash or send an M-Pesa STK request, then complete the sale.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Can I use cashier offline?",
            answer:
              "Yes. Kiosk is built to keep selling when the network drops. Offline sales sync when connectivity returns.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "scan-barcodes-at-the-till",
    title: "Scan barcodes at the till",
    description:
      "Use a USB or Bluetooth scanner, or the on-device camera, to ring up items fast.",
    updatedAt: "2026-07-01",
    tags: ["barcode", "scanner", "cashier"],
    popular: true,
    relatedSlugs: ["add-your-first-products", "apply-discounts-and-split-payments"],
    body: [
      {
        type: "paragraph",
        text: "Barcode scanning keeps queues short. Point the scanner at the barcode or use search when a code is missing or damaged.",
      },
      {
        type: "steps",
        items: [
          "Focus the cashier search / scan field.",
          "Scan the product barcode — it should appear in the cart.",
          "Adjust quantity if the customer takes more than one.",
          "Continue scanning until the cart is complete.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "If a scan does nothing, check that the barcode is saved on the product and that the scanner is in keyboard-wedge mode.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "apply-discounts-and-split-payments",
    title: "Apply discounts and split payments",
    description:
      "Reduce a line or cart total, and take part cash plus part M-Pesa.",
    updatedAt: "2026-07-01",
    tags: ["discount", "split payment", "cashier"],
    relatedSlugs: ["accept-mpesa-stk", "print-or-share-receipts"],
    body: [
      {
        type: "paragraph",
        text: "Promotions and mixed tenders are common at Kenyan counters. Kiosk lets you discount and split without leaving the sale.",
      },
      {
        type: "list",
        items: [
          "Apply a percentage or fixed discount when your role allows it.",
          "Split the remaining balance across cash and M-Pesa.",
          "Confirm each tender before completing the sale.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Discount permissions can be limited per staff role so only supervisors can approve large reductions.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "print-or-share-receipts",
    title: "Print or share receipts",
    description:
      "Issue a paper receipt or share a digital copy after checkout.",
    updatedAt: "2026-07-01",
    tags: ["receipt", "print", "cashier"],
    relatedSlugs: ["scan-barcodes-at-the-till", "sell-when-offline"],
    body: [
      {
        type: "paragraph",
        text: "After a successful sale, you can print to a connected receipt printer or share the receipt details with the customer.",
      },
      {
        type: "steps",
        items: [
          "Complete the sale on the cashier screen.",
          "Choose print if a thermal printer is connected.",
          "Or open the sale from Sales history to reprint later.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "point-of-sale",
    slug: "sell-when-offline",
    title: "Sell when the network drops",
    description:
      "Keep ringing up cash sales offline; sync when connectivity returns.",
    updatedAt: "2026-07-01",
    tags: ["offline", "sync", "pos"],
    popular: true,
    relatedSlugs: ["accept-mpesa-stk", "open-the-cashier-for-the-first-time"],
    body: [
      {
        type: "paragraph",
        text: "Network outages should not stop the counter. Offline mode lets you continue cash sales and queue them for sync.",
      },
      {
        type: "list",
        items: [
          "Cash sales can continue while offline.",
          "M-Pesa STK needs a live connection — use cash or complete STK when the network returns.",
          "When you reconnect, pending sales sync to the dashboard and stock counts update.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Watch the connection indicator on the cashier screen before promising an M-Pesa payment.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "accept-mpesa-stk",
    title: "Accept M-Pesa with STK Push",
    description:
      "Send a payment prompt to the customer’s phone and confirm at the till.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "stk", "lipa na mpesa"],
    popular: true,
    relatedSlugs: ["troubleshoot-failed-stk", "apply-discounts-and-split-payments"],
    body: [
      {
        type: "paragraph",
        text: "STK Push asks the customer to enter their M-Pesa PIN on their phone. You do not need to read a till number aloud.",
      },
      {
        type: "steps",
        items: [
          "Build the cart and choose M-Pesa as the payment method.",
          "Enter the customer’s Safaricom number (usually 07… or 01…).",
          "Send the STK request and ask the customer to approve on their phone.",
          "Wait for confirmation on the cashier screen before handing over goods.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "What if the prompt never arrives?",
            answer:
              "Confirm the number is Safaricom, the phone has signal, and try again. See Troubleshoot a failed STK payment.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "troubleshoot-failed-stk",
    title: "Troubleshoot a failed STK payment",
    description:
      "Common reasons an STK request fails — and what to do next.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "stk", "troubleshooting"],
    relatedSlugs: ["accept-mpesa-stk", "sell-when-offline"],
    body: [
      {
        type: "paragraph",
        text: "Failed STK requests are usually about the phone number, network, PIN timeout, or insufficient balance — not a broken till.",
      },
      {
        type: "list",
        items: [
          "Double-check the MSISDN format and that it is a Safaricom line.",
          "Ask the customer to unlock their phone and watch for the prompt.",
          "If they cancel or time out, send a fresh request.",
          "If the network is down, take cash or complete the sale when online.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never mark a sale complete unless the till shows payment confirmed. Ask the customer to wait for the M-Pesa SMS.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "configure-payment-settings",
    title: "Configure payment settings",
    description:
      "Connect M-Pesa credentials and review how settlements appear in Kiosk.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "settings", "payments"],
    relatedSlugs: ["accept-mpesa-stk", "set-up-your-online-store", "accept-card-payments-paystack"],
    body: [
      {
        type: "paragraph",
        text: "Payment configuration is usually done once by the business owner or an admin. Staff then use STK from the cashier without seeing secrets.",
      },
      {
        type: "steps",
        items: [
          "Open Payments or Business settings (depending on your plan).",
          "Enter the M-Pesa / Lipa Na M-Pesa details provided for your shop.",
          "Save and run a small test sale on the cashier.",
          "Confirm the payment appears in sales history.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Only trusted admins should access payment credentials. Rotate keys if staff with access leave.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "mpesa-payments",
    slug: "accept-card-payments-paystack",
    title: "Accept card payments with Paystack",
    description:
      "Connect your own Paystack account so customers can pay by card on your storefront.",
    updatedAt: "2026-08-07",
    tags: ["paystack", "card", "online payments", "payments"],
    relatedSlugs: ["configure-payment-settings", "set-up-your-online-store"],
    body: [
      {
        type: "paragraph",
        text: "Paystack lets customers pay by card, bank transfer, or mobile money on a secure payment page. You connect your own Paystack account — money settles to your Paystack balance and then to your bank. Kiosk never holds the funds. Open Manage on the Paystack row in Payments → Settings for a link to the Paystack Dashboard (withdrawals happen there).",
      },
      {
        type: "heading",
        text: "Before you start",
      },
      {
        type: "list",
        items: [
          "Create a Paystack account at paystack.com and complete business verification.",
          "Find your API keys under Settings → API Keys & Webhooks in the Paystack dashboard.",
          "You get two pairs: test keys (pk_test_ / sk_test_) and live keys (pk_live_ / sk_live_).",
        ],
      },
      {
        type: "heading",
        text: "Connect Paystack in Kiosk",
      },
      {
        type: "steps",
        items: [
          "Open Settings → Payments in your Kiosk dashboard.",
          "On the Paystack card, choose Test or Production, then paste your public key and secret key (prefixes must match the environment).",
          "Save, then tap Test connection — it checks that the keys authenticate with Paystack.",
          "Activate the gateway when the test passes.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never mix key pairs: test keys with the Test environment and live keys with Production. Using a pk_test_ key under Production is rejected automatically.",
      },
      {
        type: "heading",
        text: "Register the webhook",
      },
      {
        type: "paragraph",
        text: "In the Paystack dashboard, open Settings → API Keys & Webhooks → Webhook URL and enter: {api-base}/webhooks/paystack — replacing {api-base} with your Kiosk API base URL. This is how Kiosk confirms payments and marks orders paid automatically.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Start with a small real test: place a low-value order on your storefront, pay with a test card, and confirm the order shows Paid. Then switch to live keys for real sales.",
      },
      {
        type: "paragraph",
        text: "Paystack appears on your storefront checkout as “Pay by card”. Customers are redirected to the Paystack page and returned to your checkout once payment is done. Secret keys are encrypted at rest; only admins with payment settings access can re-view them when editing the connection.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "how-to-add-products",
    title: "Add products: single, groups, and packages",
    description:
      "Add standalone items, group brands into variants, and sell trays and crates — with screenshots for every step.",
    updatedAt: "2026-08-24",
    tags: [
      "products",
      "catalog",
      "standalone",
      "single",
      "groups",
      "variants",
      "packages",
      "tray",
      "crate",
      "barcode",
      "pricing",
    ],
    relatedSlugs: [
      "add-your-first-products",
      "understand-stock-levels",
      "fix-missing-barcodes",
      "run-a-stock-take",
      "get-the-most-from-kiosk",
    ],
    body: [
      {
        type: "paragraph",
        text: "Your till and your online storefront share one catalog, so the way you add a product matters. This guide walks through every shape a product can take — a single item, a group with variants, and packages like trays or crates — with screenshots of the exact screens you will see.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Three quick rules: one-off item → Single product. Same brand in several sizes/colours → Group with variants. Same item sold loose and in trays → Single product with packages enabled.",
      },
      {
        type: "heading",
        text: "Single product vs group — what is the difference?",
      },
      {
        type: "list",
        items: [
          "Single (standalone) product: one name, one price, one barcode, its own stock. No siblings. Perfect for a one-off item you will never split into sizes.",
          "Group: a brand or family (e.g. Coca-Cola) that is not sold itself. Under it you add Variants — the sellable SKUs (300 ml, 500 ml, 1 L) that each carry their own price, barcode, and stock.",
          "Variants inherit the group's department and category, so you set classification once instead of repeating it.",
          "Cashiers and online shoppers search the brand name and pick a size — one clean entry instead of three near-duplicate products.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Do not create “Coca-Cola 300ml”, “Coca-Cola 500ml”, and “Coca-Cola 1L” as three separate single products. That splits stock, breaks category inheritance, and makes the storefront hard to shop. Use one group with variants instead.",
      },
      {
        type: "heading",
        text: "Add a single product",
      },
      {
        type: "steps",
        items: [
          "Open Products in the dashboard and tap New (top right).",
          "Leave Single product selected at the top of the drawer.",
          "Type the product name, pick Department, and optionally a Category.",
          "Fill Buying price (what you pay) and Sell price (what customers pay). Kiosk shows your margin as you type.",
          "Scan or type the Barcode — SKU fills automatically if you leave it blank.",
          "Set Opening qty to add stock right away, then tap Create.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-drawer.svg",
        alt: "Add product drawer with Single product selected, name Sunbest Cooking Oil 1 L, Grocery department, Cooking oils category, buying price 450, sell price 520, barcode, opening quantity 24, and Create button",
        caption:
          "The Add product drawer: name, department, prices, barcode, and opening stock — then Create.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Three toggles under Stock do the heavy lifting: Track stock counts this product in inventory, Sellable makes it appear on the till and storefront, and Sell by weight makes it a variable-weight item with a scale PLU (useful for produce and meat).",
      },
      {
        type: "heading",
        text: "Add a group with variants",
      },
      {
        type: "paragraph",
        text: "When the same brand comes in multiple sizes, colours, or packs, create a Group first — then add one Variant per sellable SKU under it.",
      },
      {
        type: "steps",
        items: [
          "Open Products and tap New.",
          "Switch the toggle from Single product to Group.",
          "Enter the group name (the brand or family — e.g. Coca-Cola), choose Department and Category, then tap Create group.",
          "Open the group from the catalog and choose Add variant.",
          "For each size, enter the Variant name (300 ml, 500 ml), Sell price, Buy price, and Barcode. Use Add another variant to create several at once.",
          "Tap Create variants — each variant becomes its own SKU with its own stock, still nested under the group.",
        ],
      },
      {
        type: "image",
        src: "/help/add-product-group-drawer.svg",
        alt: "New product group drawer with Group selected, group name Coca-Cola, Soft drinks department and category, and a dashed placeholder showing variants appear after creation",
        caption:
          "Create the group first. The group itself is never sold — the variants under it are.",
      },
      {
        type: "image",
        src: "/help/add-variant-drawer.svg",
        alt: "Add variants drawer for Coca-Cola with two rows: 300 ml at sell price 60 and 500 ml at sell price 80, each with buying price, barcode, and opening quantity",
        caption:
          "Add every size as a variant in one go — each gets its own price, barcode, and stock.",
      },
      {
        type: "heading",
        text: "Packages: trays, crates, and bundles",
      },
      {
        type: "paragraph",
        text: "Packages let you sell the same item in different units that share one stock pool — for example eggs sold loose (1 piece) or as a tray (30 pieces). Selling one tray deducts 30 pieces from the same inventory, so stock never double-counts.",
      },
      {
        type: "steps",
        items: [
          "While creating a single product, tick Sell in different units and fill each package row (name, conversion, price).",
          "Already created? Open the product from the catalog and choose Package sales.",
          "Enter the Package name (e.g. Tray of 30), the Conversion (how many base units are in it, e.g. 30), and the Price per package.",
          "Add a SKU or Barcode for the package if you want to scan it, then tap Add package — it becomes a variant SKU that shares the base product's stock.",
        ],
      },
      {
        type: "image",
        src: "/help/add-package-modal.svg",
        alt: "Package sales dialog for Coca-Cola 500 ml with package name Tray of 30, conversion 30 pieces per unit, price per package 1,500 KES, and the hint that selling one tray deducts 30 pieces from stock",
        caption:
          "Package sales: one tray = 30 pieces, deducted from the same stock when you sell it.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Packages and option variants solve different problems: a package (tray of 30) shares the parent's stock through a conversion, while an option variant (500 ml vs 300 ml) usually keeps its own stock. Pick the model that matches how you receive goods.",
      },
      {
        type: "heading",
        text: "Manage your products after they are created",
      },
      {
        type: "list",
        items: [
          "Select any product in the catalog to open its detail panel — edit name, SKU, barcode, sell price, and stock inline without leaving the page.",
          "Use Edit for photos, description, supplier link, and buying cost.",
          "Add variant grows a family; Package sales adds tray or crate SKUs; Change department moves the product between departments.",
          "Track down problems from the header: missing barcode, no price, zero stock, and low stock counters filter the list in one tap.",
          "Big cleanup? Import hundreds of SKUs from Business → Import, or fix barcodes in bulk from Inventory → Missing barcodes.",
        ],
      },
      {
        type: "image",
        src: "/help/product-detail-manage.svg",
        alt: "Product detail panel for Coca-Cola showing sell price 60, buy cost 48, margin 20 percent, on hand 32, quick edit rows, Variant and Package sales buttons, and three variant rows",
        caption:
          "The detail panel is your management hub: quick-edit prices and stock, add variants or packages, and review every SKU.",
      },
      {
        type: "faq",
        items: [
          {
            question: "I already added sizes as separate single products — can I fix it?",
            answer:
              "Yes. Open the product and use Add variant / Add sibling to grow a family under one parent, or merge duplicates during a cleanup pass. Starting as a group is cleaner when you know sizes are coming.",
          },
          {
            question: "What is the difference between a package variant and an option variant?",
            answer:
              "A package variant (e.g. tray of 30) shares the base product's stock and deducts a conversion when sold. An option variant (e.g. 500 ml vs 300 ml) normally keeps its own stock. Packages suit one item sold in multiple units; option variants suit a brand with distinct SKUs.",
          },
          {
            question: "Do groups appear on the cashier?",
            answer:
              "Cashiers sell variants — the SKUs with prices and barcodes. Searching the brand name surfaces those variants under the group, so checkout stays fast.",
          },
          {
            question: "What if an item has no barcode?",
            answer:
              "You can still sell it by searching the product or variant name on the cashier. Add the barcode later from the product detail when packaging arrives.",
          },
          {
            question: "How do I stop selling a product?",
            answer:
              "Turn off Sellable on the product, or remove it from the catalog. Stock stays visible in reports either way, which keeps history honest.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "understand-stock-levels",
    title: "Understand stock levels",
    description:
      "How on-hand quantity updates after sales, supplies, and transfers.",
    updatedAt: "2026-07-01",
    tags: ["stock", "inventory"],
    relatedSlugs: ["run-a-stock-take", "why-record-supplies", "transfer-stock-between-branches"],
    body: [
      {
        type: "paragraph",
        text: "Kiosk keeps one stock count behind the register and the online storefront so you do not oversell.",
      },
      {
        type: "list",
        items: [
          "Sales decrease on-hand stock automatically.",
          "Posting a supply increases stock automatically — you do not edit quantities by hand after a delivery.",
          "Transfers move stock between branches.",
          "Stock takes adjust counts only when the shelf count differs from the system (shrink, spoilage, mistakes).",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "When goods arrive, record them under Supplies. Stock updates itself from that receipt — skip manual stock bumps for deliveries.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "run-a-stock-take",
    title: "Run a stock take",
    description:
      "Count shelves, record variances, and reconcile so reports stay honest.",
    updatedAt: "2026-07-01",
    tags: ["stock take", "audit", "inventory"],
    relatedSlugs: ["understand-stock-levels", "add-your-first-products"],
    body: [
      {
        type: "paragraph",
        text: "Regular stock takes catch shrink, receiving errors, and mis-scans before month-end.",
      },
      {
        type: "steps",
        items: [
          "Open Inventory → Stock take.",
          "Start a count for the branch you are auditing.",
          "Scan or enter counted quantities shelf by shelf.",
          "Review variances and submit reconciliation when finished.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Count during quieter hours and pause large receiving jobs mid-count so numbers stay stable.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "transfer-stock-between-branches",
    title: "Transfer stock between branches",
    description:
      "Move inventory from one branch to another without double-counting.",
    updatedAt: "2026-07-01",
    tags: ["transfer", "multi-branch", "inventory"],
    relatedSlugs: ["understand-stock-levels", "add-staff-and-roles"],
    body: [
      {
        type: "paragraph",
        text: "Multi-branch shops can move stock formally so each location’s on-hand quantity stays accurate.",
      },
      {
        type: "steps",
        items: [
          "Open Inventory → Transfers.",
          "Choose the source and destination branches.",
          "Add the products and quantities to move.",
          "Confirm dispatch and receipt so both sides update.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "inventory",
    slug: "fix-missing-barcodes",
    title: "Fix missing barcodes",
    description:
      "Find products without barcodes and attach codes before peak hours.",
    updatedAt: "2026-07-01",
    tags: ["barcode", "catalog", "inventory"],
    relatedSlugs: ["scan-barcodes-at-the-till", "add-your-first-products"],
    body: [
      {
        type: "paragraph",
        text: "Items without barcodes slow the till. Use the missing-barcodes tools to catch them early.",
      },
      {
        type: "steps",
        items: [
          "Open Inventory → Missing barcodes (or filter products without a code).",
          "Open each product and add the EAN/UPC from the packaging.",
          "Save, then test-scan on the cashier before the next rush.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "complete-supplier-flow",
    title: "The complete supplier flow — from first vendor to final payment",
    description:
      "Follow a vendor through every stage: create, link, order, receive, pay, and see their portal — with screenshots at each step.",
    updatedAt: "2026-08-24",
    tags: [
      "suppliers",
      "vendors",
      "flow",
      "workflow",
      "purchase order",
      "supplies",
      "pay",
      "KopoKopo",
      "portal",
      "payments",
      "receiving",
    ],
    relatedSlugs: [
      "manage-suppliers-supplies-orders",
      "add-a-supplier",
      "record-a-supply",
      "why-record-supplies",
      "understand-stock-levels",
      "get-the-most-from-kiosk",
    ],
    body: [
      {
        type: "paragraph",
        text: "Every vendor relationship in Kiosk follows the same loop: connect the supplier, order what you need, receive the delivery, pay the bill — then repeat. This guide walks the whole loop in detail, with the exact screens at every stage, so you can run several suppliers side by side without losing stock, cost, or money.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "The loop at a glance: 1 Connect the supplier → 2 Order (PO) → 3 Receive (supply) → 4 Pay → Repeat. Stock moves only at stage 3 — orders are promises, supplies are the truth.",
      },
      {
        type: "heading",
        text: "Stage 1 — Create the supplier",
      },
      {
        type: "steps",
        items: [
          "Open Suppliers and tap New supplier.",
          "Enter the legal / display name — this is what appears on every receipt and report.",
          "Add the contact phone and email. The phone becomes the WhatsApp number Kiosk uses when you send orders.",
          "Add a VAT / tax ID if you have one — Kiosk matches it against existing vendors so you never create duplicates.",
          "Set credit terms (e.g. 30 days) and a credit limit if they sell to you on account.",
          "Save, then set a payout destination on the profile so paying later is one tap (see Stage 6).",
        ],
      },
      {
        type: "image",
        src: "/help/add-supplier-drawer.svg",
        alt: "New supplier drawer with marketplace import banner, name Sunrise Fresh Produce Ltd, contact phone and email, VAT tax ID, credit terms 30 days, credit limit, and Save supplier button",
        caption:
          "Stage 1: one record per vendor — identity, contacts, tax, and credit terms.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Trading on the marketplace? The same drawer can import an existing vendor plus their product catalogue in one step — no typing, and they become claimable on the supplier portal.",
      },
      {
        type: "heading",
        text: "Stage 2 — Link the products they supply",
      },
      {
        type: "list",
        items: [
          "Linked products form the supplier’s shelf — the exact list you see when ordering and when receiving.",
          "Link from the supplier profile (add each product with their SKU and your last cost), or from a product’s detail while you create it.",
          "Links carry cost and stock hints, so new orders and supplies open pre-filled with sensible prices.",
          "A vendor with no links still works — you can add ad-hoc lines on a New supply or order from scratch — but linking makes everything faster.",
        ],
      },
      {
        type: "heading",
        text: "Stage 3 — Order (the purchase order)",
      },
      {
        type: "paragraph",
        text: "Order is a till-style screen built around the supplier’s shelf. You build a purchase order (PO), then send it — by WhatsApp, by portal, or just by saving the number.",
      },
      {
        type: "steps",
        items: [
          "Open Order and pick the supplier — their linked products load as tiles with cost and low-stock badges.",
          "Tap products to add them; use +/− to set quantities. Search and family chips keep big catalogues fast.",
          "Review the slip on the right. Round to 10 nudges the total to the nearest 10 shillings for cash suppliers.",
          "Choose how to send: Save & WhatsApp opens their number with the order list; Save only stores the PO; Ticket copies a shareable order link.",
          "Saving creates a PO number. Marketplace-connected vendors also see the order in their portal inbox.",
        ],
      },
      {
        type: "image",
        src: "/help/supplier-order-shelf.svg",
        alt: "Order screen with Sunrise Fresh Produce selected, product tiles with quantity steppers, and the This order slip with two lines totaling KES 660 and a Save and WhatsApp button",
        caption:
          "Stage 3: build the order on the shelf, then Save & WhatsApp it.",
      },
      {
        type: "heading",
        text: "Stage 4 — Receive the delivery",
      },
      {
        type: "paragraph",
        text: "When goods arrive, the delivery becomes a supply — the moment stock actually rises. Two paths: confirm the open order, or record a walk-in directly.",
      },
      {
        type: "steps",
        items: [
          "Ordered in advance? Open the order, tap Confirm, and pick the open PO.",
          "Check the boxes and set the quantity that actually arrived — partial deliveries are fine, stock rises for exactly what you received.",
          "Tap Confirm selected → supply. Kiosk posts a goods receipt, creates the supplier bill, and raises stock in one go.",
          "No order? Walk-in deliveries go through Supplies → New supply: pick supplier, branch, and date, add lines with quantity and unit cost, then Post.",
        ],
      },
      {
        type: "image",
        src: "/help/order-confirm-receive.svg",
        alt: "Confirm to supply panel with open orders list, PO-2026-0141 lines with received quantities, selected total KES 3,780, and Confirm selected to supply button",
        caption:
          "Stage 4a: confirming an order posts the goods receipt and raises stock.",
      },
      {
        type: "image",
        src: "/help/new-supply-drawer.svg",
        alt: "New supply drawer with four-step workflow rail, supplier Sunrise Fresh Produce, three lines with quantity and unit cost, payable summary KES 12,480, and Post button",
        caption:
          "Stage 4b: no order placed? Record the walk-in delivery here.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never post the same delivery twice — stock is already raised. A mistake? Edit or delete the bill instead of manually chopping quantities. Deletion is only available on unpaid bills because it reverses stock.",
      },
      {
        type: "heading",
        text: "Stage 5 — Pay the supplier",
      },
      {
        type: "paragraph",
        text: "Supplies is your vendor ledger. Unpaid bills sit amber; Pay settles one, Pay all clears every open invoice for that vendor at once.",
      },
      {
        type: "steps",
        items: [
          "Open Supplies and filter to Unpaid (or use Pay open in the header).",
          "Tap Pay on a bill. The drawer shows the invoice, the balance due, and any other open balances for the same supplier.",
          "Pay the real way: if the supplier has a KopoKopo destination (M-Pesa, till, or paybill), Confirm payment sends the money and updates the ledger automatically.",
          "Paid outside Kiosk (cash at the gate, bank transfer)? Record it — Confirm payment notifies the supplier by SMS, or Mark paid · no SMS updates the ledger silently.",
          "Partial, credit, or reference? Open the advanced options to set the amount, method (cash / bank / M-Pesa), supplier credit applied, and notes.",
        ],
      },
      {
        type: "image",
        src: "/help/pay-supply-drawer.svg",
        alt: "Pay supply drawer showing invoice INV-0264, balance due KES 8,700, open balances for the supplier with Clear all, a KopoKopo M-Pesa payout card, payment history, and Confirm payment button",
        caption:
          "Stage 5: the pay drawer — remittance details, KopoKopo Send Money, or a manual record.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Deposit prepays a supplier wallet from Supplies. The credit applies automatically when they next bring a delivery — steady vendors stay topped up without chasing payments.",
      },
      {
        type: "heading",
        text: "Stage 6 — Manage the supplier profile",
      },
      {
        type: "list",
        items: [
          "Open any supplier to manage everything from one profile: identity, contacts, credit terms, and status (active / inactive / blocked).",
          "Set the KopoKopo payout destination — M-Pesa phone, till (Buy Goods), or paybill — so Send Money payments go straight to them.",
          "Link and unlink products, review last costs, and watch on-hand stock against each link.",
          "Purchase history keeps every invoice and its payment status under the vendor, so month-end is one scroll.",
          "New supply opens the receiving drawer pre-selected to this vendor; Open till jumps to the cashier-style receive screen.",
        ],
      },
      {
        type: "image",
        src: "/help/supplier-profile-manage.svg",
        alt: "Supplier profile for Sunrise Fresh Produce with active status, credit terms, KopoKopo payout destination, linked products table with costs and stock, and purchase history with paid and unpaid invoices",
        caption:
          "Stage 6: the profile is the control centre for one vendor.",
      },
      {
        type: "heading",
        text: "Stage 7 — The supplier portal (what your vendor sees)",
      },
      {
        type: "paragraph",
        text: "Marketplace-connected suppliers get their own portal. They claim it once with their phone, then orders, invoices, and payments live there — no more WhatsApp screenshot chasing.",
      },
      {
        type: "steps",
        items: [
          "Connect a marketplace supplier from the New supplier drawer (or Marketplace).",
          "Share the claim link — they enter their phone, receive a code, and set a password. No long setup.",
          "When you save an order, it lands in their Orders inbox with the product list and PO number.",
          "They manage their catalogue (prices and stock), see deliveries, and track invoices, payments, and statements in one dashboard.",
        ],
      },
      {
        type: "image",
        src: "/help/supplier-portal-overview.svg",
        alt: "Supplier portal dashboard with sidebar groups for overview, sell, get paid, and track, pulse stats for awaiting orders, in transit, shops, and outstanding, and attention items for pending orders and partial balances",
        caption:
          "Stage 7: the vendor’s portal — orders, catalogue, invoices, and payments in one place.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Keep the loop healthy: check Unpaid weekly, watch AP aging before month-end, use deposits for steady vendors, and review linked costs whenever prices move.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Where do I start with a brand-new vendor?",
            answer:
              "Create the supplier, link the products they supply, then place a first order (or record their first delivery directly). Paying follows the same loop every time after that.",
          },
          {
            question: "Do I have to order before I can record a delivery?",
            answer:
              "No. Walk-in deliveries go straight through Supplies → New supply. Ordering first is useful for the PO, the WhatsApp hand-off, and the portal flow, but never required.",
          },
          {
            question: "How do I actually pay suppliers?",
            answer:
              "Two ways: record a manual payment (cash, bank, or M-Pesa — with optional reference and notes), or enable KopoKopo Send Money with a payout destination on the supplier so Confirm payment pays them directly.",
          },
          {
            question: "What does Pay all do?",
            answer:
              "It clears every open invoice for that supplier in one transaction instead of settling bills one by one. You still choose the payment method and reference once.",
          },
          {
            question: "What does my supplier see in their portal?",
            answer:
              "Their dashboard shows orders awaiting them, deliveries, their catalogue, and their money side: invoices, payments, payouts, and statements — plus messages from your shop.",
          },
          {
            question: "I paid cash at the gate but the bill still shows unpaid — why?",
            answer:
              "Paying outside Kiosk only closes the ledger once you record it. Open the bill and tap Confirm payment (or Mark paid · no SMS) so the balance reflects what you paid.",
          },
          {
            question: "How do deposits work?",
            answer:
              "Deposit prepays a supplier wallet from Supplies. The credit applies automatically to their next bill, so you only top up the difference instead of paying invoices individually.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "manage-suppliers-supplies-orders",
    title: "Suppliers, supplies & purchase orders",
    description:
      "Add vendors, link products, order stock, confirm deliveries, and keep payables straight — with screenshots of every screen.",
    updatedAt: "2026-08-24",
    tags: [
      "suppliers",
      "vendors",
      "supplies",
      "purchase order",
      "PO",
      "receiving",
      "stock",
      "payables",
      "WhatsApp",
      "marketplace",
    ],
    relatedSlugs: [
      "add-a-supplier",
      "record-a-supply",
      "why-record-supplies",
      "understand-stock-levels",
      "complete-supplier-flow",
    ],
    body: [
      {
        type: "paragraph",
        text: "Three words carry your purchasing: Suppliers (who you buy from), Supplies (the delivery bills that raise stock), and Orders (the purchase orders you send before goods arrive). They link together — order first, confirm the delivery, and the supply appears with stock already raised. This guide walks the full loop with screenshots.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "One rule to remember: an order is only a promise. Stock moves only when the delivery is confirmed — either from the order, or directly from a New supply receipt.",
      },
      {
        type: "heading",
        text: "Step 1 — Add a supplier",
      },
      {
        type: "paragraph",
        text: "Create each vendor once, before their first delivery, so every receipt, cost, and unpaid balance stays under the right name.",
      },
      {
        type: "steps",
        items: [
          "Open Suppliers in the dashboard and tap New supplier.",
          "Enter the legal / display name, contact phone and email — the phone doubles as the WhatsApp number for orders.",
          "Add a VAT / tax ID if you have one; Kiosk uses it to match existing vendors so you never create duplicates.",
          "Set credit terms (e.g. 30 days) and a credit limit when they sell to you on account.",
          "Save. If they trade on the marketplace, you can also import the vendor plus their catalogue in one step.",
        ],
      },
      {
        type: "image",
        src: "/help/add-supplier-drawer.svg",
        alt: "New supplier drawer with marketplace import banner, supplier name Sunrise Fresh Produce Ltd, contact phone 0712 345 678, email, VAT tax ID, credit terms 30 days, and credit limit",
        caption:
          "The New supplier drawer — identity, contacts, and credit terms in one place.",
      },
      {
        type: "heading",
        text: "Step 2 — Link products to the supplier",
      },
      {
        type: "list",
        items: [
          "Linked products form the supplier’s shelf: the exact list you see when ordering and when receiving.",
          "From the supplier profile, add each product they supply (with their SKU and your last cost).",
          "Or link while creating a product — the New product drawer has a Supplier field.",
          "Links carry cost and stock hints, so a New supply and an Order open pre-filled with sensible prices.",
        ],
      },
      {
        type: "heading",
        text: "Step 3 — Order stock (purchase orders)",
      },
      {
        type: "paragraph",
        text: "Order is a till-style screen built around the supplier’s shelf: pick the vendor, tap the products you need, set quantities, and send.",
      },
      {
        type: "steps",
        items: [
          "Open Order from the dashboard sidebar.",
          "Pick the supplier — their linked products load as tiles with cost and low-stock badges.",
          "Tap products to add them; use +/− to set quantities. Search and family chips keep big catalogues fast.",
          "Review the slip on the right, then choose: Save & WhatsApp sends the order to their number, Save only stores the PO, and Ticket copies a shareable order link.",
          "Saving creates a purchase order (PO) with its own number — the supplier sees it on the portal when they are connected, or in the WhatsApp message you send.",
        ],
      },
      {
        type: "image",
        src: "/help/supplier-order-shelf.svg",
        alt: "Order screen with supplier Sunrise Fresh Produce selected, product tiles for tomatoes onions and eggs with quantity steppers, and the This order slip showing two lines totaling KES 660 with a Save and WhatsApp button",
        caption:
          "Build the order from the supplier’s shelf, then Save & WhatsApp it.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Round to 10 nudges the total to the nearest 10 shillings (great for cash suppliers). You can toggle it under the slip total before saving.",
      },
      {
        type: "heading",
        text: "Step 4 — Confirm the delivery",
      },
      {
        type: "paragraph",
        text: "When the goods arrive, Confirm on the order screen turns the PO into a supply: it posts a goods receipt, creates a supplier bill, and raises stock for every line you received.",
      },
      {
        type: "steps",
        items: [
          "Open the order and tap Confirm (or visit Order → Confirm).",
          "Select the open order — its lines list what was ordered and what is still outstanding.",
          "Check the boxes and adjust the quantities to what actually arrived (short deliveries happen).",
          "Tap Confirm selected → supply. Stock rises automatically and the bill lands in Supplies.",
        ],
      },
      {
        type: "image",
        src: "/help/order-confirm-receive.svg",
        alt: "Confirm to supply panel with open orders list, PO-2026-0141 from Sunrise Fresh Produce, three checked lines with received quantities, selected total KES 3,780, and Confirm selected to supply button",
        caption:
          "Confirm what arrived — partial deliveries are fine; stock rises for exactly what you received.",
      },
      {
        type: "heading",
        text: "Step 5 — Record a walk-in supply",
      },
      {
        type: "paragraph",
        text: "No order was placed? Record the delivery directly. New supply accepts linked products or ad-hoc lines, so you can receive even items you never linked.",
      },
      {
        type: "steps",
        items: [
          "Open Supplies and tap New supply.",
          "Pick the supplier, the receiving branch, and the delivery date.",
          "Add lines: product (search the catalogue), quantity received, and unit cost from the invoice.",
          "Add extras like freight or tax if they belong on the bill, then Post.",
        ],
      },
      {
        type: "image",
        src: "/help/new-supply-drawer.svg",
        alt: "New supply drawer with a four-step workflow rail, supplier Sunrise Fresh Produce, three lines with quantity and unit cost, a payable summary of KES 12,480, and a Post button",
        caption:
          "New supply — the workflow rail shows where you are; Post raises stock and opens the bill.",
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never add the same delivery twice — posting a supply already raises stock. If you make a mistake, edit or delete the bill instead of manually chopping quantities.",
      },
      {
        type: "heading",
        text: "Step 6 — Manage supplies and pay",
      },
      {
        type: "paragraph",
        text: "Supplies is your vendor ledger: every receipt with its total, what you have paid, and what is still open. The strip on top summarises the whole picture.",
      },
      {
        type: "steps",
        items: [
          "Filter with the chips — Today, 7 days, 30 days, All, Unpaid — or jump straight to Pay open for anything outstanding.",
          "Pay settles one bill; Pay all clears every open invoice for that supplier in one go.",
          "Use Deposit to prepay a supplier wallet; the credit applies automatically when they next bring supplies.",
          "Open AP aging to see balances by age across every vendor, and pay from there when month-end comes.",
        ],
      },
      {
        type: "image",
        src: "/help/supplies-list-pay.svg",
        alt: "Supplies page with deposit banner, summary strip showing total 4, invoiced 46,900, paid 34,420, unpaid 12,480, a receipts table with Pay and Pay all buttons, and unpaid badges",
        caption:
          "The Supplies ledger — amber rows are unpaid; Pay and Pay all settle them.",
      },
      {
        type: "callout",
        tone: "info",
        text: "A paid supply keeps its history. Delete is only offered on unpaid bills, because deleting a supply reverses the stock it raised — keep history honest and edit instead.",
      },
      {
        type: "faq",
        items: [
          {
            question: "What is the difference between an order and a supply?",
            answer:
              "An order is the purchase order you send before goods arrive — a promise, not stock. A supply is the delivery you actually receive. Stock rises only on the supply (from Confirm or New supply), never on the order itself.",
          },
          {
            question: "Can I skip ordering and just record a supply?",
            answer:
              "Yes. Walk-in deliveries go straight through Supplies → New supply. Ordering first is useful when you want the PO, WhatsApp hand-off, or portal flow, but it is never required.",
          },
          {
            question: "Why is my supplier’s shelf empty when I order?",
            answer:
              "The shelf shows linked products only. Open the supplier profile, add the products they supply, and they will appear for ordering and receiving.",
          },
          {
            question: "What happens when I confirm an order?",
            answer:
              "Kiosk posts a goods receipt, creates a supplier bill from the lines you received, and raises stock for those products — the delivery becomes a supply with one tap.",
          },
          {
            question: "How do deposits work?",
            answer:
              "Deposit prepays a supplier wallet from Supplies. When they bring the next delivery, the credit applies to the bill automatically — you only top up the difference.",
          },
          {
            question: "Can I delete a supply?",
            answer:
              "Only when nothing has been paid on it, because deleting reverses the stock it raised. Paid bills stay in history; edit them instead of deleting.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "why-record-supplies",
    title: "Why you should record every supply",
    description:
      "Posting a supply updates stock automatically — and locks in cost, payables, and a clean audit trail.",
    updatedAt: "2026-07-21",
    tags: ["supplies", "stock", "cost", "purchasing", "receiving"],
    popular: true,
    relatedSlugs: ["record-a-supply", "add-a-supplier", "understand-stock-levels"],
    body: [
      {
        type: "paragraph",
        text: "A supply is the delivery note for goods that arrived from a vendor. When you post it in Kiosk, stock for those products goes up on its own — you do not open each product and type quantities by hand.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Goods arrived → record the supply. Stock updates automatically. Manual stock edits are for corrections and stock takes, not for routine deliveries.",
      },
      {
        type: "heading",
        text: "What recording a supply does for you",
      },
      {
        type: "list",
        items: [
          "Updates on-hand stock for every line you receive — till and storefront stay accurate without a separate stock bump.",
          "Captures buying cost per unit so margins and reports reflect what you actually paid, not a guess.",
          "Tracks what you owe the supplier (open payables) until you mark the bill paid.",
          "Leaves a receipt trail — who supplied what, when, to which branch — for disputes, audits, and reorders.",
          "Feeds purchasing intelligence so you can see which vendors and products move money.",
        ],
      },
      {
        type: "heading",
        text: "What goes wrong if you skip it",
      },
      {
        type: "list",
        items: [
          "Stock looks empty (or wrong) while shelves are full — cashiers and the online shop under-sell or oversell.",
          "You invent stock with manual edits, then lose the link to cost and supplier.",
          "You cannot tell how much you owe a vendor at month-end.",
          "Margins look fake because sell price is known but buy price never landed with the delivery.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Do not “fix” a delivery by editing product stock alone. That hides the supplier bill and breaks cost history. Always post the supply first.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Do I still need stock takes if I record supplies?",
            answer:
              "Yes, but for a different job. Supplies keep stock moving with every delivery and sale. Stock takes catch shrink, breakage, and counting mistakes — not routine receiving.",
          },
          {
            question: "Does posting a supply also pay the supplier?",
            answer:
              "No. Posting receives the goods and updates stock (and usually creates an open payable). Paying the bill is a separate step from Supplies when you settle cash, M-Pesa, or bank.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "add-a-supplier",
    title: "Add a supplier",
    description:
      "Save vendor details once so every delivery, cost, and payable stays attached to the right person.",
    updatedAt: "2026-07-21",
    tags: ["suppliers", "vendors", "purchasing"],
    relatedSlugs: ["record-a-supply", "why-record-supplies", "manage-suppliers-supplies-orders"],
    body: [
      {
        type: "paragraph",
        text: "Suppliers are the distributors, wholesalers, or farmers you buy from. Create each vendor in Suppliers before you record deliveries so receipts, costs, and unpaid balances stay under the right name.",
      },
      {
        type: "steps",
        items: [
          "Open Suppliers in the dashboard.",
          "Choose New / Add supplier.",
          "Enter the supplier name (as you know them day to day).",
          "Add contact phone or email so staff can reach them about deliveries.",
          "Optionally set credit terms (e.g. 30 days) and a credit limit if they sell to you on account.",
          "Save. You can link catalog products to this supplier later for faster receiving.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "You need an active supplier on the receipt before you can post a supply. Add the vendor once; reuse them on every delivery.",
      },
      {
        type: "list",
        items: [
          "Link products on the supplier profile so the New supply drawer can pull their SKUs quickly.",
          "Keep one supplier record per trading partner — avoid duplicate names for the same company.",
          "Mark a supplier inactive or blocked if you stop buying from them.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "suppliers-supplies",
    slug: "record-a-supply",
    title: "Record a supply (receive stock)",
    description:
      "Post a vendor delivery so stock rises automatically and costs land on the right products.",
    updatedAt: "2026-07-21",
    tags: ["supplies", "receiving", "stock", "purchasing"],
    popular: true,
    relatedSlugs: ["why-record-supplies", "add-a-supplier", "understand-stock-levels", "manage-suppliers-supplies-orders"],
    body: [
      {
        type: "paragraph",
        text: "When a delivery arrives, record it under Supplies. Choose the supplier, branch, and lines (product, quantity, unit cost). When you post, Kiosk increases stock for those products automatically — no separate stock edit.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Stock update is automatic on post. After a successful supply, check Inventory or the product detail — quantities should already reflect what you received.",
      },
      {
        type: "heading",
        text: "How to post a delivery",
      },
      {
        type: "steps",
        items: [
          "Open Supplies (Purchasing).",
          "Choose New supply.",
          "Select the supplier (add them first if they are new).",
          "Confirm the receiving branch and delivery date.",
          "Add lines: product, quantity received, and unit cost from the invoice.",
          "Add a document reference (invoice / LPO number) if you have one.",
          "Post the supply. Stock increases for each line; the bill appears in your supplies list (often unpaid until you settle it).",
        ],
      },
      {
        type: "heading",
        text: "After you post",
      },
      {
        type: "list",
        items: [
          "On-hand stock is already updated — do not add the same quantities again on the product screen.",
          "Use Pay on the supply (or Pay open) when you settle the vendor.",
          "Open AP aging to see unpaid balances across suppliers.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Posting twice for the same delivery doubles stock. If you made a mistake, edit or delete the supply bill (when allowed) instead of manually chopping stock.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Why can’t I post without a supplier?",
            answer:
              "Every receipt needs a vendor so cost and payables stay attributable. Add the supplier first, then post the supply.",
          },
          {
            question: "Should I change stock manually after recording?",
            answer:
              "No. The supply already moved stock. Manual changes are for stock takes and rare corrections — not for normal deliveries.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "storefront",
    slug: "set-up-your-online-store",
    title: "Set up your online store",
    description:
      "Turn on yourshop.kiosk.ke so customers can browse and order online.",
    updatedAt: "2026-07-01",
    tags: ["storefront", "online shop", "orders"],
    popular: true,
    relatedSlugs: ["brand-your-storefront", "manage-web-orders"],
    body: [
      {
        type: "paragraph",
        text: "Your online storefront uses the same catalog and stock as the till. When an item sells out in-store, it stops selling online too.",
      },
      {
        type: "steps",
        items: [
          "Confirm products have prices and stock.",
          "Open Business → Branding to set logo and colors.",
          "Visit yourshop.kiosk.ke to preview the shop.",
          "Share the link with customers on WhatsApp or social media.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "storefront",
    slug: "brand-your-storefront",
    title: "Brand your storefront",
    description:
      "Upload a logo, pick colors, and tune the title customers see in search.",
    updatedAt: "2026-07-01",
    tags: ["branding", "seo", "storefront"],
    relatedSlugs: ["set-up-your-online-store", "claim-your-subdomain"],
    body: [
      {
        type: "paragraph",
        text: "Branding makes yourshop.kiosk.ke feel like your shop — not a generic template.",
      },
      {
        type: "list",
        items: [
          "Upload a clear logo (square works best for favicons).",
          "Set a primary brand color used across the shop.",
          "Write a clear SEO title and description for Google results.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Aim for about 50–60 characters in the title and 140–160 in the description.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "storefront",
    slug: "manage-web-orders",
    title: "Manage web orders",
    description:
      "See incoming online orders, fulfill them, and keep customers updated.",
    updatedAt: "2026-07-01",
    tags: ["orders", "storefront", "fulfillment"],
    relatedSlugs: ["set-up-your-online-store", "understand-stock-levels"],
    body: [
      {
        type: "paragraph",
        text: "Web orders appear in your dashboard so counter staff can pack and deliver without juggling WhatsApp screenshots.",
      },
      {
        type: "steps",
        items: [
          "Open Storefront / Web orders in the dashboard.",
          "Review items, delivery notes, and payment status.",
          "Mark the order fulfilled when packed or delivered.",
          "Stock decreases automatically when the order is confirmed.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "user-roles-add-users",
    title: "User roles & how to add users",
    description:
      "Invite staff, pick the right role, assign branches and departments, and manage PINs and access — with screenshots of every screen.",
    updatedAt: "2026-08-24",
    tags: [
      "users",
      "staff",
      "roles",
      "permissions",
      "invite",
      "PIN",
      "cashier",
      "deactivate",
      "branches",
      "team",
    ],
    relatedSlugs: [
      "add-staff-and-roles",
      "invite-your-first-staff",
      "staff-pin-login",
      "work-with-multiple-branches",
      "get-the-most-from-kiosk",
    ],
    body: [
      {
        type: "paragraph",
        text: "Users are the people who can sign in to your workspace — at the dashboard, the till, or the grocery counter. A role decides what each person can see and do, and the branch narrows where they work. This guide walks through adding users, choosing roles, and managing access safely.",
      },
      {
        type: "callout",
        tone: "tip",
        text: "Golden rule: give the smallest role that still gets the job done. A cashier should be able to sell — not to change prices, delete products, or open payment settings.",
      },
      {
        type: "heading",
        text: "What is a role?",
      },
      {
        type: "list",
        items: [
          "A role is a bundle of permissions — one choice in the invite drawer decides what the person can see across the whole workspace.",
          "Owner sees and controls everything: users, roles, payment settings, billing, and branches.",
          "Managers run the day-to-day shop: catalog, stock, suppliers, supplies, and reports.",
          "Cashiers sell at the till. Branch-locked roles (cashier, stock manager, grocery clerk) can only work in their assigned branch.",
          "Stock managers handle stock levels, supplies, and stock takes — with optional toggles in Business → Operations.",
          "Grocery clerks get a kiosk-friendly counter and only the departments you assign to them.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never share the owner account. Every staff member gets their own login so sales are attributable and you can revoke access when someone leaves.",
      },
      {
        type: "heading",
        text: "Step 1 — Invite a user",
      },
      {
        type: "steps",
        items: [
          "Open Users in the dashboard and tap Invite user.",
          "Enter the full name and a unique work email.",
          "Pick the Role — owner, manager, cashier, stock manager, grocery clerk, and more.",
          "Pick the Branch, or leave it blank for someone who works everywhere (owners and managers usually).",
          "Choose the sign-in method: Email invite sends them a secure link to set their own password, or PIN creates a 4–6 digit till code for cashier-style access.",
          "Tap Create user. Email-invited people show as Invited until they finish setup; PIN users are active right away.",
        ],
      },
      {
        type: "image",
        src: "/help/invite-user-drawer.svg",
        alt: "Invite user drawer with full name Jane Doe, email, Cashier role, Main branch, and the sign-in method dropdown open showing Email invite and PIN options",
        caption:
          "The invite drawer: name, role, branch, and how they sign in — all in one step.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Email invites need a branch only when the role is branch-locked. A PIN user must have a branch selected — PIN login is tied to a till in one location.",
      },
      {
        type: "heading",
        text: "Step 2 — Manage the directory",
      },
      {
        type: "paragraph",
        text: "The Users page is a live directory. Every row shows the person, their role, departments, branch, status, and the actions you can take — all without opening a separate page.",
      },
      {
        type: "list",
        items: [
          "Filter by status (active, invited, suspended, locked), role, or branch to find anyone fast.",
          "Edit a name, change a role, or move someone to another branch with the pencil icons on the row.",
          "Grocery clerks show a Departments column — assign the sections they are allowed to see.",
          "Actions cover credentials and access: set a password, set or view a PIN, sign the person out of every device, or deactivate them.",
        ],
      },
      {
        type: "image",
        src: "/help/users-directory.svg",
        alt: "Users directory table with filters for status role and branch, rows for cashier stock manager grocery clerk owner and an invited user, status badges, and row actions",
        caption:
          "The directory — one row per person, with role, branch, status, and access actions.",
      },
      {
        type: "heading",
        text: "Deactivate vs sign out — what is the difference?",
      },
      {
        type: "list",
        items: [
          "Sign out of all devices revokes every live session but keeps their password and PIN working — they can sign straight back in. Use it when a phone or till was left unattended.",
          "Deactivate is the strong move: the person loses access on every device until someone re-invites them. Use it when someone leaves or their access is being reviewed.",
        ],
      },
      {
        type: "heading",
        text: "PIN login for the till",
      },
      {
        type: "steps",
        items: [
          "Make sure the user has a branch assigned (PIN login is branch-scoped).",
          "Set a 4–6 digit PIN — either when inviting, or later from the row actions (the # icon).",
          "Cashiers unlock a shared till with their PIN instead of typing a long password.",
          "Forgot a PIN? An admin can view it from the row (👁 icon) or set a new one.",
        ],
      },
      {
        type: "heading",
        text: "Departments for grocery clerks",
      },
      {
        type: "paragraph",
        text: "Grocery clerks only see the departments you assign. Until an admin assigns at least one department, the clerk’s counter shows no items — assign departments right after creating the account, or when changing their role.",
      },
      {
        type: "heading",
        text: "Security checklist",
      },
      {
        type: "list",
        items: [
          "One login per person — never pass around shared credentials.",
          "Assign the least privilege that works: cashiers sell, managers run, owners own.",
          "Deactivate leavers the same day, and sign out devices that were left behind.",
          "Keep PINs private; don’t write them on the till.",
          "Review the directory monthly — role drift creeps in as the shop grows.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Which role should a new cashier get?",
            answer:
              "Cashier — it is scoped to selling at the till in one branch. Promote to manager later if they also need catalog, stock, and supplier access.",
          },
          {
            question: "Can I change someone's role later?",
            answer:
              "Yes. Tap the pencil next to their role in the directory, pick the new role, and save. The change applies on their next action — no re-invite needed.",
          },
          {
            question: "A cashier forgot their PIN — what do I do?",
            answer:
              "From the row actions, the # icon lets you view their current PIN (it is stored viewable for recovery) or set a brand-new one.",
          },
          {
            question: "What is the difference between deactivate and delete?",
            answer:
              "Deactivate blocks access until re-invited while keeping history attached to the person. Users are not deleted outright — history stays attributable to the right account.",
          },
          {
            question: "My grocery clerk sees no products — why?",
            answer:
              "Grocery clerks only see assigned departments. Open their row, assign at least one department (e.g. Grocery, Produce), and save.",
          },
          {
            question: "An invited user never got the email — can I resend?",
            answer:
              "Deactivate and re-invite, or set a password for them from the row actions and share the sign-in details securely. Confirm the email is spelled correctly first.",
          },
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "add-staff-and-roles",
    title: "Add staff and roles",
    description:
      "Invite cashiers and supervisors with the right access for their job.",
    updatedAt: "2026-07-01",
    tags: ["staff", "roles", "users"],
    relatedSlugs: ["staff-pin-login", "invite-your-first-staff", "user-roles-add-users"],
    body: [
      {
        type: "paragraph",
        text: "Not everyone needs full admin access. Assign roles so cashiers can sell while only owners change prices or payment settings.",
      },
      {
        type: "steps",
        items: [
          "Open Users in the dashboard.",
          "Invite a staff member by phone or email.",
          "Choose a role (for example cashier or manager).",
          "Ask them to complete signup or set a PIN for till login.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "invite-your-first-staff",
    title: "Invite your first staff member",
    description:
      "Get a cashier onto the till quickly without sharing the owner password.",
    updatedAt: "2026-07-01",
    tags: ["invite", "staff", "onboarding"],
    relatedSlugs: ["add-staff-and-roles", "staff-pin-login", "user-roles-add-users"],
    body: [
      {
        type: "paragraph",
        text: "Sharing the owner account is risky. Invite staff so every sale is attributable and you can revoke access later.",
      },
      {
        type: "steps",
        items: [
          "From Users, send an invite link.",
          "Staff open the link and create their login.",
          "They sign in at /login/staff and open Cashier.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Remove or disable accounts when someone leaves so they cannot open the till.",
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "staff-pin-login",
    title: "Staff PIN login at the till",
    description:
      "Let cashiers unlock a shared device with a short PIN instead of a long password.",
    updatedAt: "2026-07-01",
    tags: ["pin", "staff", "cashier"],
    relatedSlugs: ["add-staff-and-roles", "open-the-cashier-for-the-first-time"],
    body: [
      {
        type: "paragraph",
        text: "PIN login is designed for busy counters where several people share a tablet or desktop.",
      },
      {
        type: "list",
        items: [
          "Each staff user sets their own PIN.",
          "PINs should stay private — do not write them on the till.",
          "Owners can reset a PIN if staff forget it.",
        ],
      },
    ],
  },
  {
    audience: "merchants",
    categorySlug: "staff-branches",
    slug: "work-with-multiple-branches",
    title: "Work with multiple branches",
    description:
      "Track stock and sales per location when you run more than one shop.",
    updatedAt: "2026-07-01",
    tags: ["branches", "multi-branch"],
    relatedSlugs: ["transfer-stock-between-branches", "add-staff-and-roles"],
    body: [
      {
        type: "paragraph",
        text: "Branches keep inventory and reporting separated while one business account owns everything.",
      },
      {
        type: "steps",
        items: [
          "Open Branches and create each location.",
          "Assign staff to the branches they work in.",
          "Sell from the correct branch on the cashier.",
          "Use transfers when moving stock between shops.",
        ],
      },
    ],
  },
];
