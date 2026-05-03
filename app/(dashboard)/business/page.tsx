"use client";

import { useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  fetchBranches,
  fetchBusiness,
  updateBusiness,
  type BranchRecord,
  type BusinessRecord,
  type PatchBusinessPayload,
} from "@/lib/api";

const MAX_FEATURED = 12;

function parseFeaturedLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_FEATURED);
}

type EditableBusiness = {
  name: string;
  subscriptionTier: string;
  active: boolean;
};

type StorefrontForm = {
  enabled: boolean;
  catalogBranchId: string;
  label: string;
  announcement: string;
  featuredLines: string;
};

const DEFAULT_EDITABLE: EditableBusiness = {
  name: "",
  subscriptionTier: "starter",
  active: true,
};

const DEFAULT_STOREFRONT: StorefrontForm = {
  enabled: false,
  catalogBranchId: "",
  label: "",
  announcement: "",
  featuredLines: "",
};

function storefrontFromRecord(b: BusinessRecord | null): StorefrontForm {
  const s = b?.storefront;
  return {
    enabled: Boolean(s?.enabled),
    catalogBranchId: String(s?.catalogBranchId ?? "").trim(),
    label: String(s?.label ?? ""),
    announcement: String(s?.announcement ?? ""),
    featuredLines: (s?.featuredItemIds ?? []).join("\n"),
  };
}

export default function BusinessPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [editable, setEditable] = useState<EditableBusiness>(DEFAULT_EDITABLE);
  const [storefront, setStorefront] = useState<StorefrontForm>(DEFAULT_STOREFRONT);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBusiness()
      .then((payload) => {
        setSnapshot(payload);
        setEditable({
          name: String(payload.name ?? ""),
          subscriptionTier: String(payload.subscriptionTier ?? "starter"),
          active: Boolean(payload.active ?? true),
        });
        setStorefront(storefrontFromRecord(payload));
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Failed to load data."),
      );
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [canManageBusinessSettings]);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      const body: PatchBusinessPayload = {
        name: editable.name,
        subscriptionTier: editable.subscriptionTier,
        active: editable.active,
      };
      if (canManageBusinessSettings) {
        body.storefront = {
          enabled: storefront.enabled,
          catalogBranchId: storefront.enabled ? storefront.catalogBranchId.trim() : "",
          label: storefront.label.trim() || null,
          announcement: storefront.announcement.trim() || null,
          featuredItemIds: parseFeaturedLines(storefront.featuredLines),
        };
      }
      await updateBusiness(body);
      const next = await fetchBusiness();
      setSnapshot(next);
      setStorefront(storefrontFromRecord(next));
      setMessage("Business settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Business settings</h2>
        <p className="text-sm text-muted-foreground">
          Core fields and subscription come from <code>GET /businesses/me</code> and are updated with{" "}
          <code>PATCH</code>.
        </p>
      </header>

      {snapshot ? (
        <dl className="grid gap-2 rounded-md border bg-muted/20 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Slug</dt>
            <dd>{snapshot.slug ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Timezone</dt>
            <dd>{snapshot.timezone ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{snapshot.currency ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Country</dt>
            <dd>{snapshot.countryCode ?? "—"}</dd>
          </div>
        </dl>
      ) : null}

      <form className="space-y-6" onSubmit={onSave}>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Profile</h3>
          <label className="block text-sm font-medium" htmlFor="biz-name">
            Business name
          </label>
          <input
            id="biz-name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={editable.name}
            onChange={(event) =>
              setEditable((previous) => ({ ...previous, name: event.target.value }))
            }
          />
          <label className="block text-sm font-medium" htmlFor="biz-tier">
            Subscription tier
          </label>
          <input
            id="biz-tier"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={editable.subscriptionTier}
            onChange={(event) =>
              setEditable((previous) => ({
                ...previous,
                subscriptionTier: event.target.value,
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={editable.active}
              onChange={(event) =>
                setEditable((previous) => ({ ...previous, active: event.target.checked }))
              }
            />
            Active
          </label>
        </div>

        {canManageBusinessSettings ? (
          <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-4">
            <h3 className="text-sm font-medium">Online storefront</h3>
            <p className="text-xs text-muted-foreground">
              Phase 15 — opt in to the public catalog window. Prices use the branch you select. Public APIs arrive in
              slice 3.
            </p>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={storefront.enabled}
                onChange={(event) =>
                  setStorefront((s) => ({ ...s, enabled: event.target.checked }))
                }
              />
              Enable storefront
            </label>
            <label className="block text-sm font-medium" htmlFor="sf-branch">
              Catalog branch (prices from this branch)
            </label>
            <select
              id="sf-branch"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={storefront.catalogBranchId}
              disabled={!storefront.enabled}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, catalogBranchId: e.target.value }))
              }
            >
              <option value="">Select branch…</option>
              {branches
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
            <label className="block text-sm font-medium" htmlFor="sf-label">
              Label (optional)
            </label>
            <input
              id="sf-label"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={storefront.label}
              onChange={(e) => setStorefront((s) => ({ ...s, label: e.target.value }))}
              placeholder="e.g. Shop"
            />
            <label className="block text-sm font-medium" htmlFor="sf-announcement">
              Announcement (optional)
            </label>
            <textarea
              id="sf-announcement"
              className="min-h-[4rem] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={storefront.announcement}
              onChange={(e) => setStorefront((s) => ({ ...s, announcement: e.target.value }))}
              placeholder="Short message for the shop window"
            />
            <label className="block text-sm font-medium" htmlFor="sf-featured">
              Featured item IDs (optional, one UUID per line, max {MAX_FEATURED})
            </label>
            <textarea
              id="sf-featured"
              className="min-h-[6rem] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
              value={storefront.featuredLines}
              onChange={(e) => setStorefront((s) => ({ ...s, featuredLines: e.target.value }))}
              placeholder={"00000000-0000-0000-0000-000000000000\n…"}
            />
          </div>
        ) : null}

        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save settings"}
        </Button>
      </form>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
