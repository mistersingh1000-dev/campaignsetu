# CampaignSetu coexistence verification

Status: implementation under review; no successful real-number connection or delivery is claimed.

## Reviewer demonstration

1. Open the deployed site and sign in using a dedicated active reviewer account. Supply credentials privately in Meta reviewer instructions; never commit them here.
2. Open Channels and select the WhatsApp Business App connection option.
3. Complete Meta Embedded Signup with an eligible Business App account and approve sharing only the data the business chooses.
4. Confirm the Business App remains signed in. Do not delete the app or use the standard Cloud API phone registration flow.
5. Confirm the panel shows the correct account and number; a saved account alone is not proof of message delivery.
6. Send a message from another consenting test number. Verify one inbound message and the correct unread count in the panel.
7. Reply from the mobile Business App. Verify one outgoing echo in the same panel conversation, with no inbound automation triggered.
8. Reply from the panel and verify delivery to the test recipient and the mobile app view.
9. Retry a webhook delivery and verify no duplicate echo or unread-count regression.
10. Demonstrate optional contact/history import only after those handlers, subscriptions and explicit business consent have been verified.

## Release gates

- Verify `history`, `smb_app_state_sync` and `smb_message_echoes` subscriptions against the intended Meta app and callback.
- Validate actual Meta payload fixtures, owner routing before signup completion, duplicate handling, large history chunks and replay behavior.
- Keep imported history from triggering automations or granting marketing consent.
- Verify production credential decryption without logging tokens; retain the existing key until representative stored records have been checked.
- Capture the completed flow for the review screencast; do not present a simulated flow as real delivery.
- Supply reviewer access, processor details and processing countries accurately before submission.

Record deployment SHA, Meta app/config IDs, test time and masked phone numbers with each completed acceptance check. Mark failed or blocked checks explicitly.
