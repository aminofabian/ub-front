"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchBusiness, updateBusiness, type BusinessRecord } from "@/lib/api";

type EditableBusiness = {
  name: string;
  subscriptionTier: string;
  active: boolean;
};

const DEFAULT_EDITABLE: EditableBusiness = {
  name: "",
  subscriptionTier: "starter",
  active: true,
};

export default function BusinessPage() {
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [editable, setEditable] = useState<EditableBusiness>(DEFAULT_EDITABLE);
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
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Failed to load data."),
      );
  }, []);

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      await updateBusiness({
        name: editable.name,
        subscriptionTier: editable.subscriptionTier,
        active: editable.active,
      });
      const next = await fetchBusiness();
      setSnapshot(next);
      setMessage("Business settings saved. Refresh the page to confirm.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="max-w-xl space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Business settings</h2>
        <p className="text-sm text-muted-foreground">
          Read-only fields come from <code>GET /businesses/me</code>. Updates use{" "}
          <code>PATCH</code> with name, subscription tier, and active flag only.
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

      <form className="space-y-3" onSubmit={onSave}>
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
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save settings"}
        </Button>
      </form>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}
