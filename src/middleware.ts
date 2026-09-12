import { NextRequest, NextResponse } from "next/server";

/**
 * Bypass Next.js public/ static cache for uploads: always serve via the
 * dynamic /api/media route so files written after process start return 200.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/uploads/")) {
    return NextResponse.next();
  }
  const rest = pathname.slice("/uploads/".length);
  if (!rest || rest.includes("..")) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = `/api/media/${rest}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/uploads/:path*"],
};
