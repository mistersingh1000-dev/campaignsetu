# Firebase Setup (replaces Supabase)

Database: Cloud Firestore, project `whatsapp-connect-pro-api-panel`.
Users are stored in the `users` collection, one document per email.

## Required Vercel environment variable
- `FIREBASE_SERVICE_ACCOUNT` — the FULL JSON of a service-account key.
  Get it: Firebase Console → Project settings (gear) → Service accounts →
  "Generate new private key" → open the downloaded .json in Notepad →
  Ctrl+A, Ctrl+C → paste as the value. Mark Sensitive. Production + Preview.
  (Alternative: `FIREBASE_SERVICE_ACCOUNT_BASE64` with the base64 of that JSON.)

## Other variables still used
- `AUTH_SECRET` — session JWT secret (already set)
- `ADMIN_EMAIL` — who may open /admin (already set)
- `TRIAL_DAYS` — optional, defaults to 7

## Safe to DELETE from Vercel
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Firestore security rules
Keep the default "production mode" (deny all). The app talks to Firestore
with the Admin SDK from the server, which bypasses rules — nothing else
should be able to read the users collection.
