import { apiUrl } from "./config";

/**
 * The public room-booking storefront client (ADR 0031): a guest at a house's public page sees its
 * rooms and what is free, and requests a stay with a name and a phone — no account, nothing paid
 * online. The business is carried only by the slug in the path, never a header or a body field, the
 * same as the public service-booking and menu clients.
 */

export type PublicRoomBranch = { id: string; name: string };

export type PublicRoomInfo = {
  storeName: string;
  bookable: boolean;
  checkInTime: string;
  checkOutTime: string;
  branches: PublicRoomBranch[];
};

export type PublicRoom = {
  id: string;
  name: string;
  nightlyRate: number;
  weekendRate: number | null;
  capacity: number | null;
  bedConfig: string | null;
  amenities: string | null;
  area: string | null;
};

export type PublicRoomAvailability = {
  branchId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: PublicRoom[];
};

export type PublicRoomBookingConfirmation = {
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  estimatedTotal: number;
  message: string;
};

/** Carries the HTTP status so the view can tell a taken room (409) from a flood (429) or a bad request. */
export class PublicRoomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PublicRoomError";
    this.status = status;
  }
}

function base(slug: string): string {
  return apiUrl(`/api/v1/public/businesses/${encodeURIComponent(slug.trim())}/rooms`);
}

async function read<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let detail = "";
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    // No readable body; the status is enough.
  }
  throw new PublicRoomError(detail || "Something went wrong. Try again.", res.status);
}

/** The house's lodging page, or null when it does not let rooms online (a 404). */
export async function fetchPublicRooms(slug: string): Promise<PublicRoomInfo | null> {
  const res = await fetch(base(slug), { cache: "no-store" });
  if (res.status === 404) return null;
  return read<PublicRoomInfo>(res);
}

/** The rooms free for a date range at a branch. */
export async function fetchPublicRoomAvailability(
  slug: string,
  args: { branchId: string; checkIn: string; checkOut: string },
): Promise<PublicRoomAvailability> {
  const sp = new URLSearchParams({
    branchId: args.branchId,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
  });
  const res = await fetch(`${base(slug)}/availability?${sp.toString()}`, { cache: "no-store" });
  return read<PublicRoomAvailability>(res);
}

/** Request a stay. The house gets a booking on its front desk to confirm with the guest. */
export async function submitPublicRoomBooking(
  slug: string,
  body: {
    branchId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    name: string;
    phone: string;
    guests?: number;
    requestId: string;
  },
): Promise<PublicRoomBookingConfirmation> {
  const res = await fetch(`${base(slug)}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return read<PublicRoomBookingConfirmation>(res);
}

// ---------------------------------------------------------------- date helpers

/** Today in Nairobi, YYYY-MM-DD. */
export function nairobiTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

/** A YYYY-MM-DD string `days` from now, in Nairobi's calendar. */
export function nairobiDateIso(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(
    new Date(Date.now() + days * 86400000),
  );
}

/** Whole nights between two YYYY-MM-DD dates (noon to noon, so a DST hour never shifts the count). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T12:00:00").getTime();
  const b = new Date(checkOut + "T12:00:00").getTime();
  const n = Math.round((b - a) / 86400000);
  return Number.isFinite(n) ? n : 0;
}
