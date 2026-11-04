# CampaignSetu — WhatsApp Platform + Lead CRM

This is the **existing CampaignSetu repository**, not the separate Ludhiana Ad Service CRM project.

## Implemented in source
- WhatsApp Business Platform Embedded Signup and Business App coexistence onboarding logic.
- Customer chat inbox, contacts, webhook ingestion, delivery statuses and rule-based automated replies.
- Facebook Lead Ads Page authorization, signed leadgen webhook ingestion and CRM pipeline.
- Customer CRM plans, trials, support tickets, encrypted credentials and admin tools.
- Form lead intelligence: up to five non-identity custom answers, Hot/Warm/Cold scoring, next action and reviewable reply draft.

Form leads are **not automatically sent WhatsApp messages**; that requires approved templates, consent, a connected official API and an appropriate messaging window.
Form scoring never marks a payment as confirmed or a sale Won.

## Verify
Run `npm ci`, `node --test tests/*.test.cjs`, and `npm run build`.
The `/api/health` route is liveness only; a READY deployment is not proof of working integrations.

## Existing project
- Repository: https://github.com/mistersingh1000-dev/campaignsetu
- Main site: https://campaignsetu.vercel.app
- Vercel project: campaignsetu

## External production checks still required
Meta App Review and publication, real customer WhatsApp coexistence onboarding, history/contact/mobile echo sync, real signed Facebook lead event, messaging delivery, and payment-provider approval/testing are not proven by source tests.
Do not claim Meta approval or live customer delivery without evidence.

See docs/META_APPROVAL_READINESS.md, docs/coexistence-reviewer-validation.md, docs/facebook-customer-onboarding.md and docs/meta-review-evidence-pack.md.
Never commit credentials or customer records. Preserve the current Firebase database and encryption key.
