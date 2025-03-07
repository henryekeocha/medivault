import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

// Alias the Prisma Role enum for backward compatibility
export { Role as UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        // Update user's last login time
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // If user's session is active, check if their role has changed
      if (token.id) {
        const userDetails = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true }
        });
        
        if (userDetails && userDetails.role !== token.role) {
          token.role = userDetails.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // For social sign-ins, we need to check if this is a first-time login
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          
          if (existingUser) {
            // Update the last login timestamp
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { lastLoginAt: new Date() }
            });
            
            // Log social sign-in
            await prisma.securityLog.create({
              data: {
                userId: existingUser.id,
                action: 'SOCIAL_LOGIN',
                ipAddress: null, // Would be populated in actual request
                userAgent: null,
                // Store metadata as stringified JSON
                metadata: JSON.stringify({
                  provider: account.provider,
                  timestamp: new Date().toISOString()
                })
              }
            });
          } else {
            // This is a new user, we'll create them with the default role
            // The actual user creation is handled by the NextAuth adapter
            // We're just adding additional tracking here
            
            // Note: At this point, user.id might be the provider's ID, not our database ID
            // So we need to find the newly created user
            const newUser = await prisma.user.findUnique({
              where: { email: user.email },
            });
            
            if (newUser) {
              // Log new user creation via social login
              await prisma.securityLog.create({
                data: {
                  userId: newUser.id,
                  action: 'SOCIAL_SIGNUP',
                  ipAddress: null,
                  userAgent: null,
                  // Store metadata as stringified JSON
                  metadata: JSON.stringify({
                    provider: account.provider,
                    timestamp: new Date().toISOString()
                  })
                }
              });
            }
          }
        } catch (error) {
          console.error("Error during social sign-in:", error);
          // Continue with sign-in, but log the error
        }
      }
      
      return true;
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
} 