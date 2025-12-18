import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if user has session cookie
  const sessionCookie = request.cookies.get('__session');
  const isAuthenticated = !!sessionCookie?.value;
  
  // Define protected routes
  const protectedRoutes = ['/admin', '/candidate', '/quiz', '/results'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect authenticated users from auth pages to candidate dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/candidate', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};