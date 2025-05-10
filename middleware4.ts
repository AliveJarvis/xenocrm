import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/auth/[...nextauth]";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('Middleware running for:', pathname); // <--- Added logging

  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;
  console.log('Is authenticated:', isAuthenticated); // <--- Added logging

  // Rule 1: Protect /dashboard and subroutes
  if (pathname.startsWith('/dashboard')) {
    console.log('Checking /dashboard route'); // <--- Added logging
    if (!isAuthenticated) {
      console.log('Redirecting to /auth/signin'); // <--- Added logging
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    console.log('Allowing access to /dashboard'); // <--- Added logging
    return NextResponse.next();
  }

  // Rule 2: Prevent authenticated users from accessing /auth/signin
  if (pathname === '/auth/signin') {
    console.log('Checking /auth/signin route'); // <--- Added logging
    if (isAuthenticated) {
      console.log('Redirecting to /dashboard'); // <--- Added logging
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log('Allowing access to /auth/signin for unauthenticated users'); // <--- Added logging
    return NextResponse.next();
  }

  // Allow all other routes
  console.log('Allowing access to other route:', pathname); // <--- Added logging
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/signin', // Be more specific for signin
  ],
};