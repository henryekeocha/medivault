import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Always return a properly formatted response with the correct headers
    return NextResponse.json(
      session ? session : { user: null },
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  } catch (error) {
    console.error('Session API error:', error);
    
    // Return a properly formatted JSON response even in case of error
    return NextResponse.json(
      { user: null, error: 'Failed to retrieve session' },
      { 
        status: 500, // Return 500 for server errors
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  }
} 