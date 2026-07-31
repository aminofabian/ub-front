/** Business hub live alert flags on /business. */
export const HUB_ALERT_FLAGS = {
  /** Default ON — beep when a POS sale completes. */
  beepOnSale: "hub.alerts.beep_on_sale",
  /** Default ON — beep when a supply bill is posted. */
  beepOnSupply: "hub.alerts.beep_on_supply",
} as const;

export type HubAlertSettings = {
  beepOnSale: boolean;
  beepOnSupply: boolean;
};

export const DEFAULT_HUB_ALERTS: HubAlertSettings = {
  beepOnSale: true,
  beepOnSupply: true,
};

export function hubAlertsFromFlags(
  flags: Record<string, boolean> | null | undefined,
): HubAlertSettings {
  const ff = flags ?? {};
  return {
    beepOnSale: ff[HUB_ALERT_FLAGS.beepOnSale] !== false,
    beepOnSupply: ff[HUB_ALERT_FLAGS.beepOnSupply] !== false,
  };
}
