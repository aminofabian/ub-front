"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { fetchRestaurantSettings, saveRestaurantSettings, type RestaurantSettingsRecord } from "@/lib/restaurant-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";

function hhmm(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function toMinute(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const minute = Number(m[1]) * 60 + Number(m[2]);
  return minute >= 0 && minute < 1440 ? minute : null;
}

/**
 * How the restaurant runs: what it adds to a bill, how tips are shared, when its day starts and
 * whether customers may order from a table's QR code. Nothing is filled in to begin with; an
 * empty charge means there is none.
 */
export function SettingsSection() {
  const [settings, setSettings] = useState<RestaurantSettingsRecord | null>(null);
  const [failed, setFailed] = useState(false);
  const [service, setService] = useState("");
  const [packaging, setPackaging] = useState("");
  const [delivery, setDelivery] = useState("");
  const [dayStart, setDayStart] = useState("00:00");
  const [pooled, setPooled] = useState(false);
  const [chargeTo, setChargeTo] = useState<"BUSINESS" | "STAFF">("BUSINESS");
  const [qr, setQr] = useState(false);
  const [menuOnline, setMenuOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRestaurantSettings()
      .then((s) => {
        setSettings(s);
        setService(s.serviceChargePercent != null ? String(s.serviceChargePercent) : "");
        setPackaging(s.packagingCharge != null ? String(s.packagingCharge) : "");
        setDelivery(s.deliveryFee != null ? String(s.deliveryFee) : "");
        setDayStart(hhmm(s.dayStartsAtMinute));
        setPooled(s.tipsPooled);
        setChargeTo(s.serviceChargeTo === "STAFF" ? "STAFF" : "BUSINESS");
        setQr(s.qrOrdering);
        setMenuOnline(Boolean(s.menuOnline));
      })
      .catch(() => setFailed(true));
  }, []);

  async function save() {
    setError(null);
    const percent = service.trim() === "" ? 0 : Number(service);
    if (!Number.isFinite(percent) || percent < 0 || percent > 30) return setError("A service charge is between 0 and 30 percent");
    const dayStartsAtMinute = toMinute(dayStart);
    if (dayStartsAtMinute == null) return setError("Type when your day starts as hours and minutes, like 04:00");
    setSaving(true);
    try {
      setSettings(
        await saveRestaurantSettings({
          serviceChargePercent: percent,
          packagingCharge: parseMoney(packaging) ?? 0,
          deliveryFee: parseMoney(delivery) ?? 0,
          dayStartsAtMinute,
          tipsPooled: pooled,
          serviceChargeTo: chargeTo,
          qrOrdering: qr,
          menuOnline,
        }),
      );
      toast.success("Saved");
    } catch (e) {
      setError(e instanceof ApiRequestError && e.message ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (failed) {
    return (
      <section className={DASHBOARD_SECTION_SURFACE}>
        <p role="alert" className="text-sm text-red-700">
          Could not load how the restaurant runs. Reload the page to try again.
        </p>
      </section>
    );
  }
  if (settings == null) return null;

  return (
    <section className={DASHBOARD_SECTION_SURFACE} aria-label="How the restaurant runs">
      <h2 className="font-serif text-[1.25rem] leading-none tracking-[-0.02em] text-[var(--op-ink,#121A16)]">
        How the restaurant runs
      </h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="grid content-start gap-1">
          <span className={dashboardLabelClass()}>Service charge (%)</span>
          <input
            className={dashboardInputClass(false, "w-28 font-mono")}
            inputMode="decimal"
            placeholder="None"
            value={service}
            onChange={(e) => setService(e.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
          />
          <span className={dashboardHintClass()}>Added to every bill of a table&rsquo;s order, to the nearest shilling.</span>
        </label>
        <fieldset className="grid gap-1">
          <legend className={dashboardLabelClass()}>Who the service charge is for</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="service-charge-to"
              className="mt-1"
              checked={chargeTo === "BUSINESS"}
              onChange={() => setChargeTo("BUSINESS")}
            />
            <span>
              The restaurant
              <span className={`block ${dashboardHintClass()}`}>It is counted with your sales income.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="service-charge-to"
              className="mt-1"
              checked={chargeTo === "STAFF"}
              onChange={() => setChargeTo("STAFF")}
            />
            <span>
              The staff who serve
              <span className={`block ${dashboardHintClass()}`}>
                It is not your income. It goes to whoever served the table, or is shared if tips are shared
                below, and shows in what they are owed. A table then needs a server before its bill is paid.
              </span>
            </span>
          </label>
          <span className={dashboardHintClass()}>
            The customer pays the same either way. Which one is right for you, and how it is taxed, is a
            question for your accountant.
          </span>
        </fieldset>
        <label className="grid gap-1">
          <span className={dashboardLabelClass()}>Packaging charge (KES)</span>
          <input
            className={dashboardInputClass(false, "w-28 font-mono")}
            inputMode="decimal"
            placeholder="None"
            value={packaging}
            onChange={(e) => setPackaging(cleanMoneyText(e.target.value))}
          />
          <span className={dashboardHintClass()}>Added once to each takeaway or delivery order.</span>
        </label>
        <label className="grid gap-1">
          <span className={dashboardLabelClass()}>Usual delivery fee (KES)</span>
          <input
            className={dashboardInputClass(false, "w-28 font-mono")}
            inputMode="decimal"
            placeholder="None"
            value={delivery}
            onChange={(e) => setDelivery(cleanMoneyText(e.target.value))}
          />
          <span className={dashboardHintClass()}>A delivery order can be given its own fee.</span>
        </label>
        <label className="grid gap-1">
          <span className={dashboardLabelClass()}>Your day starts at</span>
          <input type="time" className={dashboardInputClass(false, "w-32 font-mono")} value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
          <span className={dashboardHintClass()}>
            For reports. A bar that closes at 2 am can start its day at 04:00 so those sales stay with the night before.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={pooled} onChange={(e) => setPooled(e.target.checked)} />
          <span>
            Share tips among everyone who serves
            <span className={`block ${dashboardHintClass()}`}>
              Off: a tip goes to whoever served the table. On: it is split equally among everyone marked as serving customers.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={qr} onChange={(e) => setQr(e.target.checked)} />
          <span>
            Let customers order from a QR code on the table
            <span className={`block ${dashboardHintClass()}`}>
              Their order waits on the floor for a member of staff to check and send. Give each table its code under Floor, Tables.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={menuOnline} onChange={(e) => setMenuOnline(e.target.checked)} />
          <span>
            Show the menu on your web page
            <span className={`block ${dashboardHintClass()}`}>
              Anyone who opens your shop&rsquo;s address sees your dishes, prices and pictures. They cannot order from it.
            </span>
          </span>
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button className="mt-3" size="sm" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </section>
  );
}
