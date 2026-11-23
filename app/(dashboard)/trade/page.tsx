"use client";

import { TradeOnDesktop } from "@/components/wholesale/trade-on-desktop";
import { TradeDesk } from "@/components/wholesale/trade-desk";
import { useFeatureFlags } from "@/components/providers/tenant-provider";
import { DESKTOP_TRADE_SYNC_FLAG } from "@/lib/business-store-type";
import {
  answerSalesOrderOnTill,
  cancelSalesOrderOnTill,
  decideTradeAccountOnTill,
  dispatchSalesOrderOnTill,
  recordSalesReceiptOnTill,
} from "@/lib/api";
import { useDashboard } from "@/components/dashboard-provider";
import { IS_DESKTOP } from "@/lib/runtime";

/**
 * Web: the full trade desk. Desktop till: once trade sync is on, the same orders show here and answering,
 * dispatching and cancelling are queued on the till and applied by the online shop on the next sync.
 * Without the flag, a page that points to the online shop.
 */
export default function TradeDeskRoute() {
  const flags = useFeatureFlags();
  const { business } = useDashboard();
  const host = business?.primaryDomain?.trim() || (business?.slug?.trim() ? `${business.slug.trim()}.kiosk.ke` : "");
  const onlineTradeAddress = host ? `${host}/trade` : undefined;
  if (IS_DESKTOP) {
    if (!flags[DESKTOP_TRADE_SYNC_FLAG]) {
      return <TradeOnDesktop />;
    }
    return (
      <TradeDesk
        pendingSyncNote
        onlineOnlyExtras
        onlineTradeAddress={onlineTradeAddress}
        answerFn={answerSalesOrderOnTill}
        dispatchFn={dispatchSalesOrderOnTill}
        cancelFn={cancelSalesOrderOnTill}
        tillMoney
        decideAccountFn={decideTradeAccountOnTill}
        recordReceiptFn={recordSalesReceiptOnTill}
      />
    );
  }
  return <TradeDesk />;
}
