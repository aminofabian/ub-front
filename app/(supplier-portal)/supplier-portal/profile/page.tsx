"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { registerAccount } from "@/lib/api";
import { persistSessionTenantHost, setSessionTenantId } from "@/lib/auth";
import { APP_ROUTES, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import {
  claimSupplierPortalUsername,
  fetchSupplierPortalLinkCandidates,
  fetchSupplierPortalProfile,
  fetchSupplierPortalShop,
  fetchSupplierPortalVisibility,
  importSupplierPortalShopProducts,
  linkSupplierPortalLocalSupplier,
  openSupplierPortalShop,
  patchSupplierPortalProfile,
  patchSupplierPortalVisibility,
  type SupplierPortalLinkCandidate,
  type SupplierPortalProfile,
  type SupplierPortalShop,
  type SupplierPortalVisibility,
  type SupplierShopImport,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

/**
 * "Open your wholesale shop": the supplier gets a shop of its own on the platform, on the same
 * plans as any shop, and creates the owner sign-in for it in the same step.
 */
function WholesaleShop({ suggestedAddress }: { suggestedAddress: string }) {
  const [shop, setShop] = useState<SupplierPortalShop | null>(null);
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void fetchSupplierPortalShop()
      .then(setShop)
      .catch(() => setShop(null));
  }, []);

  if (!shop) return null;

  const shopUrl = shop.slug ? slugDerivedShopUrl(shop.slug) : "";

  const describeCopy = (result: SupplierShopImport): string => {
    const parts: string[] = [];
    if (result.copied > 0) {
      parts.push(`${result.copied} product${result.copied === 1 ? "" : "s"} copied into your shop`);
    }
    if (result.alreadyInShop > 0) {
      parts.push(`${result.alreadyInShop} already there`);
    }
    if (result.failed > 0) {
      parts.push(`${result.failed} could not be copied`);
    }
    if (parts.length === 0) {
      parts.push("No products to copy yet");
    }
    const line = `${parts.join(", ")}.`;
    return result.stoppedByPlanLimit
      ? `${line} ${result.planMessage ?? "Your plan has no room for more products."}`
      : line;
  };

  const onCopyProducts = async () => {
    setBusy(true);
    try {
      const result = await importSupplierPortalShopProducts();
      setNote(describeCopy(result));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy your products");
    } finally {
      setBusy(false);
    }
  };

  const onOpen = async () => {
    if (!ownerName.trim() || !email.trim() || password.length < 8) {
      toast.error("Enter your name, an email and a password of at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const opened = await openSupplierPortalShop(address);
      setShop(opened);
      if (!opened.businessId || !opened.slug) {
        throw new Error("The shop could not be opened");
      }
      // Create the shop's owner sign-in straight away, the way shop sign-up does.
      setSessionTenantId(opened.businessId);
      const url = slugDerivedShopUrl(opened.slug);
      if (url) {
        try {
          persistSessionTenantHost(new URL(url).hostname);
        } catch {
          /* ignore */
        }
      }
      const registered = await registerAccount(ownerName.trim(), email.trim(), password);
      setPassword("");
      // Bring the price list across so the shop does not start empty.
      const copyLine = await importSupplierPortalShopProducts()
        .then(describeCopy)
        .catch(() => "Your products were not copied yet; use the button below.");
      setNote(
        `${
          registered.status === "ACTIVE" || registered.status === "active"
            ? "Your shop is open. Sign in there with the email and password you just set."
            : `Your shop is open. We sent a link to ${registered.email}; verify it, then sign in at your shop.`
        } ${copyLine}`,
      );
      toast.success("Wholesale shop opened");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the shop");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-input p-4">
      <header>
        <h3 className="text-base font-semibold">Your wholesale shop</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {shop.opened
            ? "Your own shop: products, stock, orders and your own books."
            : "Open a shop of your own: your products, stock, orders and your own books. It is on the same plans as any shop, so choose a plan whose daily sales limit fits what you sell."}
        </p>
      </header>
      {shop.opened ? (
        <p className="text-sm">
          {shopUrl ? (
            <>
              <a className="font-medium underline" href={`${shopUrl}/login`}>
                {shop.host || shopUrl}
              </a>
              <span className="block text-xs text-muted-foreground">
                No sign-in for the shop yet?{" "}
                <a className="underline" href={`${shopUrl}/signup`}>
                  Create the owner sign-in
                </a>
                .
              </span>
            </>
          ) : (
            <span className="font-medium">{shop.name}</span>
          )}
          <span className="mt-3 block">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onCopyProducts()}>
              {busy ? "Copying…" : "Copy my price list into the shop"}
            </Button>
          </span>
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Shop address</span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={suggestedAddress || "your-shop"}
            />
            <span className="text-xs text-muted-foreground">
              Leave empty to use {suggestedAddress ? `"${suggestedAddress}"` : "your business name"}.
            </span>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Your name</span>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email for the shop sign-in</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void onOpen()}>
            {busy ? "Opening…" : "Open my wholesale shop"}
          </Button>
        </div>
      )}
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
    </section>
  );
}

