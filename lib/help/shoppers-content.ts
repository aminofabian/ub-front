import type { HelpArticle, HelpCategoryDef } from "./types";

export const SHOPPER_CATEGORIES: HelpCategoryDef[] = [
  {
    slug: "account",
    title: "Your account",
    description: "Sign up, sign in, and manage your shopper profile.",
    icon: "user",
  },
  {
    slug: "orders",
    title: "Orders & tracking",
    description: "Place orders, check status, and view history.",
    icon: "clipboard-list",
  },
  {
    slug: "delivery",
    title: "Delivery",
    description: "Addresses, delivery areas, and finding your order.",
    icon: "truck",
  },
  {
    slug: "payments",
    title: "Payments",
    description: "Pay with M-Pesa and understand payment status.",
    icon: "credit-card",
  },
  {
    slug: "returns",
    title: "Returns & issues",
    description: "Missing items, wrong orders, and contacting the shop.",
    icon: "rotate-ccw",
  },
];

export const SHOPPER_ARTICLES: HelpArticle[] = [
  {
    audience: "shoppers",
    categorySlug: "account",
    slug: "create-a-shopper-account",
    title: "Create a shopper account",
    description:
      "Register on a shop’s kiosk.ke storefront to save addresses and track orders.",
    updatedAt: "2026-07-01",
    tags: ["account", "signup", "storefront"],
    popular: true,
    relatedSlugs: ["sign-in-to-your-account", "place-an-order-online"],
    body: [
      {
        type: "paragraph",
        text: "Each shop on Kiosk has its own online storefront. Creating an account on that shop helps you checkout faster and see past orders.",
      },
      {
        type: "steps",
        items: [
          "Open the shop’s website (for example yourshop.kiosk.ke).",
          "Choose Sign up or Create account.",
          "Enter your name, phone, and password.",
          "Verify your email if the shop requires it, then sign in.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "An account on one shop does not automatically log you into another shop — each storefront is separate.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Do I need an account to buy?",
            answer:
              "Some shops allow guest checkout. Others ask you to create an account so they can confirm delivery details.",
          },
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "account",
    slug: "sign-in-to-your-account",
    title: "Sign in to your account",
    description: "Access your orders and saved details on a shop’s storefront.",
    updatedAt: "2026-07-01",
    tags: ["login", "account"],
    relatedSlugs: ["create-a-shopper-account", "reset-your-password"],
    body: [
      {
        type: "paragraph",
        text: "Use the Sign in link on the shop’s website — not the staff till login used by cashiers.",
      },
      {
        type: "steps",
        items: [
          "Open the shop storefront.",
          "Tap Sign in.",
          "Enter the email or phone and password you registered with.",
          "Open Account to see profile and order history.",
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "account",
    slug: "reset-your-password",
    title: "Reset your password",
    description: "Recover access if you forget your storefront password.",
    updatedAt: "2026-07-01",
    tags: ["password", "account"],
    relatedSlugs: ["sign-in-to-your-account", "create-a-shopper-account"],
    body: [
      {
        type: "steps",
        items: [
          "On the shop’s sign-in page, choose Forgot password.",
          "Enter the email associated with your account.",
          "Open the reset link from your inbox.",
          "Choose a new password and sign in again.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Check spam or promotions folders if the email does not arrive within a few minutes.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "account",
    slug: "update-your-profile",
    title: "Update your profile",
    description: "Change your name, phone, or delivery defaults on the shop.",
    updatedAt: "2026-07-01",
    tags: ["profile", "account"],
    relatedSlugs: ["add-a-delivery-address", "sign-in-to-your-account"],
    body: [
      {
        type: "paragraph",
        text: "Keep your phone number current so the shop and delivery rider can reach you.",
      },
      {
        type: "steps",
        items: [
          "Sign in and open Account.",
          "Edit your name or phone number.",
          "Save changes before placing your next order.",
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "orders",
    slug: "place-an-order-online",
    title: "Place an order online",
    description:
      "Browse the catalog, add items to cart, and checkout on a Kiosk storefront.",
    updatedAt: "2026-07-01",
    tags: ["order", "checkout", "cart"],
    popular: true,
    relatedSlugs: ["track-your-order", "pay-with-mpesa-online"],
    body: [
      {
        type: "paragraph",
        text: "Ordering online is like shopping in the aisle — prices and stock come from the same system the shop uses at the counter.",
      },
      {
        type: "steps",
        items: [
          "Browse categories or search for products.",
          "Add items to your cart.",
          "Open the cart and proceed to checkout.",
          "Enter delivery details, accept the shop’s terms, and pay.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Why can’t I add an item?",
            answer:
              "It may be out of stock. Refresh the page or choose a similar product.",
          },
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "orders",
    slug: "track-your-order",
    title: "Track your order",
    description: "See whether your order is confirmed, packing, or on the way.",
    updatedAt: "2026-07-01",
    tags: ["tracking", "orders"],
    popular: true,
    relatedSlugs: ["place-an-order-online", "what-if-my-order-is-late"],
    body: [
      {
        type: "paragraph",
        text: "After checkout, your order appears under Account → Orders (wording may vary by shop).",
      },
      {
        type: "list",
        items: [
          "Confirmed — the shop received your order.",
          "Preparing — items are being packed.",
          "Out for delivery — a rider is on the way (if the shop offers delivery).",
          "Completed — delivered or collected.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "For the fastest update, message the shop with your order number — they control fulfillment timing.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "orders",
    slug: "view-order-history",
    title: "View order history",
    description: "Find past purchases and receipts on the shop’s storefront.",
    updatedAt: "2026-07-01",
    tags: ["history", "orders", "receipt"],
    relatedSlugs: ["track-your-order", "sign-in-to-your-account"],
    body: [
      {
        type: "steps",
        items: [
          "Sign in to the shop where you ordered.",
          "Open Account or Orders.",
          "Select a past order to see items and totals.",
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "orders",
    slug: "cancel-or-change-an-order",
    title: "Cancel or change an order",
    description:
      "What to do if you need to edit items or cancel before delivery.",
    updatedAt: "2026-07-01",
    tags: ["cancel", "orders"],
    relatedSlugs: ["track-your-order", "contact-the-shop"],
    body: [
      {
        type: "paragraph",
        text: "Once a shop starts packing, changes may not be possible. Contact them as soon as you notice a mistake.",
      },
      {
        type: "steps",
        items: [
          "Check the order status in your account.",
          "If it is still pending, contact the shop with your order number.",
          "Ask whether they can cancel, swap an item, or update the address.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Kiosk provides the software — refunds and cancellations are handled by the shop you ordered from.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "delivery",
    slug: "add-a-delivery-address",
    title: "Add a delivery address",
    description:
      "Help the rider find you with area, street, and landmark details.",
    updatedAt: "2026-07-01",
    tags: ["address", "delivery"],
    popular: true,
    relatedSlugs: ["delivery-areas-and-fees", "place-an-order-online"],
    body: [
      {
        type: "paragraph",
        text: "Clear directions reduce failed deliveries. Include estate name, building, floor, and a nearby landmark.",
      },
      {
        type: "steps",
        items: [
          "At checkout, choose delivery (if the shop offers it).",
          "Start with your area, then add street and building details.",
          "Add a phone number the rider can call on arrival.",
          "Confirm the address before paying.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If your gate has no number, describe colors, nearby shops, or a famous landmark.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "delivery",
    slug: "delivery-areas-and-fees",
    title: "Delivery areas and fees",
    description:
      "Understand where a shop delivers and how fees are calculated.",
    updatedAt: "2026-07-01",
    tags: ["delivery", "fees"],
    relatedSlugs: ["add-a-delivery-address", "what-if-my-order-is-late"],
    body: [
      {
        type: "paragraph",
        text: "Each shop sets its own delivery coverage and fees. What works for one storefront may not apply to another.",
      },
      {
        type: "list",
        items: [
          "Fees may depend on distance or order size.",
          "Some shops offer pickup only.",
          "If your area is not listed, contact the shop before ordering.",
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "delivery",
    slug: "what-if-my-order-is-late",
    title: "What if my order is late?",
    description: "Steps to take when delivery takes longer than expected.",
    updatedAt: "2026-07-01",
    tags: ["delivery", "delay", "support"],
    relatedSlugs: ["track-your-order", "contact-the-shop"],
    body: [
      {
        type: "steps",
        items: [
          "Check the order status in your account.",
          "Confirm your phone is reachable.",
          "Contact the shop with your order number and delivery address.",
          "Ask for an updated ETA or pickup option if available.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Traffic, rain, and peak hours can delay riders. The shop is the best source of live updates.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "payments",
    slug: "pay-with-mpesa-online",
    title: "Pay with M-Pesa online",
    description:
      "Approve an STK Push on your phone to complete checkout.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "stk", "checkout"],
    popular: true,
    relatedSlugs: ["payment-failed-what-next", "place-an-order-online"],
    body: [
      {
        type: "paragraph",
        text: "Many Kiosk shops take M-Pesa at checkout. You will receive a prompt on your Safaricom phone to enter your PIN.",
      },
      {
        type: "steps",
        items: [
          "At checkout, choose M-Pesa.",
          "Confirm the phone number that should receive the prompt.",
          "Unlock your phone and approve the STK request.",
          "Wait for the storefront to confirm payment before closing the page.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "I paid but the page still says pending",
            answer:
              "Wait a moment for confirmation. If it stays pending, keep the M-Pesa SMS and contact the shop with the transaction code.",
          },
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "payments",
    slug: "payment-failed-what-next",
    title: "Payment failed — what next?",
    description:
      "Recover from a cancelled, timed-out, or declined M-Pesa attempt.",
    updatedAt: "2026-07-01",
    tags: ["mpesa", "failed payment", "checkout"],
    relatedSlugs: ["pay-with-mpesa-online", "contact-the-shop"],
    body: [
      {
        type: "list",
        items: [
          "Check you have enough M-Pesa balance.",
          "Confirm you entered a Safaricom number.",
          "Try the payment again — do not send money to a till number unless the shop instructs you.",
          "If money left your account but the order failed, contact the shop with the M-Pesa code.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Never share your M-Pesa PIN with anyone claiming to be support.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "payments",
    slug: "understand-payment-status",
    title: "Understand payment status",
    description:
      "What pending, paid, and failed mean on your order.",
    updatedAt: "2026-07-01",
    tags: ["payment status", "orders"],
    relatedSlugs: ["pay-with-mpesa-online", "track-your-order"],
    body: [
      {
        type: "list",
        items: [
          "Pending — waiting for M-Pesa confirmation.",
          "Paid — the shop received payment confirmation.",
          "Failed — the prompt was cancelled, timed out, or declined.",
        ],
      },
      {
        type: "paragraph",
        text: "Only paid orders should move into packing. If status looks wrong, share your M-Pesa SMS with the shop.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "returns",
    slug: "missing-or-wrong-items",
    title: "Missing or wrong items",
    description:
      "What to do if your bag is short or contains the wrong product.",
    updatedAt: "2026-07-01",
    tags: ["returns", "wrong item", "missing"],
    popular: true,
    relatedSlugs: ["request-a-refund-or-replacement", "contact-the-shop"],
    body: [
      {
        type: "steps",
        items: [
          "Compare the delivered items to your order receipt.",
          "Take a photo if something is damaged or incorrect.",
          "Contact the shop quickly with your order number.",
          "Ask whether they can resend, swap, or refund.",
        ],
      },
      {
        type: "callout",
        tone: "info",
        text: "Policies differ by shop. Kiosk does not hold your payment — the merchant handles refunds.",
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "returns",
    slug: "request-a-refund-or-replacement",
    title: "Request a refund or replacement",
    description: "How refunds work when you ordered through a Kiosk shop.",
    updatedAt: "2026-07-01",
    tags: ["refund", "replacement"],
    relatedSlugs: ["missing-or-wrong-items", "contact-the-shop"],
    body: [
      {
        type: "paragraph",
        text: "Refunds are processed by the shop according to their terms. M-Pesa refunds usually return to the number that paid.",
      },
      {
        type: "steps",
        items: [
          "Contact the shop with order number and M-Pesa code.",
          "Agree whether you want a replacement or refund.",
          "Keep confirmation messages until the issue is closed.",
        ],
      },
    ],
  },
  {
    audience: "shoppers",
    categorySlug: "returns",
    slug: "contact-the-shop",
    title: "Contact the shop",
    description:
      "Reach the merchant who fulfilled your order — not the Kiosk platform team.",
    updatedAt: "2026-07-01",
    tags: ["contact", "support", "merchant"],
    relatedSlugs: ["missing-or-wrong-items", "what-if-my-order-is-late"],
    body: [
      {
        type: "paragraph",
        text: "For order problems, always contact the shop first. They have your stock, rider, and payment details.",
      },
      {
        type: "list",
        items: [
          "Use the phone or WhatsApp listed on the storefront if available.",
          "Include your order number, delivery address, and M-Pesa code.",
          "For platform account issues on kiosk.ke (not a shop order), see the Help contact section.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            question: "Can Kiosk refund me directly?",
            answer:
              "No. Payments go to the merchant. The shop must process refunds and replacements.",
          },
        ],
      },
    ],
  },
];
