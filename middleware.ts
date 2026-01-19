import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow these paths without authentication
  const isLoginPage = pathname === '/login';
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicFile = /\.(png|jpg|jpeg|gif|svg|ico|css|js)$/.test(pathname);
  const isNextInternal = pathname.startsWith('/_next');
  
  if (isApiRoute || isPublicFile || isNextInternal) {
    return NextResponse.next();
  }

  // Check for auth token (simple check)
  const token = request.cookies.get('auth-token')?.value;
  const isAuthenticated = !!token;
  
  console.log(`🔐 Middleware: ${pathname}, Auth: ${isAuthenticated}, Token exists: ${!!token}`);

  // Redirect to dashboard if logged in and trying to access login page
  if (isAuthenticated && isLoginPage) {
    console.log('✅ Redirecting authenticated user from /login to /');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect to login if not authenticated and not on login page
  if (!isAuthenticated && !isLoginPage) {
    console.log('❌ Redirecting unauthenticated user to /login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log('✅ Allowing access to:', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
