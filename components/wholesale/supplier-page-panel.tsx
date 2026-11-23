"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CounterOrdersSetting } from "@/components/wholesale/counter-orders-setting";
import { SupplierNav } from "@/components/wholesale/supplier-nav";
import {
  claimShopSupplierPageUsername,
  fetchShopSupplierPage,
  fetchShopSupplierPayout,
  inviteSupplierPortalTeam,
  listShopSupplierPage,
  updateShopSupplierPayout,
  updateShopSupplierPage,
  updateShopSupplierPageVisibility,
  type ShopSupplierPage,
  type ShopSupplierPayout,
  type ShopTeamInviteRow,
} from "@/lib/api";

/**
 * A supplier shop's marketplace page, managed from inside the shop: what buyers read, how they reach the
 * supplier, where it delivers, and whether the page is on the marketplace yet.
 */
export function SupplierPagePanel() {
  const [page, setPage] = useState<ShopSupplierPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [regions, setRegions] = useState("");
  const [username, setUsername] = useState("");
  const [payout, setPayout] = useState<ShopSupplierPayout | null>(null);
  const [payoutDraft, setPayoutDraft] = useState({
    mobileMoney: "",
    tillNumber: "",
    paybill: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });
  const [teamRows, setTeamRows] = useState<ShopTeamInviteRow[] | null>(null);

  const showPayout = (next: ShopSupplierPayout) => {
    setPayout(next);
    setPayoutDraft({
      mobileMoney: next.mobileMoney ?? "",
      tillNumber: next.tillNumber ?? "",
      paybill: next.paybill ?? "",
      bankName: next.bankName ?? "",
      bankAccountNumber: next.bankAccountNumber ?? "",
      bankAccountName: next.bankAccountName ?? "",
    });
  };

  const show = (next: ShopSupplierPage) => {
    setPage(next);
    setDescription(next.profile.description ?? "");
    setPhone(next.profile.contactPhone ?? "");
    setEmail(next.profile.contactEmail ?? "");
    setLocation(next.profile.contactLocation ?? "");
    setRegions((next.profile.deliveryRegions ?? []).join(", "));
    setUsername(next.profile.username ?? "");
  };

  useEffect(() => {
    fetchShopSupplierPage()
      .then(show)
      .catch((error: unknown) =>
        setFailed(error instanceof Error ? error.message : "Could not load your marketplace page"),
      );
    // Payout details are a separate read; the page still works without them.
    fetchShopSupplierPayout().then(showPayout).catch(() => undefined);
  }, []);

  const savePayout = async () => {
    setBusy(true);
    try {
      showPayout(await updateShopSupplierPayout(payoutDraft));
      toast.success("Payout details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  const inviteTeam = async () => {
    setBusy(true);
    try {
      const result = await inviteSupplierPortalTeam();
      setTeamRows(result.rows);
      if (result.rows.length === 0) toast.message("Your supplier portal has no team members to invite");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  const payoutField = (key: keyof typeof payoutDraft, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`sp-payout-${key}`}>{label}</Label>
      <Input
        id={`sp-payout-${key}`}
        value={payoutDraft[key]}
        disabled={payout?.editable === false}
        onChange={(event) => setPayoutDraft((prev) => ({ ...prev, [key]: event.target.value }))}
      />
    </div>
  );

  const teamOutcome = (row: ShopTeamInviteRow): string => {
    if (row.outcome === "invited") return "Invitation sent";
    if (row.outcome === "already_in_shop") return "Already in this shop";
    if (row.outcome === "no_email") return row.reason ?? "No email";
    return row.reason ?? "Could not invite";
  };

  const run = async (work: () => Promise<ShopSupplierPage>, done: string) => {
    setBusy(true);
    try {
      show(await work());
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return <p className="p-4 text-[14px] text-foreground">{failed}</p>;
  }
  if (!page) {
    return <p className="p-4 text-[14px] text-muted-foreground">Loading…</p>;
  }

  const save = () =>
    run(
      () =>
        updateShopSupplierPage({
          description: description.trim(),
          contactPhone: phone.trim(),
          contactEmail: email.trim(),
          contactLocation: location.trim(),
          deliveryRegions: regions
            .split(",")
            .map((region) => region.trim())
            .filter((region) => region.length > 0),
        }),
      "Saved",
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Your page</h1>
        <p className="mt-1 max-w-prose text-[13px] text-muted-foreground">
          What buyers read about you on the Kiosk marketplace, how you are paid, and who works with you.
        </p>
        <div className="mt-4">
          <SupplierNav current="page" />
        </div>
        <p className="mt-4 text-[14px] font-medium text-foreground">
          {page.listed
            ? "Your page is on the Kiosk marketplace. Buyers can find it."
            : "Your page is not on the marketplace yet. Fill it in, then list it."}
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="sp-description">What you sell</Label>
          <Textarea
            id="sp-description"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-phone">Contact phone number</Label>
          <Input id="sp-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-email">Contact email</Label>
          <Input id="sp-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-location">Where you are</Label>
          <Input id="sp-location" value={location} onChange={(event) => setLocation(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-regions">Where you deliver</Label>
          <Input
            id="sp-regions"
            value={regions}
            onChange={(event) => setRegions(event.target.value)}
            placeholder="Nairobi, Kiambu, Thika"
          />
          <p className="text-[12px] text-muted-foreground">Separate areas with commas.</p>
        </div>
        <Button type="submit" disabled={busy}>
          Save what buyers read
        </Button>
      </form>

      <form
        className="space-y-1.5 border-t border-foreground/10 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => claimShopSupplierPageUsername(username.trim()), "Page name saved");
        }}
      >
        <Label htmlFor="sp-username">Page name</Label>
        <div className="flex gap-2">
          <Input id="sp-username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Button type="submit" variant="outline" disabled={busy || username.trim().length < 2}>
            Save name
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground">The short name in your page's address.</p>
      </form>

      <div className="space-y-3 border-t border-foreground/10 pt-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[14px]">Hide my prices on the marketplace</span>
          <Switch
            checked={page.hidePrices}
            disabled={busy}
            onCheckedChange={(next) =>
              void run(() => updateShopSupplierPageVisibility({ hidePrices: next }), "Saved")
            }
            aria-label="Hide my prices on the marketplace"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[14px]">Hide my contact details on the marketplace</span>
          <Switch
            checked={page.hideContacts}
            disabled={busy}
            onCheckedChange={(next) =>
              void run(() => updateShopSupplierPageVisibility({ hideContacts: next }), "Saved")
            }
            aria-label="Hide my contact details on the marketplace"
          />
        </div>
      </div>

      {payout ? (
        <form
          className="space-y-4 border-t border-foreground/10 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void savePayout();
          }}
        >
          <div>
            <h2 className="text-[15px] font-semibold">How you are paid</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {payout.editable
                ? "Fill in at least one: a mobile money number, a till, a paybill, or a bank account."
                : "Payout details cannot be changed right now."}
            </p>
          </div>
          {payoutField("mobileMoney", "Mobile money number")}
          {payoutField("tillNumber", "Till number")}
          {payoutField("paybill", "Paybill")}
          {payoutField("bankName", "Bank")}
          {payoutField("bankAccountNumber", "Bank account number")}
          {payoutField("bankAccountName", "Bank account name")}
          <Button type="submit" disabled={busy || !payout.editable}>
            Save payout details
          </Button>
        </form>
      ) : null}

      <div className="space-y-2 border-t border-foreground/10 pt-4">
        <h2 className="text-[15px] font-semibold">Your supplier portal team</h2>
        <p className="text-[12px] text-muted-foreground">
          Invite the people on your supplier portal into this shop. Each gets an email to set a shop password.
          Their portal sign-in does not change.
        </p>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void inviteTeam()}>
          Invite my portal team
        </Button>
        {teamRows && teamRows.length > 0 ? (
          <ul className="space-y-1 text-[13px]">
            {teamRows.map((row) => (
              <li key={`${row.email ?? row.name}`}>
                {row.name}
                {row.email ? ` (${row.email})` : ""}: {teamOutcome(row)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-foreground/10 pt-4">
        <h2 className="text-[15px] font-semibold">Selling over the counter</h2>
        <CounterOrdersSetting />
      </div>

      {page.listed ? null : (
        <div className="border-t border-foreground/10 pt-4">
          <Button type="button" disabled={busy} onClick={() => void run(listShopSupplierPage, "Your page is listed")}>
            List my page on the marketplace
          </Button>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Needs a contact phone number and where you deliver. Once listed, the page stays listed; you can hide
            your prices or contact details instead.
          </p>
        </div>
      )}
    </div>
  );
}
