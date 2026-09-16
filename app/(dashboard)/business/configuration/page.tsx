"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Palette,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import { BusinessConfigurationForm } from "@/components/business/business-configuration-form";
import {
  BUSINESS_CONFIGURATION_NAV,
  BUSINESS_OPS_ALERT_NAV,
  type ConfigurationWorkspace,
} from "@/components/business/business-settings-nav";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
} from "@/components/dashboard-page-ui";
import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { Button } from "@/components/ui/button";
import { useBusinessSettingsEditor } from "@/hooks/use-business-settings-editor";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function workspaceFromHash(hash: string): ConfigurationWorkspace {
  const id = hash.replace(/^#/, "");
  if (id === BUSINESS_OPS_ALERT_NAV.id) return "till";
  const item = BUSINESS_CONFIGURATION_NAV.find((nav) => nav.id === id);
  if (item?.group === "Till") return "till";
  return "inventory";
}

function sectionFromHash(hash: string): string | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (
    BUSINESS_CONFIGURATION_NAV.some((item) => item.id === id) ||
    id === BUSINESS_OPS_ALERT_NAV.id
  ) {
    return id;
  }
  return null;
}

export default function BusinessConfigurationPage() {
  const router = useRouter();
  const editor = useBusinessSettingsEditor();
  const { canManageCreditSettings } = useDashboard();
  const [workspace, setWorkspace] =
    useState<ConfigurationWorkspace>("inventory");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      setWorkspace(workspaceFromHash(hash));
      const id = sectionFromHash(hash);
      if (id) setActiveSection(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const enabledCount = useMemo(() => {
    if (workspace === "inventory") {
      return [
        editor.inventory.showSystemStockToStockManager,
        editor.inventory.allowStockEditForStockManager,
        editor.inventory.allowStockPageForStockManager,
        editor.inventory.allowActivityForStockManager,
        editor.inventory.allowStockEditForGroceryClerk,
        editor.inventory.allowSpoilsForGroceryClerk,
        editor.inventory.allowMinStockForGroceryClerk,
        editor.inventory.allowParLevelForGroceryClerk,
        editor.inventory.allowOrderPadForGroceryClerk,
        editor.inventory.allowOrderConfirmForGroceryClerk,
        editor.inventory.allowNegativeStock,
        editor.inventory.allowReceiveForStockManager,
        editor.inventory.allowReceiveForCashier,
        editor.inventory.allowCashierTabClearance,
        editor.inventory.allowCashierSearchCustomersByName,
        editor.inventory.allowSupplierWriteForStockManager,
        editor.inventory.allowSupplierWriteForCashier,
        editor.inventory.allowLinkProductsForStockManager,
        editor.inventory.allowLinkProductsForCashier,
      ].filter(Boolean).length;
    }
    return [
      editor.shiftSettings.prefillOpeningFromLastClose,
      editor.cashierCapabilities.priceEdit,
      editor.cashierCapabilities.createProduct,
      editor.cashierCapabilities.weighedToggle,
      editor.cashierCapabilities.addPhoto,
      editor.cashierCapabilities.orderPad,
      editor.cashierCapabilities.orderConfirm,
      editor.cashierCapabilities.drawout,
      editor.cashierCapabilities.catalogHybrid,
      editor.posDrafts.enabled,
      editor.posDrafts.uiVisible,
      editor.tillListen.checkout,
      editor.tillListen.openCart,
      editor.tillListen.mpesaSelected,
      editor.tillListen.storefront,
    ].filter(Boolean).length;
  }, [
    workspace,
    editor.inventory,
    editor.shiftSettings,
    editor.cashierCapabilities,
    editor.posDrafts,
    editor.tillListen,
  ]);

  if (!editor.canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Configuration"
        description="You need permission to manage business configuration."
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  if (editor.isLoading) {
    return <BusinessSettingsSkeleton />;
  }

  if (editor.loadFailed && !editor.effectiveSnapshot) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-none border border-destructive/30 bg-destructive/5 p-8 text-center shadow-none">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Could not load configuration
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {editor.feedback?.text}
          </p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => {
              editor.setLoadFailed(false);
              editor.setFeedback(null);
              void editor.load();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_MAX_WIDE, "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8")}>
      <DashboardPageHero
        icon={SlidersHorizontal}
        eyebrow="Operations"
        title="Configuration"
        description="Inventory rules and till permissions — flip policies with clear switches."
      >
        <DashboardQuickLinks
          compact
          links={[
            {
              href: APP_ROUTES.businessSettings,
              label: "Settings",
              desc: "Profile & storefront",
              icon: ArrowLeft,
            },
            {
              href: APP_ROUTES.businessBranding,
              label: "Branding",
              desc: "Logo & colors",
              icon: Palette,
            },
            {
              href: APP_ROUTES.business,
              label: "Business",
              desc: "Morning board",
              icon: Building2,
            },
          ]}
        />
      </DashboardPageHero>

      {editor.feedback ? (
        <DashboardFeedback
          kind={editor.feedback.kind === "error" ? "error" : "success"}
          text={editor.feedback.text}
        />
      ) : null}

      <BusinessConfigurationForm
        useTheatreLayout
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        enabledPolicyCount={enabledCount}
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
          router.push(APP_ROUTES.business);
        }}
      />
    </div>
  );
}
