/** Example promotion copy for the dashboard form (not shown as raw API JSON). */

export type PromoCampaignFormSample = {
  id: string;
  name: string;
  campaignType: "FLASH_SALE" | "WEEKLY_DEALS";
  title: string;
  body: string;
  actionUrl: string;
  recipientScope: "ALL_BUYERS" | "ACTIVE_BUYERS_90D" | "INACTIVE_BUYERS_30D";
};

/** Default “weekend flash” example — good first impression. */
export const EXAMPLE_FLASH_SALE: PromoCampaignFormSample = {
  id: "flash-weekend",
  name: "Weekend flash — 20% off",
  campaignType: "FLASH_SALE",
  title: "20% off this weekend only",
  body: "Save on staples and favourites through Sunday. Tap to shop before offers end.",
  actionUrl: "/shop",
  recipientScope: "ALL_BUYERS",
};

export const EXAMPLE_WEEKLY_DEALS: PromoCampaignFormSample = {
  id: "weekly-active",
  name: "Weekly picks for regulars",
  campaignType: "WEEKLY_DEALS",
  title: "This week's deals are live",
  body: "Fresh price drops on items you buy often. Open the shop to see what's new for you.",
  actionUrl: "/shop",
  recipientScope: "ACTIVE_BUYERS_90D",
};
