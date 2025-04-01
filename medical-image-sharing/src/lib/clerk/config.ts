import { clerkClient } from '@clerk/nextjs/server';

export const clerkConfig = {
  frontendApi: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
  backendApi: process.env.NEXT_PUBLIC_CLERK_BACKEND_API,
  jwksUrl: process.env.NEXT_PUBLIC_CLERK_JWKS_URL,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
};

// Helper function to get user data from Clerk
export async function getClerkUser(userId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user;
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

// Helper function to get user's public metadata (role, etc.)
export async function getUserMetadata(userId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata;
  } catch (error) {
    console.error('Error fetching user metadata:', error);
    return null;
  }
}

// Helper function to update user's public metadata
export async function updateUserMetadata(userId: string, metadata: any) {
  try {
    const client = await clerkClient();
    const user = await client.users.updateUser(userId, {
      publicMetadata: metadata,
    });
    return user;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return null;
  }
} 