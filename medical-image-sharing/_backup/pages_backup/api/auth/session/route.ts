import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Always return a properly formatted response with the correct headers
    return new NextResponse(
      JSON.stringify(session ? session : { user: null }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Session API error:', error);
    
    // Return a properly formatted JSON response even in case of error
    return new NextResponse(
      JSON.stringify({ user: null, error: 'Failed to retrieve session' }),
      { 
        status: 200, // Return 200 to avoid client-side parsing errors
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 