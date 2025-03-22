import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get error message from query parameter
    const { searchParams } = new URL(req.url);
    const error = searchParams.get('error');
    const callbackUrl = searchParams.get('callbackUrl');
    
    console.error('[NextAuth] Auth error:', error);
    
    // Redirect to the proper error page with parameters
    const errorPageUrl = new URL('/auth/error', req.url);
    if (error) errorPageUrl.searchParams.set('error', error);
    if (callbackUrl) errorPageUrl.searchParams.set('callbackUrl', callbackUrl);
    
    return NextResponse.redirect(errorPageUrl);
  } catch (error) {
    console.error('[NextAuth] Error handling auth error:', error);
    
    // Redirect to error page on exception
    return NextResponse.redirect(new URL('/auth/error', req.url));
  }
} 