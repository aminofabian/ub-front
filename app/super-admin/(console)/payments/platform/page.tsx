"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Shield } from "lucide-react";
import { toast } from "sonner";

import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type PlatformGatewayRecord,
  type PatchPlatformGatewayPayload,
  fetchPlatformGateways,
  patchPlatformGateway,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export default function SuperAdminPlatformPaymentsPage() {
  const [gateways, setGateways] = useState<PlatformGatewayRecord[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      setGateways(await fetchPlatformGateways());
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load platform gateways.",
      );
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onToggle = async (
    gatewayType: string,
    current: PlatformGatewayRecord,
    field: "isEnabled" | "supplierPayoutSupported",
  ) => {
    setSaving(gatewayType);
    try {
      const body: PatchPlatformGatewayPayload = {
        isEnabled:
          field === "isEnabled" ? !current.isEnabled : current.isEnabled,
        supplierPayoutSupported:
          field === "supplierPayoutSupported"
            ? !current.supplierPayoutSupported
            : current.supplierPayoutSupported,
        displayName: current.displayName,
        description: current.description ?? undefined,
        logoUrl: current.logoUrl ?? undefined,
        sortOrder: current.sortOrder,
      };
      await patchPlatformGateway(gatewayType, body);
      toast.success(
        field === "isEnabled"
          ? `${current.displayName} ${body.isEnabled ? "enabled" : "disabled"} for checkout.`
          : `${current.displayName} supplier payouts ${body.supplierPayoutSupported ? "enabled" : "disabled"}.`,
      );
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update gateway.");
    } finally {
      setSaving(null);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-8">
        <SuperAdminPageHeader
          title="Payment gateways"
          description="Control which payment gateways are available to all tenants."
        />
        <Card className="border-destructive/25 bg-destructive/[0.04] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3">
            <Shield className="size-8 text-destructive" aria-hidden />
            <div>
              <CardTitle className="text-destructive">
                Could not load gateways
              </CardTitle>
              <CardDescription className="text-destructive/90">
                {loadError}
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Payment gateways"
        description="Platform-wide switches for checkout. Tenants inherit enabled methods based on your configuration here."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {gateways.map((gw) => (
          <Card
            key={gw.gatewayType}
            className={cn(
              "group border-border/70 shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md",
              gw.isEnabled && "ring-1 ring-primary/20",
            )}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background",
                      gw.isEnabled
                        ? "bg-emerald-500 ring-emerald-500/30"
                        : "bg-muted-foreground/25 ring-transparent",
                    )}
                    aria-hidden
                  />
                  <CardTitle className="truncate font-heading text-base leading-snug">
                    {gw.displayName}
                  </CardTitle>
                </div>
                <Badge variant={gw.isEnabled ? "success" : "secondary"}>
                  {gw.isEnabled ? "On" : "Off"}
                </Badge>
              </div>
              {gw.description ? (
                <CardDescription className="line-clamp-3">
                  {gw.description}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground tabular-nums">
              Sort order: {gw.sortOrder} ·{" "}
              <span className="font-mono">{gw.gatewayType}</span>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 border-t border-border/50 bg-muted/15 pt-4">
              <Button
                variant={gw.isEnabled ? "outline" : "default"}
                size="sm"
                disabled={saving === gw.gatewayType}
                onClick={() => onToggle(gw.gatewayType, gw, "isEnabled")}
                className="w-full"
              >
                {saving === gw.gatewayType
                  ? "Saving…"
                  : gw.isEnabled
                    ? "Disable checkout"
                    : "Enable checkout"}
              </Button>
              <Button
                variant={gw.supplierPayoutSupported ? "outline" : "secondary"}
                size="sm"
                disabled={saving === gw.gatewayType}
                onClick={() => onToggle(gw.gatewayType, gw, "supplierPayoutSupported")}
                className="w-full"
              >
                {gw.supplierPayoutSupported
                  ? "Disable supplier payouts"
                  : "Allow supplier payouts"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {gateways.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/10">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <CreditCard className="size-8 opacity-40" aria-hidden />
            No gateways returned from the API.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
