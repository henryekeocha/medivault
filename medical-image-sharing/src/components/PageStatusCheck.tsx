'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import LoadingScreen from '@/components/common/LoadingScreen';
import { routes } from '@/config/routes';

interface PageStatusCheckProps {
  children: React.ReactNode;
}

const PageStatusCheck: React.FC<PageStatusCheckProps> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;

    // List of public routes that don't require authentication
    const publicRoutes = [
      routes.root.home,
      routes.root.login,
      routes.root.register,
      routes.root.forgotPassword,
      routes.root.resetPassword,
      routes.root.verifyEmail,
      '/api/webhook/clerk',
      '/api/webhook/stripe',
    ];

    // If the user is not signed in and trying to access a protected route
    if (!isSignedIn && !publicRoutes.includes(pathname as any)) {
      router.push(routes.root.login);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

export default PageStatusCheck; 