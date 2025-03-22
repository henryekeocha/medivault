import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

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

export async function GET(req: Request) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      const response = NextResponse.json(
        { error: 'No token provided', valid: false },
        { status: 401 }
      );
      return addCorsHeaders(response);
    }

    const token = authHeader.split(' ')[1];

    // First, try to decode the token without verification
    // This can work for both Cognito tokens and our custom JWT
    try {
      let decoded;
      let userId;

      // Try to decode the token header to check if it's a Cognito token
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
      console.log('Token header:', header);

      // If it's a Cognito token (RS256 algorithm), just decode it
      if (header.alg === 'RS256') {
        console.log('Detected Cognito token (RS256 algorithm)');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        
        // Basic validation
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          throw new Error('Token expired');
        }
        
        decoded = payload;
        userId = payload.sub; // Cognito uses 'sub' for the user ID
      } else {
        // If it's our custom JWT (HS256 algorithm), verify it
        console.log('Verifying custom JWT token');
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
          userId: string;
          email: string;
          role: string;
          sub?: string; // Add optional sub property
        };
        userId = decoded.userId || decoded.sub;
      }

      if (!userId) {
        throw new Error('Invalid token: no user identifier found');
      }

      // Get user from database
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          const response = NextResponse.json(
            { error: 'User not found', valid: false },
            { status: 404 }
          );
          return addCorsHeaders(response);
        }

        const response = NextResponse.json({ 
          isValid: true,  // Match backend API format
          user 
        });
        return addCorsHeaders(response);

      } catch (dbError) {
        console.error('Database error during token validation:', dbError);
        const response = NextResponse.json(
          { error: 'Database error', valid: false },
          { status: 500 }
        );
        return addCorsHeaders(response);
      }
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      const response = NextResponse.json(
        { error: 'Invalid token', valid: false },
        { status: 401 }
      );
      return addCorsHeaders(response);
    }
  } catch (error) {
    console.error('Token validation error:', error);
    const response = NextResponse.json(
      { error: 'Invalid token', valid: false },
      { status: 401 }
    );
    return addCorsHeaders(response);
  }
} 