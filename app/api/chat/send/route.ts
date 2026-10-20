import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Deprecated: sending now goes through /api/whatsapp/send-message so the
// message actually reaches WhatsApp. Kept so old clients get a clear answer.
export async function POST() {
  return NextResponse.json(
    { error: "moved", message: "Use /api/whatsapp/send-message instead." },
    { status: 410 }
  );
}
