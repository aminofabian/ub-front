"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type PlatformBrandingSettingsRecord,
  clearPlatformEmailLogo,
  fetchPlatformBranding,
  uploadPlatformEmailLogo,
} from "@/lib/super-admin-api";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = "image/png,image/jpeg,image/svg+xml,image/webp";

export default function SuperAdminPlatformBrandingPage() {
  const [record, setRecord] = useState<PlatformBrandingSettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setRecord(await fetchPlatformBranding());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load branding settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setActionError("");
    setSuccess("");
    if (!file.type.startsWith("image/")) {
      setActionError("Choose an image file (PNG, JPG, SVG or WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setActionError("Logo must be 2 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      setRecord(await uploadPlatformEmailLogo(file));
      setSuccess("Logo updated. New platform emails will use it.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setActionError("");
    setSuccess("");
    setBusy(true);
    try {
      setRecord(await clearPlatformEmailLogo());
      setSuccess("Logo removed. Platform emails fall back to the Kiosk wordmark.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not remove the logo.");
    } finally {
      setBusy(false);
    }
  };

  const logoUrl = record?.emailLogoUrl ?? null;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Branding"
        description="The logo shown in platform transactional email — onboarding tips, campaigns and the like. With none set, emails fall back to the built-in Kiosk wordmark."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {actionError ? <AuthAlert variant="error">{actionError}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Email logo</CardTitle>
          <CardDescription>
            A square mark reads best (it renders at 40×40px). PNG or SVG with a transparent
            background on a white header. Max 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-white">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Platform email logo"
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#28A745] text-sm font-semibold text-white">
                  K
                </div>
              )}
            </div>
            <div className="min-w-0 text-sm text-muted-foreground">
              {logoUrl ? (
                <span>Custom logo is live in platform emails.</span>
              ) : (
                <span>
                  No custom logo — emails use the Kiosk wordmark badge shown here.
                </span>
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={onPick}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={busy || !record}
              onClick={() => fileRef.current?.click()}
            >
              {logoUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {logoUrl ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void onRemove()}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
