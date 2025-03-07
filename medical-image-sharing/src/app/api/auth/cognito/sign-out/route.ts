import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

/**
 * POST handler for signing out
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('cognitoAccessToken')?.value;
    
    if (accessToken) {
      try {
        // Revoke session with backend
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
        await axios.post(
          `${backendUrl}/api/v1/auth/session/revoke`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
      } catch (error) {
        console.error('Error revoking session:', error);
        // Continue with sign-out even if revocation fails
      }
    }
    
    // Clear cookies regardless of backend call success
    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });
    
    // Clear all authentication cookies
    response.cookies.delete('cognitoAccessToken');
    response.cookies.delete('cognitoIdToken');
    response.cookies.delete('cognitoRefreshToken');
    
    return response;
  } catch (error: any) {
    console.error('Error during sign-out:', error);
    
    // Still try to clear cookies even if there's an error
    const response = NextResponse.json(
      {
        success: false,
        message: 'Error during sign-out, but cookies have been cleared'
      },
      { status: 500 }
    );
    
    response.cookies.delete('cognitoAccessToken');
    response.cookies.delete('cognitoIdToken');
    response.cookies.delete('cognitoRefreshToken');
    
    return response;
  }
} 