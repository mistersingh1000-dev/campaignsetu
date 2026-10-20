# Deployment Checklist

## Before Pushing

- ✅ Firebase Firestore database created
- ✅ Firebase service account key in Vercel env vars
- ✅ Webhook token in Vercel env vars
- ✅ All files in place (lib/, app/, components/)
- ✅ package.json has all dependencies

## After Push to GitHub

- ⏳ Wait for Vercel deployment (2-3 min)
- ⏳ Check Vercel Deployments → Ready (green)
- ✅ Test login at https://site.com/
- ✅ Test Chat at https://site.com/dashboard/chat
- ✅ Test Admin at https://site.com/admin
- ✅ Add WHATSAPP_WEBHOOK_TOKEN to Vercel env vars if needed

## Configuration

- Set WHATSAPP_WEBHOOK_TOKEN in Vercel
- Verify webhook URL in Meta Business Platform
- Create admin user (email = ADMIN_EMAIL)

## Ready for Customers

- Customers sign up → 7-day trial
- Connect WhatsApp credentials
- Send/receive messages
- Admin monitors all conversations

