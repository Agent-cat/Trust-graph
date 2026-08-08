import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(req: NextRequest) {
  const cookie = getSessionCookie(req);

  // Protected routes that require authentication
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedRoute && !cookie) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Redirect to dashboard if already signed in
  if (
    (req.nextUrl.pathname === "/sign-in" ||
      req.nextUrl.pathname === "/sign-up") &&
    cookie
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sign-in", "/sign-up"],
};
