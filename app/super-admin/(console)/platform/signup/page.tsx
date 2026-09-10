"use client";

import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SaSection, SaToggleRow } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import {
  fetchPlatformAuthSettings,
  updatePlatformAuthSettings,
} from "@/lib/super-admin-api";

export default function SuperAdminPlatformSignupPage() {
  const [required, setRequired] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const row = await fetchPlatformAuthSettings();
      setRequired(row.emailVerificationRequired);
      setLoaded(true);
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load signup settings.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (next: boolean) => {
    setError("");
    setSuccess("");
    setBusy(true);
    const previous = required;
    setRequired(next);
    try {
      const row = await updatePlatformAuthSettings({
        emailVerificationRequired: next,
      });
      setRequired(row.emailVerificationRequired);
      setSuccess(
        row.emailVerificationRequired
          ? "New signups must confirm their email before they can sign in."
          : "New signups skip email verification and can start onboarding right away.",
      );
    } catch (e) {
      setRequired(previous);
      setError(
        e instanceof Error ? e.message : "Could not save signup settings.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Signup"
        description="How new merchants prove their email during onboarding. You can require a confirmation, or let them continue without it."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      <SaSection
        title="Email verification"
        description="When this is on, signups stay invited until they tap the inbox link or enter the 6-digit code from the same email. When it is off, they become active immediately — useful when mail delivery is unreliable."
      >
        <SaToggleRow
          id="email-verification-required"
          label="Require email verification"
          description="Owners still get a verification email with a link and a code. They are not forced to type the code — the link is enough. Turn this off to skip the gate entirely."
          checked={required}
          onChange={(next) => void onToggle(next)}
          disabled={!loaded || busy}
        />
      </SaSection>
    </div>
  );
}
