'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@prisma/client';
import { SkeletonPage } from '@/components/SkeletonLoader';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !isAuthenticated) {
        // Store the attempted URL for redirect after login
        if (pathname !== '/auth/login') {
          router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard if user doesn't have required role
        switch (user.role) {
          case 'ADMIN':
            router.push('/admin/dashboard');
            break;
          case 'PROVIDER':
            router.push('/provider/dashboard');
            break;
          case 'PATIENT':
            router.push('/patient/dashboard');
            break;
          default:
            router.push('/');
        }
      }
    }
  }, [loading, isAuthenticated, user, router, pathname, allowedRoles, requireAuth]);

  // Show loading state
  if (loading) {
    return <SkeletonPage />;
  }

  // Show 404 for unauthorized access
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Show 403 for incorrect role
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function withProtectedRoute(
  WrappedComponent: React.ComponentType<any>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function WithProtectedRouteWrapper(props: any) {
    const [mounted, setMounted] = useState(false);
    
    // Add a delay to ensure the router is available
    useEffect(() => {
      const timer = setTimeout(() => {
        setMounted(true);
      }, 50);
      
      return () => clearTimeout(timer);
    }, []);
    
    if (!mounted) {
      return <SkeletonPage />;
    }
    
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}

// Example usage:
// const ProtectedDashboard = withProtectedRoute(Dashboard, {
//   allowedRoles: ['admin', 'doctor'],
//   requireAuth: true,
// }); 