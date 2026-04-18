import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin surface is gated by a shared secret. Unlocking requires matching
 * `ADMIN_SECRET` via either the `eh_admin` cookie or the `x-admin-secret`
 * header. Unlocking over the wire: visit `/admin?secret=<value>` once;
 * the page handler sets the cookie and strips the query string.
 *
 * Skipping the gate: leave `ADMIN_SECRET` unset in dev to keep the tool
 * open while iterating locally.
 */
const ADMIN_PATHS = ["/admin", "/api/floorplans"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isAdmin) return NextResponse.next();

  const expected = process.env.ADMIN_SECRET;
  if (!expected) return NextResponse.next();

  const query = req.nextUrl.searchParams.get("secret");
  if (query && query === expected) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("secret");
    const res = NextResponse.redirect(url);
    res.cookies.set("eh_admin", expected, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  const cookie = req.cookies.get("eh_admin")?.value;
  const header = req.headers.get("x-admin-secret");
  if (cookie === expected || header === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return new NextResponse("Unauthorized", { status: 401 });
}

export const config = {
  matcher: ["/admin/:path*", "/api/floorplans/:path*"],
};
