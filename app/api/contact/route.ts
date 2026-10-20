import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendEmail, escapeHtml } from "@/lib/email";
import { site } from "@/lib/site";

export const runtime = "nodejs";

// Public — no session needed. Must never be added to the middleware matcher,
// or visitors could not contact you.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const phone = String(b.phone || "").trim();
  const company = String(b.company || "").trim();
  const message = String(b.message || "").trim();
  const intent = b.intent === "sales" ? "sales" : "demo";

  if (!name || !email) {
    return NextResponse.json(
      { error: "missing_fields", message: "Please add your name and email." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "That email address does not look right." },
      { status: 400 }
    );
  }
  if (message.length > 4000) {
    return NextResponse.json(
      { error: "too_long", message: "Please shorten your message." },
      { status: 400 }
    );
  }

  const db = getDb();
  if (!db) {
    // Never show a fake thank-you. If we can't store it, say so, so the
    // visitor knows to reach you another way instead of waiting for a reply.
    return NextResponse.json(
      {
        error: "unavailable",
        message: "We could not send your message. Please WhatsApp us instead.",
      },
      { status: 503 }
    );
  }

  try {
    await db.collection("enquiries").add({
      name,
      email,
      phone: phone || null,
      company: company || null,
      message: message || null,
      intent,
      status: "new",
      createdAt: new Date().toISOString(),
    });

    // Best-effort notification — the enquiry is already safe in the database.
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
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "save_failed",
        message: "We could not send your message. Please WhatsApp us instead.",
      },
      { status: 500 }
    );
  }
}
