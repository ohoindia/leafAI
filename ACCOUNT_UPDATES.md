# Krishi Karshak account updates

Client and Expo mobile share the Krishi Karshak name and leaf mark. Account styling follows the OHOCustomer blue and white theme while using plant care content. Existing application IDs and JWT identifiers remain compatible with installed apps and sessions.

## Password recovery configuration

Set `RESET_EMAIL_WEBHOOK_URL` to your HTTPS email delivery service and `RESET_EMAIL_WEBHOOK_SECRET` to a secret of at least 32 characters. The service receives a POST with `Authorization: Bearer <secret>` and JSON `{ to, subject, token, expiresInMinutes }`. It must email the exact token as a copyable recovery code and return a successful HTTP status. No code is returned to the requesting client. Recovery codes expire after 15 minutes and become invalid when the password changes. Unconfigured delivery shows an explicit unavailable message.

No database migration is needed. Profile changes update the existing full name and preferred language fields. Email is read-only. Password changes revoke existing sessions and require a new sign-in.

The OHOCustomer mobile-number/OTP authentication depends on its own services; this app retains its existing email authentication with equivalent recovery and account management steps.
