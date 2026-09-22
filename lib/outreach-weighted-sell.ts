import { PLATFORM_DOMAIN } from "@/lib/config";

const EMAIL_ASSET = (path: string) =>
  `https://${PLATFORM_DOMAIN}/email/${path}`;

export const WEIGHTED_SELL_EMAIL_SUBJECT =
  "Sell cooking oil by the litre — enter the amount, Kiosk does the maths";

export const WEIGHTED_SELL_EMAIL_PREVIEW =
  "Stock 20 L or 20 kg. Tap the scale. Type KES 140 — quantity fills in for you.";

export const WEIGHTED_SELL_CTA = "Open the cashier";

/**
 * Feature guide: stock in litres/kg, mark weighted with the Scale icon,
 * enter spend amount on the till — quantity auto-calculates.
 */
export const WEIGHTED_SELL_EMAIL_BODY = `Hi {{name}},

**Cooking oil, rice, beans, sugar — sell what they actually take.**

At {{businessName}} you stock a jerrycan as **20 litres**, or a sack as **20 kg**. On the till you tap the **scale**, type the **money** the customer wants (e.g. KES 140), and Kiosk **auto-calculates** the litres or kilos.

No weighing pad. No mental maths. No “half a bottle” as quantity 1.

---

**The idea in one line**

Stock the full amount → tap the **scale** on the cart → **enter the amount** → quantity fills itself.

---

**1. Stock the full amount (example: cooking oil)**

Add **Cooking oil** as a product.
When you receive stock, enter **20** and set the unit to **litres** (or **kg** for cereals).

Same for rice, beans, unga, sugar — stock **20 kg** (or whatever you bought), not “20 packets of vibes”.

![Step 1 — Stock 20 litres of cooking oil](${EMAIL_ASSET("weighted-step-1-stock.svg")})

**2. Find the scale icon on the cashier**

Open the till. Add **Cooking oil** to the cart like any other item.

Next to the line name you’ll see a small **scale** button (looks like a weighing scale).

Tap it once. It highlights teal — that line is now **sold by weight / litre**.

![Step 2 — Tap the scale icon on the cart line](${EMAIL_ASSET("weighted-step-2-scale.svg")})

**3. Enter the amount — quantity auto-calculates**

After the scale is on, open the qty / scale panel on that line.

You’ll see two sides: **Spend (KES)** and **Weight (L / kg)**.

Customer says “give me oil for 140”? Type **140** on the **Spend** side.

Kiosk works out the litres from your shelf price (e.g. KES 280 / L → **0.5 L**), updates the line total to exactly **KES 140**, and fractions stock (**20 → 19.5 L**).

Prefer to type weight instead? Switch to the Weight side and enter **0.5** — spend flips the other way. Most cashiers just type the money.

![Step 3 — Enter KES amount, quantity auto-fills](${EMAIL_ASSET("weighted-step-3-fraction.svg")})

**4. Cereals work the same way**

Rice, beans, maize, sugar — stock in **kg**, tap scale, enter **KES 250**, watch **kg** fill in.

Cooking oil and liquid detergents — stock in **litres**, tap scale, enter the amount, litres fill in.

![Step 4 — Cereals by the kg, amount → auto qty](${EMAIL_ASSET("weighted-step-4-cereal.svg")})

---

**Quick tips for your cashiers**

• **Scale icon** = “this line is weighed / poured, not counted as whole packs”
• **Spend first** — type what they pay; litres/kg appear automatically
• Tap scale again to turn it off if you sold a sealed 1 L bottle as qty 1
• You can also turn **Sell by weight** on in Products for items that are always loose
• Business → Configuration can allow cashiers to use the scale toggle (if it’s missing on the till)

**One sentence for staff**

“Stock the jerrycan as 20 L. When someone buys some, tap the scale, type the shillings — Kiosk fills the litres.”

Open the cashier and try it with cooking oil when you have a quiet minute.
`;

export function weightedSellChatBody(opts?: {
  firstName?: string | null;
  continueUrl?: string | null;
}): string {
  const name = opts?.firstName?.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hi ${name},` : "Hi,";
  const link =
    opts?.continueUrl?.trim() || `https://${PLATFORM_DOMAIN}/sales/quick`;
  return `${hello} tip: stock cooking oil as 20 L (or rice as 20 kg). On the till, tap the scale icon, type the KES amount — quantity auto-calculates. Try it: ${link}`;
}

export const WEIGHTED_SELL_SMS_BODY = weightedSellChatBody();

export const WEIGHTED_SELL_CANNED = {
  id: "weighted-sell",
  label: "Sell by weight / litre",
  hint: "Scale icon → enter amount → qty auto for oil, cereals, sugar",
} as const;
