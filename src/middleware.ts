import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/consumer(.*)',      // Consumer portal
  '/business(.*)',      // Business portal
  '/admin(.*)',         // Admin dashboard
  '/api/trpc(.*)',      // All tRPC API routes
]);

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/',                  // Landing page
  '/sign-in(.*)',       // Clerk sign-in
  '/sign-up(.*)',       // Clerk sign-up
  '/for-businesses',    // Business information page
  '/about',             // About page
  '/pricing',           // Pricing page
  '/contact',           // Contact page
  '/api/webhooks(.*)',  // Webhook endpoints (e.g., Twilio, Clerk)
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect routes that require authentication
  if (!isPublicRoute(req) && isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
