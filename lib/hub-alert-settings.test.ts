import { describe, expect, it } from "bun:test";

import {
  DEFAULT_HUB_ALERTS,
  DEFAULT_HUB_ALERT_VOLUME,
  HUB_ALERT_FLAGS,
  HUB_CHIME_MAX_GAIN,
  clampHubAlertVolume,
  hubAlertsFromBusiness,
  hubAlertsFromFlags,
  hubChimeGain,
} from "./hub-alert-settings";

describe("hubAlertsFromBusiness", () => {
  it("defaults both beeps on and default volume when absent", () => {
    expect(hubAlertsFromBusiness({})).toEqual(DEFAULT_HUB_ALERTS);
    expect(hubAlertsFromFlags(undefined)).toEqual(DEFAULT_HUB_ALERTS);
  });

  it("respects explicit false flags and volume", () => {
    expect(
      hubAlertsFromBusiness({
        flags: {
          [HUB_ALERT_FLAGS.beepOnSale]: false,
          [HUB_ALERT_FLAGS.beepOnSupply]: false,
        },
        volume: 80,
      }),
    ).toEqual({ beepOnSale: false, beepOnSupply: false, volume: 80 });
  });

  it("clamps volume", () => {
    expect(clampHubAlertVolume(0)).toBe(1);
    expect(clampHubAlertVolume(150)).toBe(100);
    expect(clampHubAlertVolume(Number.NaN)).toBe(DEFAULT_HUB_ALERT_VOLUME);
  });

  it("maps volume percent to gain", () => {
    expect(hubChimeGain(100)).toBeCloseTo(HUB_CHIME_MAX_GAIN);
    expect(hubChimeGain(45)).toBeCloseTo(0.45 * HUB_CHIME_MAX_GAIN);
  });
});
