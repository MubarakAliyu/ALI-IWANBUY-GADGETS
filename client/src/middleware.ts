import { NextResponse, type NextRequest } from "next/server";

/**
 * A first gate in front of the pages that need an account (overview §6.4). It checks only that a session
 * cookie is present — whether that cookie still identifies anyone is the API's business, and the API is the
 * authority. This exists so a signed-out visitor is sent to the sign-in form instead of watching a private
 * page render and then empty itself.
 */
const PROTECTED = [/^\/account(\/|$)/, /^\/checkout(\/|$)/];

const CUSTOMER_COOKIE = "aib_c";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!PROTECTED.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }
  if (request.cookies.has(CUSTOMER_COOKIE)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*"],
};
