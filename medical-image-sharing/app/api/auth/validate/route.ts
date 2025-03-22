import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req: Request) {
  const response = NextResponse.json({}, { status: 200 });
  return addCorsHeaders(response);
}

// This is a simplified route that just validates the token
// and returns user information from NextAuth session or
// proxies the validation to the backend server

export async function GET(req: NextRequest) {
  try {
    // First try to get session from NextAuth
    const session = await getServerSession(authOptions);
    
    // If we have a valid NextAuth session, use that
    if (session?.user) {
      console.log('User authenticated via NextAuth');
      
      // Return a simplified user object from the session
      return NextResponse.json({
        status: 'success',
        isValid: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        },
      });
    }
    
    // If no NextAuth session, try to get token from headers or cookies
    let token: string | null = null;
    
    // Check Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    // Check cookies if no token in header
    if (!token) {
      const cookies = req.cookies;
      token = cookies.get('token')?.value ?? null;
    }
    
    // If no token found, return unauthorized
    if (!token) {
      console.log('No token found for validation');
      return NextResponse.json(
        { status: 'error', isValid: false, message: 'No token provided' },
        { status: 401 }
      );
    }
    
    // If we have a token but no session, validate with the backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
      const response = await fetch(`${backendUrl}/auth/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Get the validation result from the backend
      const data = await response.json();
      
      // Return success or error based on backend response
      if (response.ok && data.isValid) {
        return NextResponse.json({
          status: 'success',
          isValid: true,
          user: data.user,
        });
      } else {
        return NextResponse.json(
          { status: 'error', isValid: false, message: data.message || 'Invalid token' },
          { status: response.status }
        );
      }
    } catch (backendError) {
      console.error('Error validating token with backend:', backendError);
      return NextResponse.json(
        { status: 'error', isValid: false, message: 'Backend validation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json(
      { status: 'error', isValid: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 