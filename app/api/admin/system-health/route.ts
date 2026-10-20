import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function flag(name: string): boolean {
  return ["1", "true", "yes", "on"].includes(String(process.env[name] || "").toLowerCase());
}

function databaseReady(): boolean {
  try {
    return Boolean(getDb());
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const firebaseConfigured = Boolean(
    configured("FIREBASE_SERVICE_ACCOUNT") || configured("FIREBASE_SERVICE_ACCOUNT_BASE64")
  );
  const providerMode = flag("META_PROVIDER_MODE_ENABLED");
  const creditLineMode = flag("META_PROVIDER_CREDIT_LINE_ENABLED");
  const trialDays = Number(process.env.TRIAL_DAYS || 7);

  const checks = [
    {
      id: "auth",
      label: "Authentication secret",
      configured: configured("AUTH_SECRET"),
      required: true,
      help: "Required to sign customer login sessions safely in production.",
    },
    {
      id: "trial",
      label: "7-day free trial",
      configured: trialDays === 7,
      required: true,
      help: `TRIAL_DAYS is currently ${Number.isFinite(trialDays) ? trialDays : "invalid"}. Your business rule is exactly 7 days.`,
    },
    {
      id: "firebase",
      label: "Firebase service account",
      configured: firebaseConfigured && databaseReady(),
      required: true,
      help: "Required for users, conversations, contacts, orders, campaigns and automations.",
    },
    {
      id: "credential-encryption",
      label: "Credential encryption key",
      configured: configured("CREDENTIAL_ENCRYPTION_KEY"),
      required: true,
      help: "Encrypts customer WhatsApp access tokens and registration metadata at rest.",
    },
    {
      id: "site-url",
      label: "Production site URL",
      configured: configured("NEXT_PUBLIC_SITE_URL"),
      required: true,
      help: "Used for canonical links, password reset links and provider callbacks.",
    },
    {
      id: "admin-email",
      label: "Admin account email",
      configured: configured("ADMIN_EMAIL") || configured("ADMIN_EMAILS"),
      required: true,
      help: "Controls access to owner/admin pages. No hardcoded production fallback is used.",
    },
    {
      id: "meta-app-id",
      label: "Meta App ID",
      configured: configured("NEXT_PUBLIC_META_APP_ID"),
      required: true,
      help: "Required by Facebook Login for Business / Embedded Signup.",
    },
    {
      id: "meta-config-id",
      label: "Embedded Signup configuration ID",
      configured: configured("NEXT_PUBLIC_META_CONFIG_ID"),
      required: true,
      help: "Required to launch your Meta Embedded Signup configuration.",
    },
    {
      id: "meta-app-secret",
      label: "Meta App Secret",
      configured: configured("META_APP_SECRET"),
      required: true,
      help: "Used server-side for authorization and webhook signature verification.",
    },
    {
      id: "webhook-token",
      label: "WhatsApp webhook verify token",
      configured: configured("WHATSAPP_WEBHOOK_TOKEN"),
      required: true,
      help: "Required when Meta verifies the webhook subscription endpoint.",
    },
    {
      id: "email",
      label: "Email notifications",
      configured: configured("RESEND_API_KEY") && configured("EMAIL_FROM"),
      required: false,
      help: "Recommended for password reset, payment and plan-activation emails.",
    },
    {
      id: "razorpay",
      label: "Automatic Razorpay checkout",
      configured: configured("RAZORPAY_KEY_ID") && configured("RAZORPAY_KEY_SECRET"),
      required: false,
      help: "When configured, customers can pay online and activate their plan after signed payment verification. Manual UPI remains available as fallback.",
    },
    {
      id: "razorpay-webhook",
      label: "Razorpay webhook secret",
      configured: configured("RAZORPAY_WEBHOOK_SECRET"),
      required: false,
      help: "Recommended for server-to-server payment recovery if the customer closes checkout before browser verification finishes.",
    },
    {
      id: "provider-mode",
      label: "Meta provider mode",
      configured: providerMode,
      required: false,
      help: providerMode
        ? "Enabled. Provider WABA/system-user checks become required for multi-client onboarding."
        : "Keep disabled until your Meta Tech Provider / Solution Partner setup and permissions are approved.",
    },
    {
      id: "provider-business-id",
      label: "Provider Meta Business ID",
      configured: configured("META_BUSINESS_ID"),
      required: providerMode,
      help: "Required in provider mode for WABA/system-user operations.",
    },
    {
      id: "provider-system-user",
      label: "Provider System User ID",
      configured: configured("META_SYSTEM_USER_ID"),
      required: providerMode,
      help: "Required in provider mode so your provider system user can be assigned to customer WABAs.",
    },
    {
      id: "provider-system-token",
      label: "Provider messaging System User token",
      configured: configured("META_SYSTEM_USER_ACCESS_TOKEN"),
      required: providerMode,
      help: "Server-only token used for approved provider messaging/WhatsApp operations.",
    },
    {
      id: "provider-admin-token",
      label: "Provider Admin System User token",
      configured: configured("META_ADMIN_SYSTEM_USER_ACCESS_TOKEN") || configured("META_SYSTEM_USER_ACCESS_TOKEN"),
      required: providerMode,
      help: "Used to assign the provider system user to customer WABAs. Prefer a dedicated admin token.",
    },
    {
      id: "provider-credit-line",
      label: "Meta credit line ID",
      configured: configured("META_CREDIT_LINE_ID"),
      required: providerMode && creditLineMode,
      help: creditLineMode
        ? "Credit-line billing is enabled, so the approved provider credit line must be configured."
        : "Optional. Leave credit-line mode disabled if customers are not billed through your provider line of credit.",
    },
  ];

  const requiredChecks = checks.filter((c) => c.required);
  const requiredReady = requiredChecks.every((c) => c.configured);

  return NextResponse.json({
    requiredReady,
    checks,
    trialDays,
    providerMode,
    creditLineMode,
    metaApiVersion: process.env.WHATSAPP_API_VERSION || "v26.0",
    externalMetaChecks: [
      "Meta App Review completed for the permissions used by your provider flow",
      "Advanced Access approved for business_management and whatsapp_business_management before release",
      "Provider system user and required WhatsApp messaging permissions are correctly configured",
      "Customer WABA and phone-number eligibility/verification completed during onboarding",
      "Provider billing or credit-line model approved/configured if you choose to use it",
      "One real customer account passes Embedded Signup -> registration -> webhook -> reply -> template campaign end to end",
    ],
  });
}
