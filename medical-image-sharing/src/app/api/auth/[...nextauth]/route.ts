import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import { routes } from '@/config/routes';

// Define user roles here so they can be imported elsewhere
export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  PROVIDER: 'provider',
  PATIENT: 'patient',
} as const;

// Define authOptions for use in other files
export const authOptions: AuthOptions = {
  // Add empty providers array to satisfy the type requirement
  providers: [],
  
  // Fallback session configuration
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Define empty callbacks to maintain compatibility
  callbacks: {
    async session({ session, token }: any) {
      if (token?.role) {
        session.user.role = token.role;
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
  },
  
  // Placeholder pages for compatibility
  pages: {
    signIn: routes.root.login,
    error: '/auth/error',
  },
};

// Legacy handler that redirects to Cognito
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 