"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferencesProfile,
} from "@/lib/api";

export function ShopNotificationPreferences() {
  const [profile, setProfile] = useState<NotificationPreferencesProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setProfile(await fetchNotificationPreferences());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<NotificationPreferencesProfile>) => {
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      const next = await updateNotificationPreferences({ ...profile, ...patch });
      setProfile(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const promoPush =
    profile?.categories?.promo?.WEB_PUSH ?? profile?.categories?.promo?.["WEB_PUSH"] ?? true;

  return (
    <section className="relative z-[1] mt-6 rounded-[1.5rem] border border-border/60 bg-card/85 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
        <Settings2 className="size-5 text-[color:var(--auth-primary)]" aria-hidden />
        <h2 className="font-heading text-lg font-bold tracking-tight">Alert preferences</h2>
      </div>
      <div className="space-y-4 px-5 py-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : profile ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="quiet-hours" className="text-sm font-medium">
                  Quiet hours
                </Label>
                <p className="text-xs text-muted-foreground">
                  {profile.quietHoursStart ?? "22:00"} – {profile.quietHoursEnd ?? "07:00"}
                  {profile.timezone ? ` (${profile.timezone})` : ""}
                </p>
              </div>
              <Switch
                id="quiet-hours"
                checked={Boolean(profile.quietHoursEnabled)}
                disabled={saving}
                onCheckedChange={(checked) => void save({ quietHoursEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="promo-enabled" className="text-sm font-medium">
                  Deals &amp; restock alerts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Up to {profile.maxPromotionalPerDay ?? 3} per day
                </p>
              </div>
              <Switch
                id="promo-enabled"
                checked={Boolean(profile.promotionalEnabled)}
                disabled={saving}
                onCheckedChange={(checked) => void save({ promotionalEnabled: checked })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="promo-push" className="text-sm font-medium">
                  Push for promotions
                </Label>
                <p className="text-xs text-muted-foreground">Price drops and back-in-stock</p>
              </div>
              <Switch
                id="promo-push"
                checked={Boolean(promoPush)}
                disabled={saving}
                onCheckedChange={(checked) =>
                  void save({
                    categories: {
                      ...profile.categories,
                      promo: {
                        ...(profile.categories?.promo ?? {}),
                        WEB_PUSH: checked,
                        IN_APP: profile.categories?.promo?.IN_APP ?? true,
                      },
                    },
                  })
                }
              />
            </div>
          </>
        ) : null}
        {!loading && profile ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-xs"
            disabled={saving}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        ) : null}
      </div>
    </section>
  );
}
