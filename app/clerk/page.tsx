import type { Viewport } from "next";

import { GroceryWorkspace } from "@/components/grocery/grocery-workspace";

// Kiosk screen: the counter is driven by the on-screen keypad, so pinch /
// double-tap zoom (which fires accidentally while scrolling on a touch
// laptop) is disabled on this route only. The rest of the app keeps zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function GroceryPage() {
  return <GroceryWorkspace />;
}
