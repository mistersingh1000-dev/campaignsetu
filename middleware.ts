import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";

  // Show the migration notice on the old CampaignSetu Vercel domain and
  // its project-scoped Vercel aliases, without affecting lasmediaagency.online.
  const isLegacyCampaignSetuHost =
    hostname === "campaignsetu.vercel.app" ||
    (hostname.startsWith("campaignsetu-") && hostname.endsWith(".vercel.app"));

  if (isLegacyCampaignSetuHost) {
    const url = req.nextUrl.clone();
    url.pathname = "/moved";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  const pathname = req.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/dashboard/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/admin/") ||
    pathname === "/admin" ||
    pathname.startsWith("/api/chat/") ||
    pathname.startsWith("/api/whatsapp/") ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/dashboard/") ||
    pathname.startsWith("/api/payments/") ||
    pathname === "/api/orders" ||
    pathname.startsWith("/api/embedded-signup/");

  // Public pages (including the Las Media Agency homepage) remain public.
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);
  const isApi = pathname.startsWith("/api/");

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

// Run on public page routes too, so legacy CampaignSetu URLs cannot expose
// the old public website. Keep APIs out of the catch-all so webhooks/login work.
export const config = {
  matcher: [
    "/((?!api/|_next/|.*\\..*).*)",
    "/api/chat/:path*",
    "/api/whatsapp/:path*",
    "/api/admin/:path*",
    "/api/dashboard/:path*",
    "/api/payments/:path*",
    "/api/orders",
    "/api/embedded-signup/:path*",
  ],
};
