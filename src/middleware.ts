
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// The session cookie is typically set by a server-side authentication process.
// In a client-side heavy app like this one with Firebase, the presence of the cookie
// is a good-enough signal for the middleware that the user *might* be logged in.
// The definitive check will still happen on the client.
const FIREBASE_SESSION_COOKIE = '__session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(FIREBASE_SESSION_COOKIE);

  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/';

  // If the user has a session cookie and is on a public route, redirect to their dashboard.
  // This prevents logged-in users from seeing login/register pages.
  if (hasSessionCookie && isPublicRoute) {
    // We don't know the user's role here, so we redirect to a generic dashboard path.
    // The client-side logic in a layout or page will then handle the role-specific redirect 
    // (e.g., to /admin or /candidate). This is a common pattern with Firebase Auth.
    // For this app, we'll redirect to /candidate and let the client-side logic sort it out.
    return NextResponse.redirect(new URL('/candidate', request.url));
  }

  // If the user does not have a session cookie and is trying to access a protected route,
  // redirect them to the login page.
  if (!hasSessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Otherwise, allow the request to proceed.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
