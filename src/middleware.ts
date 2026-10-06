import { NextRequest, NextResponse } from "next/server";
import { allowedCookieMutation } from "@/lib/request-security";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Auth.js and public checkout enforce their own request-origin protections.
  if (!path.startsWith("/api/auth/") && !path.startsWith("/api/storefront/") &&
      !allowedCookieMutation(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/api/:path*", "/dashboard/:path*", "/login"] };
