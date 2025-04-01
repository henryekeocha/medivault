import { auth, getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role, User } from '@prisma/client';
import { NextRequest, NextResponse } from "next/server";

// For server-only code
import 'server-only';

/**
 * A service that handles authentication using Clerk - Server Side Only
 * This file contains server-side only code and should never be imported from client components
 */
export class ServerAuthService {
  /**
   * Get the current user's ID from Clerk auth
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { userId } = await auth();
      return userId;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Get a user by their Clerk ID from the database
   */
  static async getUserByClerkId(clerkId: string): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: { username: clerkId },
      });
    } catch (error) {
      console.error('Error fetching user by Clerk ID:', error);
      return null;
    }
  }

  /**
   * Get the current user from the database
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;
      
      return await this.getUserByClerkId(userId);
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  /**
   * Get user role from Clerk metadata
   */
  static async getCurrentUserRole(): Promise<Role | null> {
    try {
      const { userId } = await auth();
      if (!userId) return null;

      // For server components, we'll use the database directly
      const dbUser = await this.getUserByClerkId(userId);
      if (dbUser?.role) {
        return dbUser.role;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Set user role in database
   */
  static async setUserRole(userId: string, role: Role): Promise<boolean> {
    try {
      // Update the database
      await prisma.user.update({
        where: { username: userId },
        data: { role }
      });

      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      return false;
    }
  }

  /**
   * Check if the current user has a specific role
   */
  static async hasRole(role: Role): Promise<boolean> {
    try {
      const userRole = await this.getCurrentUserRole();
      return userRole === role;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Check if the current user is an admin
   */
  static async isAdmin(): Promise<boolean> {
    return await this.hasRole(Role.ADMIN);
  }

  /**
   * Check if the current user is a provider
   */
  static async isProvider(): Promise<boolean> {
    return await this.hasRole(Role.PROVIDER);
  }

  /**
   * Check if the current user is a patient
   */
  static async isPatient(): Promise<boolean> {
    return await this.hasRole(Role.PATIENT);
  }

  /**
   * Get user ID from request
   */
  static getUserIdFromRequest(request: NextRequest): string | null {
    try {
      const authObj = getAuth(request);
      return authObj.userId;
    } catch (error) {
      console.error('Error getting user ID from request:', error);
      return null;
    }
  }

  /**
   * Verify user access for protected routes
   */
  static async verifyUserAccess(
    request: NextRequest,
    allowedRoles: string[] = []
  ): Promise<NextResponse | null> {
    const userId = this.getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: User not authenticated" },
        { status: 401 }
      );
    }
    
    const user = await this.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: User not found" },
        { status: 401 }
      );
    }
    
    if (!user.role) {
      return NextResponse.json(
        { error: "Unauthorized: User has no role assigned" },
        { status: 403 }
      );
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }
    
    return null; // No errors, user has access
  }
} 