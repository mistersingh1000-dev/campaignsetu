# Customer-owned Facebook Lead Ads onboarding

Each active customer signs in with Facebook and selects a Page authorized by that Facebook account. Their Page token is encrypted server-side. Page IDs are claimed transactionally by one workspace; a different workspace cannot overwrite that claim or read its token.

## Platform configuration required

- NEXT_PUBLIC_META_APP_ID and META_APP_SECRET: the existing CampaignSetu Meta app.
- NEXT_PUBLIC_SITE_URL: the canonical HTTPS deployment URL.
- FACEBOOK_LEAD_LOGIN_CONFIG_ID: a dedicated Facebook Login for Business configuration that returns a user token, authorizes Pages, and requests pages_show_list, pages_read_engagement, pages_manage_metadata and leads_retrieval. Do not reuse the WhatsApp embedded-signup configuration.
- Add the exact valid OAuth redirect URI: https://campaignsetu.vercel.app/api/crm/facebook/callback (replace canonical origin only if the deployment origin changes).
- Configure and verify the Page leadgen callback: https://campaignsetu.vercel.app/api/webhooks/facebook-leads using FACEBOOK_LEAD_WEBHOOK_TOKEN.
- Verify app publication/review and advanced permission access where required by Meta. Platform configuration alone is not proof that live customer authorization or lead delivery works.

## Data and recovery

- Login state is random, user-bound, cookie-bound, expires after 15 minutes and is consumed once.
- User tokens are used only during server-side Page discovery; staged Page tokens are encrypted and expire after 15 minutes for selection.
- Failed Page subscriptions retain encrypted owner credentials so the same customer can retry without pasting an access token.
- OAuth-state and onboarding documents include expiresAt for a platform administrator to configure Firestore TTL if desired. TTL is not automatically enabled by this code.
- No raw token appears in browser API responses. No manual token field is shown to customers.
- The Page's lastLeadReceivedAt is updated only after an actual signed webhook successfully stores a lead.

## Acceptance checks

1. Customer A logs in and sees only their authorized Pages; customer B cannot select or overwrite A's Page.
2. Verify denied permissions, expired state, repeated callback and missing Page access fail clearly without a connection claim.
3. Connect an eligible Page and confirm its leadgen subscription.
4. Submit a real test Instant Form lead, verify its CRM record and received-lead timestamp, then redeliver the event to check deduplication.
5. Verify a second customer separately. Do not set the pilot Ludhiana Ad Service Page or Codecraftm@gmail.com as a global customer identity.

Automated tests cover protocol and database boundaries using mocks. They do not prove Meta authorization or delivery. As of this change, the dedicated login configuration and a real test lead still require activation/verification.
