# Billing email eligibility — 2026-10-25

## What happened

A demo/starter shop with no completed sales and a catalogue below the free
allowance received:

> Reminder: renew your Kiosk subscription
> Your demo subscription expired 5 day(s) ago. You have 10 day(s) remaining…

That email comes from the **grace expiry campaign**, not the welcome flow.

The gap:

- `enterGraceIfDue` skipped only an exact `free` tier. New shops are created on
  a paid **starter trial**, so after 30 days they entered grace even with no
  sales and fewer than 300 products.
- `SubscriptionPreExpiryReminderService` had no free/trial usage check at all.
- `SubscriptionExpiryCampaignService` never re-checked eligibility; an active
  campaign continued after a shop changed tier or was a demo.
- A demo tenant on a paid plan was therefore treated as a paying customer.

## Eligibility rule

`SubscriptionBillingEligibilityService.isBillable(business)` returns false when:

- the business is deleted;
- the tier is `free`, empty, or starts with `demo`;
- the slug is `demo`;
- the plan is missing or its monthly price is zero;
- **and** the shop has not outgrown the free allowance:
  - active product count ≤ the free plan's product limit (300), **and**
  - it has never completed a non-voided sale.

A shop becomes billable when it has **more than 300 active products** or at
least **one completed sale**. A free-tier or demo shop is never billable, even
if it somehow exceeds those thresholds.

## Guards added

| Path | Behaviour |
|---|---|
| `SubscriptionBillingService.enterGraceIfDue` | Ineligible shops never enter GRACE or start a campaign. |
| `SubscriptionBillingService.suspendIfGraceEnded` | A stale GRACE row for a now-ineligible shop is returned to ACTIVE, grace is cleared, and campaigns are cancelled. |
| `SubscriptionPreExpiryReminderService` | Ineligible shops record a `SKIPPED — not billable` row; no email. |
| `SubscriptionExpiryCampaignService.startCampaign` | No campaign is created for an ineligible shop. |
| `SubscriptionExpiryCampaignService.processDueCampaigns` | Existing active campaigns for ineligible shops are cancelled before any step runs. |
| `sendSms` / `sendEmail` | Defensive skip with a delivery record if the shop becomes ineligible mid-campaign. |

## Tests

`SubscriptionBillingEligibilityServiceTest` (6):

- free tier never billable;
- demo slug never billable;
- 300 products + no sales → not billable;
- 301 products + no sales → billable;
- 0 products + completed sale → billable;
- zero-priced plan → not billable.

`SubscriptionBillingServiceAutoBlockTest` adds:

- ineligible shop does not enter grace and is not saved.

Billing suite: **30 tests, 0 failures**.

## Files

- `backend/.../billing/application/SubscriptionBillingEligibilityService.java`
- `backend/.../billing/application/SubscriptionBillingService.java`
- `backend/.../billing/application/SubscriptionPreExpiryReminderService.java`
- `backend/.../billing/application/SubscriptionExpiryCampaignService.java`
- `backend/.../sales/repository/SaleRepository.java` (existing count method reused)
- `backend/src/test/java/zelisline/ub/billing/application/SubscriptionBillingEligibilityServiceTest.java`
- `backend/src/test/java/zelisline/ub/billing/application/SubscriptionBillingServiceAutoBlockTest.java`

## Remaining

- A starter shop that is no longer billable still has `subscription_tier=starter`
  and a past `current_period_end`; the billing **UI** may still show a renewal
  card even though no email is sent. The next step is to present that state as
  “Free / not billing yet” and only show renewal for billable shops.
- Existing delivery rows and audit history are not deleted; only future sends
  are stopped.
