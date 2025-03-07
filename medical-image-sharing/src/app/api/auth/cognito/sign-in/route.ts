import { NextRequest } from 'next/server';
import axios from 'axios';
import { createErrorResponse } from '../auth-helper';

/**
 * POST handler for user sign-in
 * @param req Next.js request object
 * @returns Response with authentication tokens or error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400);
    }

    // Call the backend API for authentication
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/auth/sign-in`, 
      { email, password }
    );

    return Response.json(response.data);
  } catch (error: any) {
    console.error('Sign-in error:', error);
    
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      return Response.json(data, { status });
    }
    
    return createErrorResponse('Authentication failed', 500);
  }
} 