# Codecraft Messaging Hub — Production & Meta App Review Readiness

Status: **NOT YET APPROVED / NOT FULLY VERIFIED**. This is an engineering checklist, not a claim of production readiness.

## Verified in repository
- Next.js App Router homepage exists at `app/page.tsx`.
- Meta Embedded Signup UI exists at `components/EmbeddedSignupButton.tsx`.
- Authenticated signup token exchange / provisioning exists at `app/api/embedded-signup/exchange/route.ts`.
- Signed Meta webhook validation exists at `app/api/webhooks/whatsapp/route.ts`.
- Public Privacy Policy, Terms, robots and sitemap routes exist.
- Do not claim these work in production until tested end to end.

## Blockers requiring account owner access
1. **Vercel:** Check project root directory, framework Next.js, production domain assignment, environment variables, and test `/`, `/signup`, `/login`, `/embedded-signup`, `/privacy`, `/terms`. The project owner must restore Vercel connector authorization if API returns 403.
2. **Meta:** Confirm Business Portfolio verification, Tech Provider/Access Verification where applicable, app ownership, Live mode, App Review status and permission access.
3. **Meta permissions:** Request the necessary Advanced Access for `whatsapp_business_management` and `whatsapp_business_messaging` (and any additional permission Meta explicitly requires for the chosen provider model).
4. **Embedded Signup v4:** Confirm the Meta Login for Business configuration is **v4** (v2/v3 onboarding retired October 15, 2026), and ensure the public `NEXT_PUBLIC_META_CONFIG_ID` points to that configuration. Do not assume `sessionInfoVersion: "3"` means the signup flow version.
5. **Production secrets:** Set `AUTH_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID`, `META_APP_SECRET`, `WHATSAPP_WEBHOOK_TOKEN`, and canonical `NEXT_PUBLIC_SITE_URL` in Vercel; never put values in Git or support chats.
6. **Webhook:** Set Meta callback URL to the deployed `/api/webhooks/whatsapp` route, verify the GET challenge, subscribe the correct WABA, and confirm signed POST delivery.
7. **E2E test:** Use a designated test business/number to complete Embedded Signup, phone registration, inbound/outbound messages, approved template messaging, STOP handling, and automation. Capture redacted screen recordings for App Review.
8. **Google Safe Browsing:** Verify Search Console property, inspect Security Issues, remove any flagged content or compromised scripts, and submit review **only after remediation**. A screenshot with no browser warning is not proof of clearance.
9. **Legal:** Review Privacy Policy, retention/deletion process, data deletion instructions, Terms, and business contact information for accuracy before submitting.
10. **Billing:** Validate payment gateway/KYC and refund disclosures separately; payment approval is not Meta API approval.

## Meta review evidence
- App name and business details matching legal records.
- Live HTTPS domain and working privacy policy URL.
- Walkthrough video of customer onboarding through Meta-hosted flow.
- Walkthrough of messaging use case, consent and approved templates.
- Explanation of how each requested permission is used and how data is secured.
- Working test account / test instructions if Meta requests them.

## Release gate
Do **not** advertise the platform as Meta-approved, officially affiliated, or fully operational until verification, App Review, and live integration tests pass.

Official reference: https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup
