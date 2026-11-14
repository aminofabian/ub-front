"use client";

import { useEffect, useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { fetchPackageOffers, setPackageOffer, type ServiceRecord } from "@/lib/service-business-api";
import { cleanMoneyText, parseMoney } from "@/lib/service-cart";

const kes = (n: number) => formatMoney(n, "KES");

/** The prepaid package offered for one service: so many visits for one price, paid up front. */
export function PackageOfferDialog({ service, onClose }: { service: ServiceRecord; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [has, setHas] = useState(false);
  const [sessions, setSessions] = useState("5");
  const [price, setPrice] = useState("");
  const [validDays, setValidDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchPackageOffers()
      .then((offers) => {
        const mine = offers.find((o) => o.serviceId === service.id);
        if (mine) {
          setHas(true);
          setSessions(String(mine.sessions));
          setPrice(String(mine.price));
          setValidDays(mine.validDays ? String(mine.validDays) : "");
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [service.id]);

  const count = Number(sessions);
  const amount = parseMoney(price);
  const each = amount != null && count >= 2 ? Math.floor((amount / count) * 100) / 100 : null;

  async function save(remove: boolean) {
    if (!remove) {
      if (!Number.isInteger(count) || count < 2 || count > 100) return setError("Enter how many visits, from 2 to 100");
      if (amount == null || !(amount > 0)) return setError("Enter the price of the package");
      const days = validDays.trim() ? Number(validDays) : null;
      if (days != null && (!Number.isInteger(days) || days < 1)) return setError("Enter the number of days, or leave it empty");
    }
    setError(null);
    setSaving(true);
    try {
      await setPackageOffer(
        service.id,
        remove
          ? { sessions: null }
          : { sessions: count, price: amount ?? 0, validDays: validDays.trim() ? Number(validDays) : null },
      );
      onClose();
    } catch {
      setError("Could not save the package. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !saving ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Package for {service.name}</DialogTitle>
          <DialogDescription>
            The customer pays once and uses one visit at a time. One visit is normally {kes(service.price)}.
          </DialogDescription>
        </DialogHeader>
        {!loaded ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Visits</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="numeric"
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </label>
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Price for all of them</span>
                <input
                  className={dashboardInputClass(false, "font-mono")}
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(cleanMoneyText(e.target.value))}
                />
              </label>
            </div>
            {each != null ? <p className={dashboardHintClass()}>That is {kes(each)} a visit.</p> : null}
            <label className="grid gap-1">
              <span className={dashboardLabelClass()}>Use within (days, optional)</span>
              <input
                className={dashboardInputClass(false, "font-mono")}
                inputMode="numeric"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value.replace(/[^0-9]/g, ""))}
              />
              <span className={dashboardHintClass()}>Leave empty if a package never runs out.</span>
            </label>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          {has ? (
            <Button variant="ghost" disabled={saving} onClick={() => void save(true)}>
              Stop offering it
            </Button>
          ) : null}
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving || !loaded} onClick={() => void save(false)}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
