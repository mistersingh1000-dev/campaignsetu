# Codecraft Messaging Hub — Complete Deployment Guide

## ✅ What's Built (Days 1-7)

### Backend
- ✅ Firebase Firestore database (users, conversations, messages, contacts)
- ✅ Auth system (signup, login, session management)
- ✅ Admin panel (manage users, plans, trials)
- ✅ Chat API routes (list conversations, send messages, get history)
- ✅ WhatsApp webhook receiver (incoming messages)
- ✅ WhatsApp send API (send messages to contacts)

### Frontend
- ✅ Chat Dashboard (/dashboard/chat) - view conversations, send messages
- ✅ Admin Panel (/admin) - manage customers
- ✅ Admin Conversations (/admin/conversations) - monitor all chats
- ✅ Navigation updated with Chat tab

### Database Schema
- **users** - customer accounts
- **conversations** - chat threads
- **messages** - individual messages
- **contacts** - customer contacts

---

## 🚀 ONE-COMMAND DEPLOYMENT

### On Your Laptop (when you get to it):

```powershell
cd "C:\My Storage\WEbsite development\whatsapp-connect-pro"
git init
git branch -M main
git remote add origin https://github.com/mistersingh1000-dev/whatsappapi-connect-pro-codecraftmarketing.git
git add -A
git commit -m "Complete chat/inbox platform with WhatsApp integration"
git push -u origin main --force
```

**That's it!** Vercel auto-deploys everything (~2 min).

---

## 📋 Environment Variables (Vercel)

Already set:
- ✅ `FIREBASE_SERVICE_ACCOUNT` (Firebase Admin SDK)
- ✅ `AUTH_SECRET` (JWT session signing)
- ✅ `ADMIN_EMAIL` (admin access control)

**Add these for WhatsApp integration:**
```
WHATSAPP_WEBHOOK_TOKEN=your_secure_webhook_token_here
```

Set it in **Vercel → Settings → Environment Variables**.

---

## 🧪 Testing After Deploy

### 1. Login
- Go to https://whatsappapi-connect-pro-codecraftma.vercel.app/
- Login with credentials

### 2. Chat Dashboard
- Click **"Chat"** in navbar → see inbox

### 3. Admin Panel
- Go to `/admin` → see all customers

### 4. Send WhatsApp Message
- In Chat Dashboard, click a conversation
- Type message, press Send
- Message goes to WhatsApp via their API

### 5. Receive Messages
- When contact replies on WhatsApp
- Message webhook posts to `/api/webhooks/whatsapp`
- Shows in chat dashboard in real-time

---

## 🔌 WhatsApp API Setup (for customer)

Each customer needs to:
1. Get WhatsApp Business Account (WABA) from Meta
2. Generate access token
3. In dashboard, go to "API Setup"
4. Paste Phone Number ID, WABA ID, Access Token
5. Click "Connect"

System saves to database, uses for sending/receiving messages.

---

## 📊 Admin Features

**Manage Customers:**
- View all users
- Change plan (trial → paid → expired)
- Extend trial dates
- Suspend accounts

**Monitor Conversations:**
- View all customer chats
- See unread counts
- Last message preview
- Timestamp

**View User Credentials:**
- Email, name
- Plan status
- WhatsApp connection status
- Signup date

---

## 🔐 Security

- Sessions: 30-day JWT cookies (httpOnly, secure, sameSite=lax)
- Auth: Email + password with bcrypt hashing
- Database: Firebase Firestore with service account
- Middleware: Protects /dashboard, /admin, /api/chat, /api/whatsapp routes
- Trial gating: Prevents expired users from sending messages

---

## 📱 API Endpoints

### Chat
- `GET /api/chat/conversations` — list all
- `GET /api/chat/conversations/[id]` — get one
- `GET /api/chat/conversations/[id]/messages` — get messages (50)
- `POST /api/whatsapp/send-message` — send message to WhatsApp
- `GET /api/chat/contacts` — list contacts
- `POST /api/chat/contacts` — create contact

### WhatsApp
- `GET /api/webhooks/whatsapp` — verify webhook
- `POST /api/webhooks/whatsapp` — receive messages

### Admin
- `GET /api/admin/users` — list all users
- `PATCH /api/admin/users/[email]` — update user

---

## 🎯 Next Steps (Day 8+)

**Optional Enhancements:**
- Message status tracking (sent/delivered/read)
- Bulk message templates
- Scheduled messages
- Contact groups/tags
- Analytics dashboard
- Razorpay payment integration
- Auto-disconnect expired trials
- Rate limiting
- Message search

---

## 📞 Support

**If webhook doesn't receive messages:**
1. Check `WHATSAPP_WEBHOOK_TOKEN` is set in Vercel
2. Verify webhook URL in Meta Business Platform
3. Check Vercel logs: Deployments → Logs

**If can't send messages:**
1. Verify WhatsApp credentials (Phone Number ID, Token)
2. Check trial/paid status (expired users can't send)
3. Verify contact phone format (should be E.164)

---

**🎉 Platform Complete! Ready for customers.**

