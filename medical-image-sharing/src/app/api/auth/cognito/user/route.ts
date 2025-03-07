import { NextRequest } from 'next/server';
import axios from 'axios';
import { extractTokenFromRequest, handleAuthError, createErrorResponse } from '../auth-helper';

/**
 * GET handler for retrieving the current authenticated user
 * @param req Next.js request object
 * @returns Response with user data or error
 */
export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return Response.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Call the backend API to get user information
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/auth/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return Response.json(response.data);
  } catch (error: any) {
    return handleAuthError(error);
  }
}

/**
 * PUT handler for updating user attributes
 * @param req Next.js request object
 * @returns Response with updated user data or error
 */
export async function PUT(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return Response.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    // Parse the request body
    const body = await req.json();
    const { name, attributes } = body;
    
    // Validate the request body
    if (!name && !attributes) {
      return createErrorResponse('No update data provided', 400);
    }

    // Call the backend API to update the user
    const userData: Record<string, any> = {};
    if (name) userData.name = name;
    if (attributes) userData.attributes = attributes;
    
    const response = await axios.put(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/auth/user`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // Return the updated user profile
    return Response.json(response.data);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return handleAuthError(error);
  }
} 