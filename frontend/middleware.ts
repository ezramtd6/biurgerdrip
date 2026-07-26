import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/register", "/forgot-password"];
const isPublicPath = (pathname: string) =>
  publicPaths.some((p) => pathname === p) ||
  pathname.startsWith("/set-password/") ||
  pathname.startsWith("/reset-password/") ||
  pathname.startsWith("/menu");

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  if (isPublicPath(pathname)) {
    if (accessToken && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/menu", request.url));
    }
    return NextResponse.next();
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
