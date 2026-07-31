import { describe, expect, it } from "bun:test";

import {
  DEFAULT_HUB_ALERTS,
  HUB_ALERT_FLAGS,
  hubAlertsFromFlags,
} from "./hub-alert-settings";

describe("hubAlertsFromFlags", () => {
  it("defaults both beeps on when flags are absent", () => {
    expect(hubAlertsFromFlags(undefined)).toEqual(DEFAULT_HUB_ALERTS);
    expect(hubAlertsFromFlags({})).toEqual(DEFAULT_HUB_ALERTS);
  });

  it("respects explicit false", () => {
    expect(
      hubAlertsFromFlags({
        [HUB_ALERT_FLAGS.beepOnSale]: false,
        [HUB_ALERT_FLAGS.beepOnSupply]: false,
      }),
    ).toEqual({ beepOnSale: false, beepOnSupply: false });
  });

  it("respects explicit true", () => {
    expect(
      hubAlertsFromFlags({
        [HUB_ALERT_FLAGS.beepOnSale]: true,
        [HUB_ALERT_FLAGS.beepOnSupply]: true,
      }),
    ).toEqual({ beepOnSale: true, beepOnSupply: true });
  });
});
