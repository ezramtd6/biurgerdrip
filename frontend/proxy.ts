import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REMOVED_AUTH_PATHS = ["/login", "/register", "/forgot-password"];

const MOVED_DASHBOARD_PATHS: Record<string, string> = {
  "/dashboard/contacts": "/dashboard/restaurant",
  "/dashboard/social-links": "/dashboard/restaurant",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (REMOVED_AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (MOVED_DASHBOARD_PATHS[pathname]) {
    return NextResponse.redirect(new URL(MOVED_DASHBOARD_PATHS[pathname], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
