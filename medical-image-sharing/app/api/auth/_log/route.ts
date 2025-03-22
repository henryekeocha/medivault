import { NextRequest, NextResponse } from 'next/server';

// This endpoint receives logs from the NextAuth.js client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Log the error message from the client
    console.log('[NextAuth] Client log:', body);
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[NextAuth] Error logging client message:', error);
    
    // Return a properly formatted JSON response even in case of error
    return NextResponse.json(
      { received: false },
      { status: 200 } // Return 200 to avoid client-side parsing errors
    );
  }
} 