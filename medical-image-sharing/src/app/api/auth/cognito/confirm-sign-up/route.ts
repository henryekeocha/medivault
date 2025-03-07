import { NextRequest } from 'next/server';
import axios from 'axios';
import { createErrorResponse } from '../auth-helper';

/**
 * POST handler for confirming user registration
 * @param req Next.js request object
 * @returns Response with confirmation result or error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    // Validate required fields
    if (!email || !code) {
      return createErrorResponse('Email and confirmation code are required', 400);
    }

    // Call the backend API for confirming registration
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/auth/confirm-sign-up`,
      { email, code }
    );

    return Response.json(response.data);
  } catch (error: any) {
    console.error('Confirm sign-up error:', error);
    
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      return Response.json(data, { status });
    }
    
    return createErrorResponse('Confirmation failed', 500);
  }
} 