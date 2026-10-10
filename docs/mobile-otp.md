# Mobile OTP authentication

Apply database/migrations/005_mobile_otp.sql once to existing installations. New databases use schema.sql.
The migration backfills unique 10-digit Indian phone numbers from users.user_details.phone. Check and assign users.mobile_number for remaining users; unregistered or inactive numbers cannot sign in.

Flow: POST /api/auth/request-otp {mobileNumber}, POST /api/auth/verify-otp {guid,otp,fullName}, then POST /api/auth/login {guid,pin,language}. The PIN is four digits and is stored as an Argon2 hash. Every sign-in currently follows OTP, name, and PIN setup as requested. Existing password login/registration/recovery routes are removed.

ConfigValues and ConfigSecrets have ConfigKey and ConfigValue columns. Secrets override values and are read on each OTP request; SMS settings never come from environment variables. Database connection, JWT signing and storage encryption settings remain in their existing configuration.

Set ConfigValues.OTP_SEND_ENABLED to true or false. False still generates a random OTP and requires verification; it never bypasses authentication or returns the OTP to the browser. For controlled testing, an administrator can read OTPGenerated directly from MobileOTPHistory. Do not disable sending for normal users.

For MSG91 set SMS_PROVIDER=msg91, MSG91_OTP_TEMPLATE_ID and optionally MSG91_OTP_URL in ConfigValues, and MSG91_AUTH_KEY in ConfigSecrets. Uses the same Flow API recipients[{mobiles:91+number,var:otp}] payload as ohoCustomerApp. Configure the template variable as var.
For SMSFresh set SMS_PROVIDER=smsfresh, SMSFRESH_OTP_URL and SMSFRESH_SENDER in ConfigValues, and SMSFRESH_USER and SMSFRESH_PASSWORD in ConfigSecrets. Provider URLs must be HTTPS.

OTPGenerated stores the six-digit OTP visibly as a JSON number, without hashing or encryption. Resend and completion retain this value for inspection; consumed_at and expiry still prevent reuse. Existing encrypted rows remain verifiable. Apply database/migrations/006_remove_otp_hash.sql after 005 on existing databases. OTPs expire after two minutes; requests are limited to five per rolling 24 hours and one per minute. Five wrong verification attempts exhaust a challenge. Successful verification allows five minutes to save the PIN. Resending invalidates previous challenges, and completion consumes the challenge and revokes old sessions. Restrict access to the secret/configuration and OTP tables. Provider credentials must be populated before sending works.
