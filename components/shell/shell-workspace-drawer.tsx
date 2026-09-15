"use client";

import { Suspense, useMemo, useState } from "react";
import {
  ClipboardList,
  CreditCard,
  PackageCheck,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";

import { FormDrawer } from "@/components/form-drawer";
import { BusinessSettingsForm } from "@/components/business/business-settings-form";
import { BusinessConfigurationForm } from "@/components/business/business-configuration-form";
import { CreditActivityPage } from "@/components/credits/credit-activity-page";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
import { useDashboard } from "@/components/dashboard-provider";
import { TenantOrderWorkspace } from "@/app/(dashboard)/order/_components/tenant-order-workspace";
import { OrderReceivePageClient } from "@/app/(dashboard)/order/receive/order-receive-page-client";
import { type ShellWorkspaceId } from "@/lib/shell-workspaces";
import { cn } from "@/lib/utils";

export type { ShellWorkspaceId };

const META: Record<
  ShellWorkspaceId,
  { title: string; description: string; icon: typeof ShoppingCart }
> = {
  order: {
    title: "Order",
    description: "Place purchase orders from your suppliers.",
    icon: ShoppingCart,
  },
  receive: {
    title: "Receive",
    description: "Confirm goods in against an order or walk-in.",
    icon: PackageCheck,
  },
  credits: {
    title: "On tab",
    description: "Collect, remind, or freeze customer credit.",
    icon: CreditCard,
  },
  settings: {
    title: "Settings",
    description: "Shop identity and storefront.",
    icon: Settings2,
  },
  configuration: {
    title: "How the shop runs",
    description: "Inventory, till, and operations switches.",
    icon: SlidersHorizontal,
  },
};

function DrawerBodySkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true">
      <div className="h-8 w-1/2 animate-pulse bg-muted" />
      <div className="h-24 animate-pulse border border-border bg-muted/40" />
      <div className="h-40 animate-pulse border border-border bg-muted/30" />
    </div>
  );
}

function SettingsWorkspaceBody({ onClose }: { onClose: () => void }) {
  const editor = useBusinessSettingsEditor();
  const { business } = useDashboard();

  if (!editor.canManageBusinessSettings) {
    return (
      <p className="p-4 text-[13px] text-muted-foreground">
        You need permission to manage business settings.
      </p>
    );
  }

  if (editor.isLoading) {
    return <DrawerBodySkeleton />;
  }

  return (
    <div className="px-3 pb-8 pt-2 sm:px-4">
      {editor.feedback ? (
        <p
          className={cn(
            "mb-3 border px-3 py-2 text-[13px]",
            editor.feedback.kind === "error"
              ? "border-destructive/40 text-destructive"
              : "border-border text-foreground",
          )}
        >
          {editor.feedback.text}
        </p>
      ) : null}
      <BusinessSettingsForm
        editable={editor.editable}
        setEditable={editor.setEditable}
        storefront={editor.storefront}
        setStorefront={editor.setStorefront}
        inventory={editor.inventory}
        setInventory={editor.setInventory}
        posDrafts={editor.posDrafts}
        setPosDrafts={editor.setPosDrafts}
        cashierCapabilities={editor.cashierCapabilities}
        setCashierCapabilities={editor.setCashierCapabilities}
        shiftSettings={editor.shiftSettings}
        setShiftSettings={editor.setShiftSettings}
        activeBranches={editor.activeBranches}
        canManageBusinessSettings={editor.canManageBusinessSettings}
        isSaving={editor.isSaving}
        storefrontNeedsBranch={editor.storefrontNeedsBranch}
        variant="profile"
        logoUrl={business?.branding?.logoUrl}
        brandPrimary={business?.branding?.primaryColor}
        currency={business?.currency}
        businessId={business?.id}
        onSubmit={(event) => {
          event.preventDefault();
          void editor.save("profile");
        }}
        onCancel={() => {
          editor.resetFormFromSnapshot();
          onClose();
        }}
        onRemoveDeliveryArea={editor.removeDeliveryArea}
      />
    </div>
  );
}

