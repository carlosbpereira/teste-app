import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/cadastro"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Read the access token from the HttpOnly cookie
  const accessToken = req.cookies.get("sb-access-token")?.value;
  const isAuthenticated = Boolean(accessToken);

  // If on a protected route without a session → redirect to /login
  if (!isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and trying to access auth pages → redirect to home
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

// Run on all routes except Next.js internals and static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
