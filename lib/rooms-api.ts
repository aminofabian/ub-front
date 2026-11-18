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

/** A room's housekeeping state (ADR 0030), separate from occupancy and from `active`. */
export type HousekeepingStatus = "CLEAN" | "DIRTY" | "CLEANING" | "INSPECTED" | "MAINTENANCE";

export type RoomRecord = {
  id: string;
  branchId: string;
  name: string;
  /** What one night costs, in KES — the room's own rate, overriding its type's rate card. */
  nightlyRate: number;
  /** The floor or wing the room is on, or null. */
  area: string | null;
  active: boolean;
  sortOrder: number;
  /** Where the room is in its cleaning cycle. */
  housekeepingStatus: HousekeepingStatus;
  /** True when the room may take a new stay on its active + housekeeping axes (dates aside). */
  readyToLet: boolean;
  /** The room type whose rate card this room inherits, or null. */
  roomTypeId: string | null;
  /** The weekday rate a guest is actually charged — the type's when typed, else nightlyRate. */
  effectiveNightlyRate: number;
  /** The weekend rate, when the type sets one; else the same as the weekday rate. */
  effectiveWeekendRate: number;
  /** A short housekeeping note (damage, missing amenity), or null. */
  housekeepingNote: string | null;
  /** The staff member responsible for cleaning this room now, or null. */
  cleanerStaffProfileId: string | null;
  /** That cleaner's display name, or null. */
  cleanerName: string | null;
};

/** A room type: the rate card for a category of room (ADR 0030). */
export type RoomTypeRecord = {
  id: string;
  branchId: string;
  name: string;
  /** What a weekday night costs, in KES. */
  defaultNightlyRate: number;
  /** What a weekend night (Fri/Sat) costs, or null for the same as a weekday. */
  weekendNightlyRate: number | null;
  capacity: number | null;
  bedConfig: string | null;
  amenities: string | null;
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

/** Move a room through its cleaning cycle (ADR 0030). Not the same as taking it out of use. */
export async function setRoomHousekeeping(
  id: string,
  status: HousekeepingStatus,
  extra?: {
    cleanerStaffProfileId?: string;
    note?: string;
    clearCleaner?: boolean;
    clearNote?: boolean;
  },
): Promise<RoomRecord> {
  return apiRequest<RoomRecord>(`${base}/${id}/housekeeping`, {
    method: "PATCH",
    body: { status, ...(extra ?? {}) },
  });
}

/** Assign a room to a type (its rate card), or clear it with a null id (ADR 0030). */
export async function setRoomType(id: string, roomTypeId: string | null): Promise<RoomRecord> {
  return apiRequest<RoomRecord>(`${base}/${id}/type`, { method: "PATCH", body: { roomTypeId } });
}

// ---------------------------------------------------------------- room types (rate cards)

export async function fetchRoomTypes(branchId: string): Promise<RoomTypeRecord[]> {
  const res = await apiRequest<{ branchId: string; types: RoomTypeRecord[] }>(
    `${base}/types?branchId=${encodeURIComponent(branchId)}`,
    { toast: false },
  );
  return res.types;
}

export async function createRoomType(body: {
  branchId: string;
  name: string;
  defaultNightlyRate: number;
  weekendNightlyRate?: number;
  capacity?: number;
  bedConfig?: string;
  amenities?: string;
}): Promise<RoomTypeRecord> {
  return apiRequest<RoomTypeRecord>(`${base}/types`, { method: "POST", body });
}

// (Editing a room type — PATCH /rooms/types/{id} — has no UI entry yet; the client binding will be
//  added with the edit screen. The backend endpoint exists and is covered by RoomsIT.)

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
  /** The business default check-in time for a new booking, "HH:mm" Nairobi. */
  defaultCheckInTime: string;
  /** The business default check-out time for a new booking, "HH:mm" Nairobi. */
  defaultCheckOutTime: string;
};

export async function fetchFrontDesk(branchId: string): Promise<FrontDeskRecord> {
  return apiRequest<FrontDeskRecord>(`${base}/front-desk?branchId=${encodeURIComponent(branchId)}`, {
    toast: false,
  });
}

// ---------------------------------------------------------------- accommodation report (ADR 0030)

/** Today's rooms, plus occupancy / ADR / RevPAR over a period. Accommodation revenue only. */
export type AccommodationReport = {
  branchId: string;
  from: string;
  to: string;
  totalRooms: number;
  occupied: number;
  free: number;
  arrivingToday: number;
  leavingToday: number;
  dirty: number;
  underMaintenance: number;
  outstandingBalances: number;
  roomNightsSold: number;
  accommodationRevenue: number;
  /** Average rate per occupied room-night. */
  averageDailyRate: number;
  /** Room revenue per available room-night. */
  revPar: number;
  /** Nights sold ÷ available room-nights, 0–1. */
  occupancyRate: number;
};

/** The accommodation dashboard for a branch over an inclusive date range (YYYY-MM-DD). */
export async function fetchAccommodationReport(
  branchId: string,
  from: string,
  to: string,
): Promise<AccommodationReport> {
  const sp = new URLSearchParams({ branchId, from, to });
  return apiRequest<AccommodationReport>(`${base}/report?${sp.toString()}`, { toast: false });
}

// ---------------------------------------------------------------- guest stay history (ADR 0030)

/** One of a guest's past or present stays. */
export type GuestStay = {
  orderId: string;
  orderNumber: number;
  roomName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  /** "booked" | "in-house" | "checked-out" | "cancelled". */
  state: string;
  total: number;
};

export type GuestStays = {
  customerId: string;
  customerName: string | null;
  stayCount: number;
  stays: GuestStay[];
};

/** A guest's stay history with this business, for repeat-guest recognition. */
export async function fetchGuestStays(customerId: string): Promise<GuestStays> {
  return apiRequest<GuestStays>(`${base}/guest-stays?customerId=${encodeURIComponent(customerId)}`, {
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
