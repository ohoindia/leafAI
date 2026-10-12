# Razorpay subscriptions

Web and mobile use the same billing API and account entitlement. First-time subscribers pay ₹1 upfront for one calendar month (month-end dates are clamped). The selected plan starts one month after checkout creation: ₹99 monthly or ₹999 yearly, automatically debited through the customer's Razorpay mandate. Payment authorization alone does not grant introductory access: the server verifies captured payment and its subscription invoice. The introductory offer is limited to one per account. Returning subscribers pay the normal plan price.

## Account setup

1. Create and activate a Razorpay account and enable Subscriptions and the desired recurring payment methods (including UPI AutoPay where available).
2. In Test Mode, create two INR plans with interval 1: monthly, amount **9900 paise**; yearly, amount **99900 paise**. The backend checks these prices before creating a subscription.
3. Apply `database/migrations/008_subscriptions.sql` and `009_subscription_configuration.sql` to an existing database. Fresh databases include both in `schema.sql`. These migrations have been applied to the configured database.
4. Fill the five entries below in the existing **ConfigSecrets** table. This is the application's secret configuration table (there is no `ClientSecrect` table). Secrets and plan IDs are fetched from the database by the server, including for checkout verification and webhooks. Environment variables are no longer used for Razorpay settings. Never put secret values in `EXPO_PUBLIC_*` or client variables. Migration 009 creates empty placeholders and preserves existing values.

```text
ConfigSecrets.ConfigKey       ConfigSecrets.ConfigValue
RAZORPAY_KEY_ID               your Razorpay key ID
RAZORPAY_KEY_SECRET           your Razorpay API secret
RAZORPAY_WEBHOOK_SECRET       your webhook secret
RAZORPAY_MONTHLY_PLAN_ID      your ₹99 monthly plan ID
RAZORPAY_YEARLY_PLAN_ID       your ₹999 yearly plan ID
```

5. Configure a Razorpay webhook at `https://YOUR_API_HOST/api/billing/webhook` with the same webhook secret. Subscribe to subscription authenticated, activated, charged, pending, halted, paused, resumed, cancelled and completed events. Signature verification uses the original request bytes. Retries and out-of-order deliveries fetch current subscription state rather than trusting the incoming status. Billing status also reconciles hosted-checkout introductory payments through paid invoices.
6. In **ConfigValues**, set the row with `ConfigKey='EnableSubscription'` to `ConfigValue='true'` to require a paid subscription for app features. The TEXT-backed boolean defaults to `false`; only the string `true` enables enforcement. Home displays a subscription message for unsubscribed users. Weather stays available. Market, Analyse Leaf, and other paid feature navigation prompt for a subscription. Login, profile/account controls and billing remain accessible. Set the flag to `false` to disable enforcement. The server reads the database flag on protected requests; signed-in clients refresh status every minute. No restart is required after database configuration changes.
7. Test both plans, the ₹1 capture and mandate authorization, duplicate checkout, invalid signatures, webhook retries, cancellation, expiry, a renewal and a failed renewal. Return to mobile and tap Refresh payment status after hosted checkout. Then replace test keys and plan IDs with Live Mode equivalents and repeat a real transaction before launch.

Cancellation stops future payments immediately and preserves already-paid access until its recorded expiry. Failed renewals do not extend access. Subscriptions have a maximum of 120 monthly or 10 yearly cycles (ten years); a new mandate is required after completion. Switching plans requires cancelling the existing mandate first. Pending checkout authorization expires after one hour. A customer may incur Razorpay's separate mandate authentication charge depending on payment method; confirm the exact test/live checkout total with Razorpay before advertising ₹1 as the complete amount charged.

No live payments have been tested without account credentials. Database migrations 008 and 009 have been applied; `EnableSubscription` remains `false` and Razorpay credential placeholders remain empty. No deployment has been performed.

Reference: [Razorpay subscription API](https://razorpay.com/docs/api/payments/subscriptions/).
