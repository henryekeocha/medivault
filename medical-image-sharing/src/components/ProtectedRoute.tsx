import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { LoadingState } from './LoadingState';
import { routes } from '@/config/routes';
import type { Route } from 'next';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requireAuth?: boolean;
}

export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { allowedRoles?: Role[]; requireAuth?: boolean } = {}
) {
  return function ProtectedRoute(props: P) {
    const { user, isLoaded } = useUser();
    const router = useRouter();

    useEffect(() => {
      if (isLoaded) {
        // If authentication is required and user is not authenticated
        if (options.requireAuth && !user) {
          router.push(routes.root.login as Route);
          return;
        }

        // If user is authenticated but doesn't have the required role
        if (user && options.allowedRoles) {
          const userRole = user.publicMetadata.role as Role;
          
          // If no role found, redirect to login with error
          if (!userRole) {
            router.push('/auth/login?error=no_role_found' as Route);
            return;
          }
          
          if (!options.allowedRoles.includes(userRole)) {
            // Redirect to role-specific dashboard
            if (userRole === Role.PATIENT) {
              router.push('/dashboard' as Route);
            } else if (userRole === Role.PROVIDER) {
              router.push('/dashboard' as Route);
            } else if (userRole === Role.ADMIN) {
              router.push('/dashboard' as Route);
            } else {
              router.push('/unauthorized' as Route);
            }
            return;
          }
        }
      }
    }, [isLoaded, user, options.allowedRoles, options.requireAuth, router]);

    if (!isLoaded) {
      return <LoadingState fullScreen />;
    }

    // If authentication is required and user is not authenticated
    if (options.requireAuth && !user) {
      return null;
    }

    // If user is authenticated but doesn't have the required role
    if (user && options.allowedRoles) {
      const userRole = user.publicMetadata.role as Role;
      
      // If no role found, return null
      if (!userRole) {
        return null;
      }
      
      if (!options.allowedRoles.includes(userRole)) {
        return null;
      }
    }

    return <WrappedComponent {...props} />;
  };
} 