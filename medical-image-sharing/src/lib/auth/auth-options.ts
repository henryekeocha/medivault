import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Alias the Prisma Role enum for backward compatibility
export { Role as UserRole } from '@prisma/client';

// Define extended types for NextAuth.js
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    accessToken?: string;
    refreshToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // First try to authenticate with the backend API
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
          console.log(`Authenticating with backend at ${backendUrl}/auth/login`);
          
          const response = await fetch(`${backendUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Successfully authenticated with the backend
            if (data.status === 'success' && data.data?.user) {
              console.log('Backend authentication successful');
              return {
                id: data.data.user.id,
                email: data.data.user.email,
                name: data.data.user.name || 'User',
                role: data.data.user.role,
                accessToken: data.data.token,
                refreshToken: data.data.refreshToken,
              };
            }
          }
          
          // Fall back to database authentication
          console.log('Backend authentication failed, falling back to database');
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user) {
            throw new Error('Invalid credentials');
          }

          if (!user.isActive) {
            throw new Error('Your account is inactive');
          }

          if (user.isLocked) {
            throw new Error('Your account is locked');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            // Increment failed login attempts
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: user.failedLoginAttempts + 1,
                isLocked: user.failedLoginAttempts >= 4,
                accountLockExpiresAt: user.failedLoginAttempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null,
              },
            });
            throw new Error('Invalid password');
          }

          // Reset failed login attempts on successful login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lastLoginAt: new Date(),
              lastActiveAt: new Date(),
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: Role.PATIENT, // Default role for new social sign-ins
        };
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture?.data?.url,
          role: Role.PATIENT, // Default role for new social sign-ins
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }

      // Handle token updates
      if (trigger === "update" && session) {
        token.accessToken = session.accessToken;
        token.refreshToken = session.refreshToken;
      }

      return token;
    },
    async session({ session, token, trigger }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
      }

      // Handle session updates
      if (trigger === "update") {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
      }

      return session;
    }
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}; 