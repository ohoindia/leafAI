# Public customer pages

Static, unauthenticated HTML pages in `client/public/` are copied into the website build by Vite:

- `/pricing.html`
- `/terms.html`
- `/privacy.html`
- `/refunds.html`
- `/support.html` (privacy requests: `#privacy-requests`)

The pages share `policies.css` and the existing farmer logo. They work without JavaScript. The login-screen footer links to them. For Amplify, ensure existing HTML files are served directly rather than rewritten to the SPA index. The Docker website serves built static files; API-only Lambda deployment does not host these pages.

## Complete before publication

These are explicitly labelled drafts and use `noindex`. Replace all square-bracketed fields, establish an effective date, then remove the draft notice and robots noindex tag from every page after review.

- Confirm operator legal name, correspondence address, monitored support/privacy email, optional phone and support hours. No contact address has been invented.
- Confirm INR pricing and tax inclusion. Prices match existing code: INR 1 introductory month once per account, then INR 99 monthly or INR 999 annually. Weather is exempt from the subscription gate; market and analysis are gated when subscription enforcement is enabled.
- Review the proposed seven-day ordinary refund request window, two-business-day acknowledgement, seven-business-day decision and three-business-day refund initiation targets. These are draft business choices, not implemented backend guarantees. Establish manual refund handling and provider tracking.
- Confirm production hosting/providers, OTP services, international processing, and data categories against the deployed app and SDKs.
- Define record-specific retention, backup expiry, identity verification and account deletion fulfilment. No deletion endpoint or working support intake has been added by these pages. Implement the required in-app deletion request option separately.
- Review terms/privacy with appropriate professional advice and publish matching disclosures in store forms. This content does not itself establish payment-provider or Play Store approval.
- Add Telugu/Hindi or other translations if required by your audience; these pages are English drafts.

## Reference requirements consulted

- [Razorpay merchant terms](https://razorpay.com/terms/) — visible terms and refund/cancellation processing timelines.
- [Google Play user data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en) — privacy, provider disclosures, retention and deletion.
- [Google Play deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) — functioning external and in-app request pathways.
