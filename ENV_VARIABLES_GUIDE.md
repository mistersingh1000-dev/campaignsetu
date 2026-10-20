# Required Environment Variables

## Already Set in Vercel ✅

```
FIREBASE_SERVICE_ACCOUNT = {full JSON service account key}
AUTH_SECRET = your_jwt_secret_key
ADMIN_EMAIL = mistersingh1000@gmail.com
WHATSAPP_WEBHOOK_TOKEN = your_webhook_token
```

## Add These for Payments 💳

```
RAZORPAY_KEY_ID = rzp_live_xxxxxxxxxx (from Razorpay dashboard)
RAZORPAY_KEY_SECRET = xxxxxxxxxxxxxxx (from Razorpay dashboard)
```

## Optional

```
NODE_ENV = production
```

---

## How to Get Razorpay Keys

1. Go to https://dashboard.razorpay.com
2. Settings → API Keys
3. Copy "Key ID" and "Key Secret"
4. Add to Vercel: Settings → Environment Variables
5. Mark both as Sensitive
6. Select Production + Preview
7. Deploy

---

## Testing Razorpay (Sandbox Mode)

Use test card: `4111 1111 1111 1111`  
Expiry: Any future date  
CVV: Any 3 digits

