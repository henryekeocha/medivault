import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Function to add CORS headers to responses
function addCorsHeaders(response: Response | NextResponse): Response | NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

/**
 * POST handler for refreshing access tokens
 * This endpoint either proxies refresh token requests to the backend
 * or handles token refresh locally if the backend is unavailable
 */
export async function POST(request: NextRequest) {
  try {
    // Get the backend URL from environment variables or use default
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Log that we're handling the refresh
    console.log('[API] Handling refresh token request');
    
    // Parse the request body
    const body = await request.json().catch(() => ({}));
    
    if (!body.refreshToken) {
      console.error('[API] No refresh token in request body');
      const errorResponse = NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }
    
    // Log that we're forwarding to backend
    console.log(`[API] Attempting to forward refresh token request to ${backendUrl}/refresh`);
    
    try {
      // Try to forward the request to the backend
      const refreshResponse = await fetch(`${backendUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: body.refreshToken }),
        // Add a shorter timeout to fail faster if backend is unavailable
        signal: AbortSignal.timeout(3000),
      });
      
      // Get the response data
      const data = await refreshResponse.json();
      
      // Log response status
      console.log(`[API] Backend refresh response status: ${refreshResponse.status}`);
      
      // If the backend returned an error
      if (!refreshResponse.ok) {
        console.error('[API] Backend refresh error:', data);
        const errorResponse = NextResponse.json(
          { success: false, error: data.error || 'Failed to refresh token' },
          { status: refreshResponse.status }
        );
        return addCorsHeaders(errorResponse);
      }
      
      // Return the successful response
      console.log('[API] Refresh token successful');
      const successResponse = NextResponse.json(data);
      return addCorsHeaders(successResponse);
    } catch (backendError) {
      // Handle backend connectivity error
      console.error('[API] Backend connectivity error:', backendError);
      console.log('[API] Falling back to local token refresh');
      
      // Implement local token refresh as a fallback
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }
      
      try {
        // Verify the refresh token
        const decoded = jwt.verify(body.refreshToken, JWT_SECRET) as any;
        
        // Generate a new access token
        const newToken = jwt.sign(
          {
            sub: decoded.sub || decoded.userId || decoded.id,
            userId: decoded.userId || decoded.sub || decoded.id,
            email: decoded.email,
            role: decoded.role,
            iat: Math.floor(Date.now() / 1000)
          },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        
        // Generate a new refresh token
        const newRefreshToken = jwt.sign(
          {
            sub: decoded.sub || decoded.userId || decoded.id,
            userId: decoded.userId || decoded.sub || decoded.id,
            email: decoded.email,
            role: decoded.role,
            iat: Math.floor(Date.now() / 1000)
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        console.log('[API] Successfully refreshed token locally');
        
        // Return the new tokens
        const successResponse = NextResponse.json({
          data: {
            token: newToken,
            refreshToken: newRefreshToken,
            // If we have user data in the decoded token, include it
            user: decoded.email ? {
              id: decoded.sub || decoded.userId || decoded.id,
              email: decoded.email,
              role: decoded.role
            } : undefined
          }
        });
        return addCorsHeaders(successResponse);
      } catch (tokenError) {
        console.error('[API] Error refreshing token locally:', tokenError);
        const errorResponse = NextResponse.json(
          { success: false, error: 'Invalid refresh token' },
          { status: 401 }
        );
        return addCorsHeaders(errorResponse);
      }
    }
  } catch (error) {
    console.error('[API] Error in refresh endpoint:', error);
    const errorResponse = NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
} 