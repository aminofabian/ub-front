"use client";

import { FloorBoard } from "@/app/(dashboard)/services/floor/_components/floor-board";

/**
 * The till of a service shop: the same queue, chairs and payment as the dashboard floor, laid
 * out for the person at the counter — money waiting to be collected comes first.
 */
export function FloorTill() {
  return <FloorBoard variant="till" />;
}
