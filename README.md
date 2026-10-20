# Codecraft Messaging Hub

A premium, conversion-focused marketing site for an **official WhatsApp Business API provider**, built with Next.js 15 (App Router), TypeScript and Tailwind CSS. Includes Meta Embedded Signup integration, a dashboard demo, pricing with Razorpay placeholders, and full SEO.

## ✨ Highlights

- **10 pages** — Home, Features, Pricing, API Setup, Embedded Signup, Dashboard Demo, Contact, FAQ, Terms, Privacy (+ Login)
- **Animated hero** — live WhatsApp chat with read-receipt ticks turning blue (the signature element)
- **Dark / light theme** with no-flash toggle, glassmorphism, scroll reveals, counters, floating WhatsApp button
- **Meta Embedded Signup** button with real Facebook JS SDK sample
- **Razorpay** checkout placeholders on every plan
- **SEO** — metadata, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`
- Fully responsive, accessible focus states, `prefers-reduced-motion` respected

## 🧱 Tech stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 3 · `next/font` (Space Grotesk, Inter, JetBrains Mono)

## 🚀 Getting started

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

## 🔑 Environment variables

See `.env.example`. Key ones:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_META_APP_ID` | Meta app id for Embedded Signup |
| `NEXT_PUBLIC_META_CONFIG_ID` | Embedded Signup configuration id |
| `META_APP_SECRET` | Validate webhook signatures (server only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (server only) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO |

Until Meta keys are set, the Embedded Signup button runs in **demo mode**.

## 🔌 Where to wire real logic

- `components/PricingCards.tsx` → `handleBuy()`: create a Razorpay order, open checkout, verify signature, then provision login credentials.
- `components/EmbeddedSignupButton.tsx` → exchange the returned `code` for a business token and register the phone number.
- `components/ContactForm.tsx` → POST to your email/CRM endpoint.
- `app/api-setup/page.tsx` → includes copy-paste send-message and webhook handlers.

## ☁️ Deploy

**GitHub**

```bash
git init && git add . && git commit -m "Codecraft Messaging Hub"
git branch -M main
git remote add origin https://github.com/<you>/whatsapp-connect-pro.git
git push -u origin main
```

**Vercel** — import the repo at [vercel.com/new](https://vercel.com/new), add the env vars from `.env.example`, and deploy. Zero extra config.

## ⚖️ Note

Independent provider — not affiliated with or endorsed by Meta. Legal pages are templates; have them reviewed before publishing.

## 🆓 7-day free trial (built in)

Visitors can self-serve a free trial:

- `/signup` issues a **signed session token** whose expiry is set to 7 days out.
- `middleware.ts` protects `/dashboard` and `/api/whatsapp/*`. When the token expires the user is **auto-disconnected** — redirected to `/login?expired=1` and the cookie is cleared.
- The dashboard shows a live "X days left" banner with Upgrade / Log out.
- `/api/whatsapp/send` is trial-gated; set `WHATSAPP_TRIAL_PHONE_NUMBER_ID` + `WHATSAPP_TRIAL_TOKEN` to let trial users send real messages through a shared number.

Set `AUTH_SECRET` (run `openssl rand -base64 32`) and `TRIAL_DAYS` in your env.

### Going to production (add a database)

The trial works statelessly, but real multi-user login and **preventing repeat trials** need a database. The integration points are marked `DATABASE INTEGRATION POINT` in `app/api/auth/signup/route.ts` and `login/route.ts`. Recommended free option: **Supabase** or **Vercel Postgres** — store users with a hashed password and a `trial_used` flag, verify on login, and re-issue the session.
