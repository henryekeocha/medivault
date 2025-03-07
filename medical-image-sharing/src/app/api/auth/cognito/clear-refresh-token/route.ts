import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST handler to clear the refresh token cookie
 * @param req Next.js request object
 * @returns Response indicating success
 */
export async function POST(req: NextRequest) {
  // Delete the refresh token cookie
  const cookieStore = await cookies();
  cookieStore.delete('refreshToken');
  
  return Response.json({ success: true });
} 