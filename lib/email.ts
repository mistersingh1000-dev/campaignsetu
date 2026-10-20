// Email via Resend's REST API — no npm package needed.
// If RESEND_API_KEY isn't set, sending is skipped quietly: an order must never
// fail just because email isn't configured yet.
const ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };

  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Email send failed:", res.status, body);
      return { ok: false, error: `status ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("Email send error:", e?.message || e);
    return { ok: false, error: e?.message };
  }
}

const shell = (inner: string) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A0F0D">
    <div style="border-radius:14px;border:1px solid #e6e9e6;padding:24px">
      <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#075E54">WhatsApp Connect Pro</p>
      ${inner}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7280;text-align:center">
      This is an automated message.
    </p>
  </div>`;

export function customerOrderEmail(o: {
  name: string | null;
  planName: string;
  amount: number;
  reference: string;
}): { subject: string; html: string } {
  return {
    subject: `We received your payment details — ${o.planName} plan`,
    html: shell(`
      <p style="margin:0 0 12px">Hi ${escapeHtml(o.name || "there")},</p>
      <p style="margin:0 0 12px;line-height:1.6">
        Thanks — we have your payment details for the <b>${escapeHtml(o.planName)}</b> plan
        (₹${o.amount.toLocaleString("en-IN")}).
      </p>
      <p style="margin:0 0 12px;line-height:1.6">
        Your plan is <b>under process</b>. We are checking the payment against our records and
        will activate your account shortly. You will get another email the moment it is live.
      </p>
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Your reference</p>
      <p style="margin:0 0 16px;font-family:monospace;font-size:14px">${escapeHtml(o.reference)}</p>
      <p style="margin:0;line-height:1.6">
        You can keep using your account normally in the meantime.
      </p>`),
  };
}

export function adminOrderEmail(o: {
  userId: string;
  name: string | null;
  planName: string;
  amount: number;
  reference: string;
  note: string | null;
  adminUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `New payment: ${o.planName} — ₹${o.amount.toLocaleString("en-IN")} from ${o.userId}`,
    html: shell(`
      <p style="margin:0 0 12px;font-size:16px;font-weight:600">Someone bought a plan</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280">Customer</td><td style="padding:6px 0"><b>${escapeHtml(o.name || "—")}</b></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${escapeHtml(o.userId)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Plan</td><td style="padding:6px 0"><b>${escapeHtml(o.planName)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Amount</td><td style="padding:6px 0">₹${o.amount.toLocaleString("en-IN")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Reference</td><td style="padding:6px 0;font-family:monospace">${escapeHtml(o.reference)}</td></tr>
        ${o.note ? `<tr><td style="padding:6px 0;color:#6b7280">Note</td><td style="padding:6px 0">${escapeHtml(o.note)}</td></tr>` : ""}
      </table>
      <p style="margin:20px 0 0">
        <a href="${o.adminUrl}" style="display:inline-block;background:#25D366;color:#0A0F0D;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px">
          Check the payment and activate
        </a>
      </p>`),
  };
}

export function activationEmail(o: {
  name: string | null;
  planName: string;
  validUntil: string;
}): { subject: string; html: string } {
  const until = new Date(o.validUntil).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: `Your ${o.planName} plan is active`,
    html: shell(`
      <p style="margin:0 0 12px">Hi ${escapeHtml(o.name || "there")},</p>
      <p style="margin:0 0 12px;line-height:1.6">
        Your payment is confirmed and your <b>${escapeHtml(o.planName)}</b> plan is now active.
      </p>
      <p style="margin:0 0 16px;line-height:1.6">Valid until <b>${until}</b>.</p>
      <p style="margin:0;line-height:1.6">Thanks for choosing us.</p>`),
  };
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
