import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEmail, escapeHtml } from "@/lib/email";
import { site } from "@/lib/site";
import { consumeRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Public — no session needed. Never add this route to the auth middleware matcher.
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > 16_384) {
    return NextResponse.json({ error: "too_large", message: "Please shorten your enquiry and try again." }, { status: 413 });
  }

  let b: any = {};
  try {
    b = JSON.parse(rawBody || "{}");
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Please submit a valid enquiry." }, { status: 400 });
  }

  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const phone = String(b.phone || "").trim();
  const company = String(b.company || "").trim();
  const message = String(b.message || "").trim();
  const intent = b.intent === "sales" ? "sales" : "demo";

  if (!name || !email) {
    return NextResponse.json({ error: "missing_fields", message: "Please add your name and email." }, { status: 400 });
  }
  if (name.length > 120 || email.length > 254 || phone.length > 40 || company.length > 120) {
    return NextResponse.json({ error: "field_too_long", message: "Please check the length of your contact details." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email", message: "That email address does not look right." }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "too_long", message: "Please shorten your message." }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "unavailable", message: "We could not send your message. Please WhatsApp us instead." }, { status: 503 });
  }

  const limit = await consumeRateLimit(db, "public-contact", requestIp(req), 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many enquiries from this connection. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  try {
    await db.collection("enquiries").add({
      name, email, phone: phone || null, company: company || null,
      message: message || null, intent, status: "new", createdAt: new Date().toISOString(),
    });

    const to = process.env.ADMIN_EMAIL || site.email;
    await sendEmail({
      to,
      subject: `New ${intent} enquiry from ${name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px">
          <p style="font-size:16px;font-weight:600">New enquiry</p>
          <p><b>Name:</b> ${escapeHtml(name)}<br/>
             <b>Email:</b> ${escapeHtml(email)}<br/>
             <b>Phone:</b> ${escapeHtml(phone || "—")}<br/>
             <b>Company:</b> ${escapeHtml(company || "—")}<br/>
             <b>Type:</b> ${escapeHtml(intent)}</p>
          <p><b>Message:</b><br/>${escapeHtml(message || "—")}</p>
          <p><a href="${site.domain}/admin/enquiries">Open in admin panel</a></p>
        </div>`,
    }).catch(() => null);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "save_failed", message: "We could not send your message. Please WhatsApp us instead." }, { status: 500 });
  }
}