/** A supplier stays in the directory; it chooses whether prices and contacts show there. */
function PublicPageVisibility() {
  const [visibility, setVisibility] = useState<SupplierPortalVisibility | null>(null);
  const [savingKey, setSavingKey] = useState<keyof SupplierPortalVisibility | null>(null);

  useEffect(() => {
    void fetchSupplierPortalVisibility()
      .then(setVisibility)
      .catch(() => setVisibility(null));
  }, []);

  if (!visibility) return null;

  const toggle = async (key: keyof SupplierPortalVisibility, hide: boolean) => {
    setSavingKey(key);
    try {
      setVisibility(await patchSupplierPortalVisibility({ [key]: hide }));
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-input p-4">
      <header>
        <h3 className="text-base font-semibold">What your public page shows</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your business and products stay listed for shops to find. You choose
          whether your prices and contact details show.
        </p>
      </header>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={!visibility.hidePrices}
          disabled={savingKey !== null}
          onChange={(e) => void toggle("hidePrices", !e.target.checked)}
        />
        <span>
          <span className="font-medium">Show my prices</span>
          <span className="block text-xs text-muted-foreground">
            When off, shops see your products without prices and ask you.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={!visibility.hideContacts}
          disabled={savingKey !== null}
          onChange={(e) => void toggle("hideContacts", !e.target.checked)}
        />
        <span>
          <span className="font-medium">Show my phone and email</span>
          <span className="block text-xs text-muted-foreground">
            When off, your contact phone and email are not on your public page.
          </span>
        </span>
      </label>
    </section>
  );
}

export default function SupplierPortalProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SupplierPortalProfile | null>(null);
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [altContactPhone, setAltContactPhone] = useState("");
  const [contactLocation, setContactLocation] = useState("");
  const [deliveryRegions, setDeliveryRegions] = useState("");
  const [usernameDraft, setUsernameDraft] = useState("");
  const [candidates, setCandidates] = useState<SupplierPortalLinkCandidate[]>([]);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const applyProfile = (row: SupplierPortalProfile) => {
    setProfile(row);
    setDescription(row.description ?? "");
    setContactEmail(row.contactEmail ?? "");
    setContactPhone(row.contactPhone ?? "");
    setAltContactPhone(row.altContactPhone ?? "");
    setContactLocation(row.contactLocation ?? "");
    setDeliveryRegions((row.deliveryRegions ?? []).join(", "));
    if (row.username) {
      setUsernameDraft(row.username);
    }
  };

  const loadCandidates = async () => {
    try {
      const rows = await fetchSupplierPortalLinkCandidates();
      setCandidates(rows);
    } catch {
      setCandidates([]);
    }
  };

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void fetchSupplierPortalProfile()
      .then((row) => {
        applyProfile(row);
        return loadCandidates();
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load profile");
      });
  }, [router]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await patchSupplierPortalProfile({
        description: description.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        altContactPhone: altContactPhone.trim() || undefined,
        contactLocation: contactLocation.trim() || undefined,
        deliveryRegions: deliveryRegions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      applyProfile(updated);
      toast.success("Profile updated");
      await loadCandidates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onClaimUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    try {
      const updated = await claimSupplierPortalUsername(usernameDraft.trim());
      applyProfile(updated);
      toast.success(`Claimed @${updated.username}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not claim username");
    } finally {
      setClaiming(false);
    }
  };

  const onLink = async (localSupplierId: string) => {
    setLinkingId(localSupplierId);
    try {
      const updated = await linkSupplierPortalLocalSupplier(localSupplierId);
      applyProfile(updated);
      toast.success("Shop linked to your passport");
      await loadCandidates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Link failed");
    } finally {
      setLinkingId(null);
    }
  };

  if (!profile) {
    return (
      <SupplierPortalShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading profile…
        </div>
      </SupplierPortalShell>
    );
  }

  const hubHref = profile.publicHubPath
    ? `https://${PLATFORM_DOMAIN}${profile.publicHubPath}`
    : null;

  return (
    <SupplierPortalShell>
      <div className="mx-auto max-w-2xl space-y-10">
        <section className="space-y-4 border border-border p-4">
          <header>
            <h2 className="text-lg font-semibold tracking-tight">Global passport</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Claim a unique @username on {PLATFORM_DOMAIN}, then link the local
              supplier rows shops already use for you.
            </p>
          </header>

          {profile.username ? (
            <div className="space-y-2 text-sm">
              <p>
                Username:{" "}
                <span className="font-medium">@{profile.username}</span>
              </p>
              {hubHref ? (
                <p>
                  Public hub:{" "}
                  <a className="underline underline-offset-2" href={hubHref} target="_blank" rel="noreferrer">
                    {hubHref}
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <form className="flex flex-wrap items-end gap-3" onSubmit={onClaimUsername}>
              <label className="block min-w-[12rem] flex-1 space-y-1 text-sm">
                <span className="font-medium">Choose @username</span>
                <Input
                  placeholder="jamro"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  required
                  minLength={2}
                  maxLength={64}
                />
              </label>
              <Button type="submit" disabled={claiming || usernameDraft.trim().length < 2}>
                {claiming ? "Claiming…" : "Claim username"}
              </Button>
            </form>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Linked shops</h3>
            {(profile.linkedShops ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No shops linked yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {profile.linkedShops.map((shop) => (
                  <li
                    key={shop.connectionId}
                    className="flex items-center justify-between gap-3 border border-border px-3 py-2"
                  >
                    <span>
                      <span className="font-medium">{shop.shopName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {shop.localSupplierName}
                      </span>
                    </span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {shop.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Suggested shop identities</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadCandidates()}>
                Refresh
              </Button>
            </div>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No matches yet. Update contact phone/email, then refresh.
              </p>
            ) : (
              <ul className="space-y-2">
                {candidates.map((row) => (
                  <li
                    key={row.localSupplierId}
                    className="flex flex-wrap items-center justify-between gap-3 border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {row.supplierName}{" "}
                        <span className="font-normal text-muted-foreground">
                          at {row.shopName}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Matched by {row.matchReason}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={linkingId === row.localSupplierId}
                      onClick={() => void onLink(row.localSupplierId)}
                    >
                      {linkingId === row.localSupplierId ? "Linking…" : "Confirm link"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <form className="space-y-6" onSubmit={onSave}>
          <header>
            <h2 className="text-2xl font-semibold tracking-tight">{profile.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Marketplace profile visible to connected businesses.
            </p>
          </header>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Contact email</span>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Contact phone</span>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Second WhatsApp</span>
              <Input
                value={altContactPhone}
                onChange={(e) => setAltContactPhone(e.target.value)}
                placeholder="07…"
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="font-medium">Area or market</span>
              <Input
                value={contactLocation}
                onChange={(e) => setContactLocation(e.target.value)}
                placeholder="Githurai, Kawangware…"
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Delivery regions</span>
            <Input
              placeholder="Nairobi, Mombasa, Kisumu"
              value={deliveryRegions}
              onChange={(e) => setDeliveryRegions(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">Comma-separated list</span>
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <PublicPageVisibility />

        <WholesaleShop suggestedAddress={profile.username ?? ""} />
      </div>
    </SupplierPortalShell>
  );
}
