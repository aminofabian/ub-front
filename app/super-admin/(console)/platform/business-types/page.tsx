"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessType } from "@/lib/business-types-api";
import {
  clearBusinessTypeImage,
  fetchBusinessTypesForAdmin,
  updateBusinessType,
  uploadBusinessTypeImage,
} from "@/lib/super-admin-api";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = "image/png,image/jpeg,image/svg+xml,image/webp";

// Section display order and labels. The section itself is derived from the fixed code set on the
// backend (ADR 0029); these are just the headings and their order on this page.
const SECTION_ORDER: { key: string; title: string; blurb: string }[] = [
  { key: "shop", title: "Shops", blurb: "Retail formats that sell goods off the shelf." },
  { key: "food", title: "Food & drink", blurb: "Restaurants, cafés, takeaways and bars." },
  { key: "service", title: "Services", blurb: "Salons, kinyozis, spas and the like." },
  { key: "lodging", title: "Lodging", blurb: "A guest house or rooms, usually on top of a bar." },
];

export default function SuperAdminBusinessTypesPage() {
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setTypes(await fetchBusinessTypesForAdmin());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load business types.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceType = useCallback((updated: BusinessType) => {
    setTypes((prev) => prev.map((t) => (t.code === updated.code ? updated : t)));
  }, []);

  const grouped = useMemo(() => {
    const bySection = new Map<string, BusinessType[]>();
    for (const t of types) {
      const list = bySection.get(t.section) ?? [];
      list.push(t);
      bySection.set(t.section, list);
    }
    // Known sections first in their order, then any unexpected section last.
    const known = SECTION_ORDER.map((s) => ({ ...s, items: bySection.get(s.key) ?? [] }));
    const extraKeys = [...bySection.keys()].filter(
      (k) => !SECTION_ORDER.some((s) => s.key === k),
    );
    const extras = extraKeys.map((k) => ({
      key: k,
      title: k,
      blurb: "",
      items: bySection.get(k) ?? [],
    }));
    return [...known, ...extras].filter((s) => s.items.length > 0);
  }, [types]);

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Business types"
        description="The shop formats a merchant picks during onboarding. Edit how each one reads and upload an image to show in the picker. The type's code is fixed; you can relabel, re-hint, reorder, hide or illustrate it, but adding a brand-new format still needs a release."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {actionError ? <AuthAlert variant="error">{actionError}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      {grouped.map((section) => (
        <Card key={section.key}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.blurb ? <CardDescription>{section.blurb}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {section.items.map((type) => (
              <TypeRow
                key={type.code}
                type={type}
                onChanged={replaceType}
                onError={setActionError}
                onSuccess={setSuccess}
                clearMessages={() => {
                  setActionError("");
                  setSuccess("");
                }}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TypeRow({
  type,
  onChanged,
  onError,
  onSuccess,
  clearMessages,
}: {
  type: BusinessType;
  onChanged: (t: BusinessType) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  clearMessages: () => void;
}) {
  const [label, setLabel] = useState(type.label);
  const [hint, setHint] = useState(type.hint ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(type.displayOrder));
  const [enabled, setEnabled] = useState(type.enabled);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep local fields in step when the row is replaced from the server (e.g. after an image change).
  useEffect(() => {
    setLabel(type.label);
    setHint(type.hint ?? "");
    setDisplayOrder(String(type.displayOrder));
    setEnabled(type.enabled);
  }, [type]);

  const dirty =
    label !== type.label ||
    (hint ?? "") !== (type.hint ?? "") ||
    displayOrder !== String(type.displayOrder) ||
    enabled !== type.enabled;

  const onSave = async () => {
    clearMessages();
    const order = Number.parseInt(displayOrder, 10);
    if (!label.trim()) {
      onError(`${type.code}: a label is required.`);
      return;
    }
    if (!Number.isFinite(order)) {
      onError(`${type.code}: order must be a number.`);
      return;
    }
    setBusy(true);
    try {
      onChanged(
        await updateBusinessType(type.code, {
          label: label.trim(),
          hint: hint.trim() ? hint.trim() : null,
          section: type.section,
          displayOrder: order,
          enabled,
        }),
      );
      onSuccess(`Saved “${label.trim()}”.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : `Could not save ${type.code}.`);
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    clearMessages();
    if (!file.type.startsWith("image/")) {
      onError("Choose an image file (PNG, JPG, SVG or WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError("Image must be 2 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      onChanged(await uploadBusinessTypeImage(type.code, file));
      onSuccess(`Image updated for “${type.label}”.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onClearImage = async () => {
    clearMessages();
    setBusy(true);
    try {
      onChanged(await clearBusinessTypeImage(type.code));
      onSuccess(`Image removed for “${type.label}”.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not remove the image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Image thumbnail */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-white">
            {type.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={type.imageUrl}
                alt={`${type.label} image`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-1 text-center text-[11px] text-muted-foreground">No image</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={onPickImage}
          />
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {type.imageUrl ? "Replace" : "Upload"}
            </Button>
            {type.imageUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onClearImage()}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {/* Fields */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {type.code}
            </Badge>
            {!enabled ? <Badge variant="secondary">Hidden</Badge> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor={`label-${type.code}`}>Label</Label>
              <Input
                id={`label-${type.code}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`order-${type.code}`}>Order</Label>
              <Input
                id={`order-${type.code}`}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                inputMode="numeric"
                className="w-24"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`hint-${type.code}`}>Hint</Label>
            <Textarea
              id={`hint-${type.code}`}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={400}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span>Shown in onboarding</span>
            </label>
            <Button type="button" size="sm" disabled={busy || !dirty} onClick={() => void onSave()}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
