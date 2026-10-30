# CRM subscriptions and customer support

CRM subscriptions are separate from existing WhatsApp/API platform subscriptions. No customer phone number is required to use CRM. A customer connects their own Meta assets; +917009732517 is the sales contact, not a shared API sending number. Support email is codecraftm@gmail.com.

| Tier | Monthly INR | Yearly INR | Stored leads | Custom fields | Draft email templates | Facebook Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Basic | 199 | 1999 | 500 | 3 | 3 | 1 |
| Advance | 499 | 3999 | 5000 | 10 | 15 | 3 |
| Pro | 999 | 7999 | 25000 | 30 | 50 | 10 |

Each workspace has one account owner. All tiers include existing pipeline/Kanban, notes, follow-up tasks, tags, CSV export and customer tickets. Pro has priority in the support queue; no response-time SLA is promised. These offers do not include unimplemented team seats, automatic SMTP sending or Meta messaging fees.

New signups receive a server-created seven-day Pro CRM trial, with Pro limits, no card/payment and no automatic charge. A signup cannot choose its tier or extend its expiry. Existing free/paid platform accounts retain their prior CRM access; their current API expiry remains applicable to legacy access. Explicit CRM subscriptions are independent of API access. Suspension blocks writes. Expired CRM accounts can read/export saved leads and access support.

Lead writes (manual and Facebook imports) use a shared transactional stored-record counter. Existing records bootstrap the counter through a server aggregate count. Replayed Facebook lead IDs do not consume quota or overwrite edits. At capacity, new records are rejected; the signed webhook returns retriable failure. Meta retry windows are finite, so customers must upgrade promptly and check/reconcile source leads after a limit interruption. Existing records remain intact; imports are not an unlimited buffer.

Custom field/template limits apply server-side. Existing over-limit configuration after a downgrade is retained and can be edited without increasing counts. Facebook Page mapping claims and per-workspace Page limits are transactional. Customer input cannot set entitlements.

CRM offer IDs are crm_{basic|advance|pro}_{monthly|yearly}. Checkout and manual payment endpoints resolve price and duration from the server catalog. Manual UPI orders require administrator approval; an unverified UTR never grants paid access. Razorpay can activate CRM only after existing payment/signature verification. If online credentials are absent, the instant-checkout UI is hidden. CRM activation changes only crm_* fields and never extends API access. Same-tier renewals extend the remaining paid term; mid-term changes to another tier require a support ticket before payment. These are prepaid periods, not recurring mandates. Calendar renewals clamp month-end dates.

Customers raise and reply to tickets at /dashboard/support. Staff handle them at /admin/tickets. Owners see only their tickets; only the admin endpoint can reply as support. All statuses/actions are validated. Resolution/reopen and timestamped conversation history are stored in Firestore. Creation is rate limited to five tickets/hour and ten open tickets; replies are rate limited and each thread supports 100 messages. No external support email or WhatsApp message is sent by the ticket creation route; users track replies in the panel.

Validation: automated tests cover price periods, trial expiry, concurrent quota limits, Page ownership, settings limits, expired-account support, cross-customer access denial, reply roles, manual approval and idempotent CRM payment activation. A live payment or real Meta lead/number connection is not performed by those tests.
