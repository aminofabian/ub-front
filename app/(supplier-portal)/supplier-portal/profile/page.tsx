"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalProfile,
  patchSupplierPortalProfile,
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void fetchSupplierPortalProfile()
      .then((row) => {
        setProfile(row);
        setDescription(row.description ?? "");
        setContactEmail(row.contactEmail ?? "");
        setContactPhone(row.contactPhone ?? "");
        setDeliveryRegions((row.deliveryRegions ?? []).join(", "));
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
      setProfile(updated);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
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

  return (
    <SupplierPortalShell>
      <form className="mx-auto max-w-2xl space-y-6" onSubmit={onSave}>
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
    </SupplierPortalShell>
  );
}
