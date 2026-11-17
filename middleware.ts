import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (hostname === "campaignsetu.vercel.app") {
    const url = req.nextUrl.clone();
    url.pathname = "/moved";
    return NextResponse.rewrite(url);
  }
  // Keep the Las Media Agency homepage public; only the legacy CampaignSetu hostname is rewritten above.
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { error: "not_authenticated", message: "Please log in." },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }

  return NextResponse.next();
}

// IMPORTANT: never match "/api/:path*" broadly — that would block
// /api/auth/signup and /api/auth/login, which must work without a session.
// Also never match /api/webhooks/* — WhatsApp calls it with no cookie.
export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/chat/:path*",
    "/api/whatsapp/:path*",
    "/api/admin/:path*",
    "/api/dashboard/:path*",
    "/api/payments/:path*",
    "/api/orders",
    "/api/embedded-signup/:path*",
  ],
};