function ConfigurationWorkspaceBody({ onClose }: { onClose: () => void }) {
  const editor = useBusinessSettingsEditor();
  const { canManageCreditSettings } = useDashboard();
  const [workspace, setWorkspace] = useState<"inventory" | "till">("inventory");

  if (!editor.canManageBusinessSettings) {
    return (
      <p className="p-4 text-[13px] text-muted-foreground">
        You need permission to change how the shop runs.
      </p>
    );
  }

  if (editor.isLoading) {
    return <DrawerBodySkeleton />;
  }

  return (
    <div className="px-3 pb-8 pt-2 sm:px-4">
      <div className="mb-3 flex gap-1.5">
        {(
          [
            { id: "inventory" as const, label: "Inventory" },
            { id: "till" as const, label: "Till" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setWorkspace(tab.id)}
            className={cn(
              "h-9 border px-3 text-[12px] font-semibold",
              workspace === tab.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {editor.feedback ? (
        <p
          className={cn(
            "mb-3 border px-3 py-2 text-[13px]",
            editor.feedback.kind === "error"
              ? "border-destructive/40 text-destructive"
              : "border-border text-foreground",
          )}
        >
          {editor.feedback.text}
        </p>
      ) : null}
      <BusinessConfigurationForm
        workspace={workspace}
        inventory={editor.inventory}
        setInventory={editor.setInventory}
        posDrafts={editor.posDrafts}
        setPosDrafts={editor.setPosDrafts}
        cashierCapabilities={editor.cashierCapabilities}
        setCashierCapabilities={editor.setCashierCapabilities}
        shiftSettings={editor.shiftSettings}
        setShiftSettings={editor.setShiftSettings}
        tillListen={editor.tillListen}
        setTillListen={editor.setTillListen}
        hubAlerts={editor.hubAlerts}
        setHubAlerts={editor.setHubAlerts}
        activeBranches={editor.activeBranches}
        defaultBranchId={
          editor.storefront.catalogBranchId ||
          editor.activeBranches[0]?.id ||
          null
        }
        isSaving={editor.isSaving}
        canEditWhatsAppAlerts={canManageCreditSettings}
        onSubmit={(event) => {
          event.preventDefault();
          void editor.save("operations");
        }}
        onCancel={() => {
          editor.resetFormFromSnapshot();
          onClose();
        }}
      />
    </div>
  );
}

type ShellWorkspaceDrawerProps = {
  workspace: ShellWorkspaceId | null;
  onClose: () => void;
};

export function ShellWorkspaceDrawer({
  workspace,
  onClose,
}: ShellWorkspaceDrawerProps) {
  const open = workspace != null;
  const meta = workspace ? META[workspace] : null;
  const Icon = meta?.icon ?? ClipboardList;

  const body = useMemo(() => {
    if (!workspace) return null;
    switch (workspace) {
      case "order":
        return (
          <Suspense fallback={<DrawerBodySkeleton />}>
            <div className="min-h-0 flex-1 overflow-auto">
              <TenantOrderWorkspace />
            </div>
          </Suspense>
        );
      case "receive":
        return (
          <div className="min-h-0 flex-1 overflow-auto">
            <OrderReceivePageClient />
          </div>
        );
      case "credits":
        return (
          <div className="min-h-0 flex-1 overflow-auto px-2 sm:px-3">
            <CreditActivityPage embedded />
          </div>
        );
      case "settings":
        return (
          <div className="min-h-0 flex-1 overflow-auto">
            <SettingsWorkspaceBody onClose={onClose} />
          </div>
        );
      case "configuration":
        return (
          <div className="min-h-0 flex-1 overflow-auto">
            <ConfigurationWorkspaceBody onClose={onClose} />
          </div>
        );
      default:
        return null;
    }
  }, [workspace, onClose]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={meta?.title ?? "Workspace"}
      description={meta?.description}
      icon={<Icon className="size-4" aria-hidden />}
      width="full"
      appearance="sharp"
      headerDensity="compact"
      bodyLayout="fill"
    >
      {body}
    </FormDrawer>
  );
}
