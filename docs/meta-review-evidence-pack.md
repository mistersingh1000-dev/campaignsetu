# CampaignSetu Meta review evidence pack

Prepared 2026-11-01. This is a preparation record, not a completed screencast or an approval claim. Production code baseline: f001ae283472883ac39d7100fc79bd546022d618.

## Review state verified in the Meta dashboard

- App: CampaignSetu, 28981912631492578. Review draft: 28981929714824203.
- Business portfolio: Ludhiana ad service, 27709918332000578. Business verification is for CODE CRAFT MARKETING and remains In review. Do not substitute CampaignSetu as a registered legal company.
- Data controller confirmed by the owner and saved in the draft: Manpreet Singh, India.
- Owner confirms no national-security disclosure during the preceding 12 months and no written public-authority request process. Keep No and None of the above; do not claim an unimplemented policy.
- Both WhatsApp permission descriptions are saved. Messaging and management API-test requirements display Completed; this is not proof of live delivery.
- Owner explicitly authorized both WhatsApp allowed-use agreements; both were checked, saved and visually verified.
- The isolated non-admin reviewer workspace exists. Its credentials belong only in the private Meta reviewer instructions. Never include credentials in this repository, recordings or customer materials.
- Facebook Page Ludhiana ad service is subscribed in the owner workspace; the UI explicitly reports test lead not yet verified. The existing CRM sample is Manual and must never be described as a Facebook-imported lead.
- App remains unpublished and final review submission has not occurred.

## Processor inventory and unresolved locations

| Provider | Observed use | Platform Data exposure | Location evidence / remaining check |
| --- | --- | --- | --- |
| Vercel | Hosts Next.js APIs and signed webhook processing | Account identifiers, lead/contact/message payloads and encrypted credentials pass through the runtime; logs may contain operational identifiers | Existing production deployment uses iad1 (United States). Provider DPA permits other international operations. Verify all applicable processing and remote-access countries before completing Meta's all-countries field. |
| Google Cloud / Firebase Firestore | Persists workspaces, leads, contacts, messages, asset mappings and encrypted credentials | Stores Meta-derived data | Read-only Firestore database metadata verified on 2026-11-01: locationId asia-south1, FIRESTORE_NATIVE, STANDARD edition. Google maps asia-south1 to Mumbai, India. Applicable provider processing/remote-access locations still need verification; the at-rest location does not establish an India-only processing guarantee. |
| Resend | Transactional account, password recovery, order and activation emails | Code paths inspected do not send lead/message records to Resend; user-entered contact enquiries may contain personal information | Inventory as an application provider. Determine whether any deployed email path actually receives Meta-derived data before including/excluding it in the Meta Platform Data declaration. Environment key presence does not prove sender delivery is verified. |
| GitHub | Source repository and CI | Source is not intended to include customer Platform Data, live tokens or credentials | Not a customer-data store in the inspected architecture. Reassess if logs or fixtures change. |

Official references checked during preparation:

- https://vercel.com/legal/dpa (international processing provisions)
- https://vercel.com/legal/sub-processors (redirects to Vercel Trust Center)
- https://firebase.google.com/support/privacy (location selection and processing)
- https://firebase.google.com/docs/firestore/locations (asia-south1 is Mumbai)
- https://firebase.google.com/terms/subprocessors
- https://cloud.google.com/terms/subprocessors (service-specific and support-access distinctions)

Meta asks for every processing country, including remote access. Provider headquarters and a single deployment region are insufficient evidence. Do not mark this form complete while the location inventory is unresolved.

## Genuine Facebook review recording shot list

1. Use an isolated customer workspace and authorized test Page; hide passwords, cookies, tokens and unrelated business assets.
2. Show Lead CRM and its Facebook connection explanation before authorization.
3. Show Meta Login for Business, the four requested Page permissions and the customer's deliberate Page selection. Permission grants require the account owner's confirmation.
4. Return to CampaignSetu, select the authorized Page and show Subscribed.
5. Use Meta's actual lead-testing tool for an accessible Instant Form. Record the generated lead's time/ID privately. A generic dashboard webhook payload is not a real lead-retrieval test.
6. Show exactly one matching lead in the correct customer CRM with Facebook Lead Ads as its source; repeat delivery to demonstrate deduplication only if supported and safe.
7. Demonstrate pipeline, note and follow-up updates on that test lead. Do not expose real customer information.
8. Record any unpublished-app delivery restriction as blocked. Do not replace the missing import with a manually created record.

## Genuine WhatsApp review recording shot list

1. Open Channels and the Business App coexistence connection entry point.
2. Complete the actual Meta flow with an eligible, explicitly authorized Business App number. Keep the mobile app installed and signed in. Do not use standard registration as a workaround.
3. If Meta says the business cannot onboard customers, record that blocker and stop the connection demonstration. Do not claim connection from Facebook login alone.
4. Once connection succeeds, verify displayed account/number and requested webhook subscriptions.
5. Use a consenting second test number. Show inbound message in the panel, a mobile-sent echo once in the same thread, and a panel reply delivered to the recipient. Record timestamps and masked numbers.
6. Show opted-in template workflow only with actual Meta-approved templates and consent. A lead form submission does not create WhatsApp marketing consent or open a reply window.
7. Show optional history/contact consent and sync status. Historical imports must not fire chatbot replies or change opt-out records.

## Recording acceptance checklist

- Real continuous UI interaction, readable navigation and permission labels; no fabricated success screens.
- Credentials and other customers' data excluded. Reviewer account remains non-admin and empty apart from explicitly created test records.
- Voice-over/captions identify the permission and corresponding functionality.
- Keep recordings separate when a permission requires a different flow. Match reviewer instructions to the recorded build.
- Review the uploaded file and privately test reviewer access before submission.
- Required files, declarations and business verification must all satisfy the live dashboard before Submit for review is available.

## Remaining release gates

Processor-country verification; genuine Facebook and WhatsApp recordings; real Instant Form import; real mobile-panel delivery; reviewer-login validation; final review submission/publication; and a genuine UPI receipt followed by administrator approval. Automated payment tests and QR decoding do not prove real bank receipt. Never create a fictitious paid production order to complete this gate.
