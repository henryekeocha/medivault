import { NextRequest, NextResponse } from 'next/server';

// This endpoint receives logs from the NextAuth.js client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Log the error message from the client
    console.log('[NextAuth] Client log:', body);
    
    // Use new NextResponse with explicit JSON formatting
    return new NextResponse(
      JSON.stringify({ received: true }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[NextAuth] Error logging client message:', error);
    
    // Return a properly formatted JSON response even in case of error
    return new NextResponse(
      JSON.stringify({ received: false }),
      { 
        status: 200, // Return 200 to avoid client-side parsing errors
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 