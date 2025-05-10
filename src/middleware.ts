import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// Export the middleware configuration
export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ req, token }) {
      const { pathname } = req.nextUrl;

      // Always allow access to authentication-related routes
      if (
        pathname.startsWith('/api/auth') || 
        pathname === '/auth/signin'
      ) {
        return true;
      }

      // Protected routes require authentication
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
        return !!token;
      }

      // Allow access to public routes
      return true;
    }
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
