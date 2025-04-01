import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/clerk-middleware for more information about configuring your middleware
const publicRoutes = createRouteMatcher([
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/api/webhook/clerk",
  "/api/webhook/stripe",
  "/health",
]);

const ignoredRoutes = createRouteMatcher([
  "/api/webhook/clerk",
  "/api/webhook/stripe",
  "/_next",
  "/favicon.ico",
  "/api/health",
  "/public/",
  "/static/",
  "/.well-known/",
  "/robots.txt",
  "/manifest.json",
  "/sitemap.xml",
]);

export default clerkMiddleware(async (auth, req) => {
  // Check for static assets in URL and allow them
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Allow access to static files and public assets
  if (path.includes('/_next/') || 
      path.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|map)$/)) {
    return;
  }

  if (publicRoutes(req)) return;
  if (ignoredRoutes(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|public/|favicon.ico).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 