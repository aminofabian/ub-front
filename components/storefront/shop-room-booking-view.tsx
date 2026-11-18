"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { nextIdempotencyKey } from "@/lib/idempotency-key";
import {
  fetchPublicRoomAvailability,
  fetchPublicRooms,
  nairobiDateIso,
  nairobiTodayIso,
  nightsBetween,
  PublicRoomError,
  submitPublicRoomBooking,
  type PublicRoom,
  type PublicRoomInfo,
} from "@/lib/public-rooms";

const kes = (n: number) => `KSh ${Math.round(n).toLocaleString("en-KE")}`;

/**
 * The public room-booking flow (ADR 0031), dressed in the storefront's own theme: pick the nights,
 * see which rooms are free and what they cost, choose one, leave a name and a phone. No account,
 * nothing paid online — the house gets the booking on its front desk to confirm.
 */
export function ShopRoomBookingView({
  slug,
  initialInfo,
  embedded = false,
}: {
  slug: string;
  initialInfo?: PublicRoomInfo | null;
  embedded?: boolean;
}) {
  const [info, setInfo] = useState<PublicRoomInfo | null>(initialInfo ?? null);
  const [branchId, setBranchId] = useState(initialInfo?.branches[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(nairobiTodayIso());
  const [checkOut, setCheckOut] = useState(nairobiDateIso(1));
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [picked, setPicked] = useState<PublicRoom | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ roomName: string; nights: number; total: number } | null>(null);
  const requestIdRef = useRef<string>(nextIdempotencyKey());

  useEffect(() => {
    if (info) return;
    let live = true;
    void fetchPublicRooms(slug)
      .then((i) => {
        if (!live || !i) return;
        setInfo(i);
        setBranchId((b) => b || i.branches[0]?.id || "");
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [slug, info]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);

  async function search() {
    if (!branchId) return setError("Choose where you would like to stay.");
    if (nights < 1) return setError("Your check-out must be after your check-in.");
    setError(null);
    setPicked(null);
    setLoadingRooms(true);
    try {
      const result = await fetchPublicRoomAvailability(slug, { branchId, checkIn, checkOut });
      setRooms(result.rooms);
    } catch (e) {
      setError(e instanceof PublicRoomError ? e.message : "Could not load the rooms. Try again.");
      setRooms(null);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function book() {
    if (!picked) return;
    if (!name.trim()) return setError("Please give your name.");
    if (phone.replace(/[^0-9]/g, "").length < 9) return setError("Please give a phone number.");
    setError(null);
    setBusy(true);
    try {
      const confirmation = await submitPublicRoomBooking(slug, {
        branchId,
        roomId: picked.id,
        checkIn,
        checkOut,
        name: name.trim(),
        phone: phone.trim(),
        requestId: requestIdRef.current,
      });
      setDone({ roomName: confirmation.roomName, nights: confirmation.nights, total: confirmation.estimatedTotal });
    } catch (e) {
      if (e instanceof PublicRoomError && e.status === 409) {
        setError("That room was just taken. Choose another.");
        setPicked(null);
        void search();
      } else if (e instanceof PublicRoomError && e.status === 429) {
        setError("A little too fast — try again in a moment.");
      } else {
        setError(e instanceof PublicRoomError ? e.message : "Could not send your request. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    requestIdRef.current = nextIdempotencyKey();
    setDone(null);
    setPicked(null);
    setRooms(null);
    setName("");
    setPhone("");
  }

  if (done) {
    return (
      <div className={embedded ? "" : "sf-room-wrap"} style={{ maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 15, color: "var(--sf-ink, #222)" }}>
          Thank you, {name.split(" ")[0] || "and welcome"}.
        </p>
        <p style={{ marginTop: 8, fontSize: 14, color: "var(--sf-muted, #666)" }}>
          Your request for <strong>{done.roomName}</strong>, {done.nights} night{done.nights === 1 ? "" : "s"}
          {done.total > 0 ? ` (about ${kes(done.total)})` : ""}, is with the house. They will call to confirm.
        </p>
        <button type="button" onClick={reset} style={buttonStyle(false)}>
          Book another stay
        </button>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "sf-room-wrap"} style={{ maxWidth: 560, margin: "0 auto" }}>
      {info?.branches && info.branches.length > 1 ? (
        <label style={labelStyle}>
          Where
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={inputStyle}>
            {info.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={labelStyle}>
          Check in
          <input
            type="date"
            value={checkIn}
            min={nairobiTodayIso()}
            onChange={(e) => setCheckIn(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Check out
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>
      <p style={{ margin: "4px 2px 0", fontSize: 12, color: "var(--sf-muted, #777)" }}>
        {nights >= 1 ? `${nights} night${nights === 1 ? "" : "s"}` : "Choose your nights"}
        {info ? ` · in from ${info.checkInTime}, out by ${info.checkOutTime}` : ""}
      </p>

      <button type="button" onClick={() => void search()} disabled={loadingRooms || nights < 1} style={buttonStyle(true)}>
        {loadingRooms ? "Looking…" : "See free rooms"}
      </button>

      {error ? (
        <p role="alert" style={{ margin: "10px 2px 0", fontSize: 13, color: "#8f3f2f" }}>
          {error}
        </p>
      ) : null}

      {rooms ? (
        rooms.length === 0 ? (
          <p style={{ marginTop: 14, fontSize: 14, color: "var(--sf-muted, #666)" }}>
            No rooms are free for those nights. Try other dates.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "grid", gap: 8 }}>
            {rooms.map((r) => {
              const chosen = picked?.id === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(r)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 2,
                      border: chosen ? "1px solid var(--sf-accent, #1D4B3B)" : "1px solid rgba(0,0,0,0.12)",
                      background: chosen ? "color-mix(in srgb, var(--sf-accent, #1D4B3B) 7%, #fff)" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 14 }}>{r.name}</span>
                      {r.area ? (
                        <span style={{ fontSize: 12, color: "var(--sf-muted, #777)" }}>{r.area}</span>
                      ) : null}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--sf-accent, #1D4B3B)" }}>
                      {kes(r.nightlyRate)}
                      <span style={{ color: "var(--sf-muted, #777)" }}>/night</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {picked ? (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--sf-ink, #222)" }}>
            {picked.name} · {nights} night{nights === 1 ? "" : "s"} ·{" "}
            <strong>{kes(picked.nightlyRate * nights)}</strong>
          </p>
          <label style={labelStyle}>
            Your name
            <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Jane Doe" />
          </label>
          <label style={labelStyle}>
            Phone
            <input
              value={phone}
              maxLength={32}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
              placeholder="07…"
            />
          </label>
          <button type="button" onClick={() => void book()} disabled={busy} style={buttonStyle(true)}>
            {busy ? "Sending…" : "Request this stay"}
          </button>
          <p style={{ margin: 0, fontSize: 11, color: "var(--sf-muted, #888)", textAlign: "center" }}>
            Nothing is paid now. The house will confirm with you by phone.
          </p>
        </div>
      ) : null}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--sf-muted, #555)",
};

const inputStyle: React.CSSProperties = {
  height: 42,
  padding: "0 10px",
  borderRadius: 2,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: 14,
  background: "#fff",
  color: "var(--sf-ink, #222)",
};

function buttonStyle(primary: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    width: "100%",
    minHeight: 46,
    borderRadius: 2,
    border: primary ? "none" : "1px solid rgba(0,0,0,0.18)",
    background: primary ? "var(--sf-accent, #1D4B3B)" : "#fff",
    color: primary ? "var(--sf-on-accent, #fff)" : "var(--sf-ink, #222)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };
}
