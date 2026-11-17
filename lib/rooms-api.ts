"use client";

import { apiRequest } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";
import {
  openOrder,
  type OpenOrderRecord,
  type OrderCardRecord,
} from "@/lib/restaurant-api";

/**
 * Client for the front desk of a guest house (ADR 0028): its rooms today, and the stays on them in
 * a later slice. A lodging tenant is a bar or restaurant that also lets a few rooms, so these reuse
 * the restaurant setup and sell permissions. Shapes mirror `docs/openapi/phase-1.yaml`.
 */

const base = API_ROUTES.rooms;

export type RoomRecord = {
  id: string;
  branchId: string;
  name: string;
  /** What one night costs, in KES. */
  nightlyRate: number;
  /** The floor or wing the room is on, or null. */
  area: string | null;
  active: boolean;
  sortOrder: number;
};

/** The rooms of a branch, by floor then name. */
export async function fetchRooms(branchId: string): Promise<RoomRecord[]> {
  return apiRequest<RoomRecord[]>(`${base}?branchId=${encodeURIComponent(branchId)}`, { toast: false });
}

export async function createRoom(body: {
  branchId: string;
  name: string;
  nightlyRate: number;
  area?: string;
}): Promise<RoomRecord> {
  return apiRequest<RoomRecord>(base, { method: "POST", body });
}

/** A field left out is not changed; a blank area clears it. */
export async function updateRoom(
  id: string,
  body: {
    name?: string;
    nightlyRate?: number;
    area?: string;
    active?: boolean;
  },
): Promise<RoomRecord> {
  return apiRequest<RoomRecord>(`${base}/${id}`, { method: "PATCH", body });
}

// ---------------------------------------------------------------- the front desk and stays

/** A room with the stays on it: the one in-house now, plus any booked for later. */
export type RoomWithStays = {
  room: RoomRecord;
  stays: OrderCardRecord[];
};

/** Every room of a branch with its stays, plus any stay whose room is gone. */
export type FrontDeskRecord = {
  branchId: string;
  asOf: string;
  rooms: RoomWithStays[];
  otherStays: OrderCardRecord[];
};

export async function fetchFrontDesk(branchId: string): Promise<FrontDeskRecord> {
  return apiRequest<FrontDeskRecord>(`${base}/front-desk?branchId=${encodeURIComponent(branchId)}`, {
    toast: false,
  });
}

/**
 * Open a stay: a booking on a room, with a check-in and check-out. The folio is the open order —
 * its lines, bills and payment reuse the restaurant open-order endpoints (a stay is an open order
 * on channel LODGING). Checking in is {@code seatBooking}; it charges the room nights up front.
 */
export async function openStay(body: {
  branchId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestCount?: number;
  customerName?: string;
  customerPhone?: string;
  clientOrderId: string;
}): Promise<OpenOrderRecord> {
  return openOrder({
    branchId: body.branchId,
    channel: "LODGING",
    tableId: body.roomId,
    guestCount: body.guestCount,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    clientOrderId: body.clientOrderId,
    scheduledStart: body.checkIn,
    scheduledEnd: body.checkOut,
  });
}
