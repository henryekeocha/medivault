import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get error message from query parameter
    const { searchParams } = new URL(req.url);
    const error = searchParams.get('error');
    
    console.error('[NextAuth] Auth error:', error);
    
    // Return a properly formatted error response
    return NextResponse.json(
      { error: error || 'Authentication error' },
      { status: 200 } // Return 200 to avoid client-side parsing errors
    );
  } catch (error) {
    console.error('[NextAuth] Error handling auth error:', error);
    
    // Return a generic error response
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 200 }
    );
  }
} 