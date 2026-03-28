import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-middleware";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/upload", "/report"];

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const { pathname } = request.nextUrl;

  // Refresh the session (important — keeps cookies alive)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated and trying to access protected route → redirect to login
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user IS authenticated and on auth pages → redirect to dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Match all protected + auth routes, skip static files and API routes
    "/dashboard/:path*",
    "/upload/:path*",
    "/report/:path*",
    "/auth/:path*",
  ],
};
