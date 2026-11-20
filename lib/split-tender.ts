/** Amounts within this of a shilling boundary are the same tender. */
const MONEY_TOLERANCE = 0.001;

export type SplitSettlement = {
  wallet: number;
  mpesa: number;
  /** Cash that stays in the drawer and is posted on the sale. */
  cashApplied: number;
  /** Notes the customer handed over. */
  cashTendered: number;
  /** Notes minus the cash that stays. Zero when the cash covers its share exactly. */
  change: number;
  /** Still unpaid after wallet, M-Pesa, and the cash that was actually handed over. */
  tab: number;
  /**
   * Extra that is not change: M-Pesa or wallet already past the bill,
   * or cash typed when nothing was left to pay in cash.
   */
  overBy: number;
};

function roundMoney2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function money(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return roundMoney2(amount);
}

/**
 * Split the bill. Wallet and M-Pesa are exact. Cash is the notes handed over:
 * anything above the cash share is change to give back.
 */
export function settleSplitTender(input: {
  total: number;
  wallet: number;
  cash: number;
  mpesa: number;
}): SplitSettlement {
  const total = money(input.total);
  const wallet = money(input.wallet);
  const cash = money(input.cash);
  const mpesa = money(input.mpesa);
  const nonCash = roundMoney2(wallet + mpesa);

  if (nonCash > total + MONEY_TOLERANCE) {
    return {
      wallet,
      mpesa,
      cashApplied: 0,
      cashTendered: cash,
      change: 0,
      tab: 0,
      overBy: roundMoney2(nonCash + cash - total),
    };
  }

  const cashShare = roundMoney2(total - nonCash);
  if (cashShare <= MONEY_TOLERANCE) {
    return {
      wallet,
      mpesa,
      cashApplied: 0,
      cashTendered: cash,
      change: 0,
      tab: 0,
      overBy: cash > MONEY_TOLERANCE ? cash : 0,
    };
  }

  if (cash + MONEY_TOLERANCE >= cashShare) {
    return {
      wallet,
      mpesa,
      cashApplied: cashShare,
      cashTendered: cash,
      change: roundMoney2(cash - cashShare),
      tab: 0,
      overBy: 0,
    };
  }

  return {
    wallet,
    mpesa,
    cashApplied: cash,
    cashTendered: cash,
    change: 0,
    tab: roundMoney2(cashShare - cash),
    overBy: 0,
  };
}
