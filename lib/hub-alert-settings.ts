/** Business hub live alert flags + volume on /business. */
export const HUB_ALERT_FLAGS = {
  /** Default ON — beep when a POS sale completes. */
  beepOnSale: "hub.alerts.beep_on_sale",
  /** Default ON — beep when a supply bill is posted. */
  beepOnSupply: "hub.alerts.beep_on_supply",
} as const;

/** UI percent (1–100). Maps to Web Audio gain via {@link hubChimeGain}. */
export const DEFAULT_HUB_ALERT_VOLUME = 45;

/** Max Web Audio gain at 100% volume. */
export const HUB_CHIME_MAX_GAIN = 0.4;

export type HubAlertSettings = {
  beepOnSale: boolean;
  beepOnSupply: boolean;
  /** Loudness 1–100. */
  volume: number;
};

export const DEFAULT_HUB_ALERTS: HubAlertSettings = {
  beepOnSale: true,
  beepOnSupply: true,
  volume: DEFAULT_HUB_ALERT_VOLUME,
};

export function clampHubAlertVolume(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_HUB_ALERT_VOLUME;
  return Math.max(1, Math.min(100, Math.round(raw)));
}

/** Convert 1–100 volume percent to Web Audio gain. */
export function hubChimeGain(volumePercent: number): number {
  return (clampHubAlertVolume(volumePercent) / 100) * HUB_CHIME_MAX_GAIN;
}

export function hubAlertsFromBusiness(opts: {
  flags?: Record<string, boolean> | null;
  volume?: number | null;
}): HubAlertSettings {
  const ff = opts.flags ?? {};
  return {
    beepOnSale: ff[HUB_ALERT_FLAGS.beepOnSale] !== false,
    beepOnSupply: ff[HUB_ALERT_FLAGS.beepOnSupply] !== false,
    volume: clampHubAlertVolume(
      opts.volume == null ? DEFAULT_HUB_ALERT_VOLUME : opts.volume,
    ),
  };
}

/** @deprecated Prefer {@link hubAlertsFromBusiness}. */
export function hubAlertsFromFlags(
  flags: Record<string, boolean> | null | undefined,
): HubAlertSettings {
  return hubAlertsFromBusiness({ flags });
}
