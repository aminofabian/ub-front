"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import {
  claimSupplierPortalUsername,
  fetchSupplierPortalLinkCandidates,
  fetchSupplierPortalProfile,
  linkSupplierPortalLocalSupplier,
  patchSupplierPortalProfile,
  type SupplierPortalLinkCandidate,
  type SupplierPortalProfile,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

export default function SupplierPortalProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SupplierPortalProfile | null>(null);
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
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
      </div>
    </SupplierPortalShell>
  );
}
