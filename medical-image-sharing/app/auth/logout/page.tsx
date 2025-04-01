'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { routes } from '@/config/routes';
import type { Route } from 'next';

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Use Clerk signOut
        await signOut();

        // Redirect to login page using the route from our configuration
        router.push(routes.root.login as Route);
      } catch (error) {
        console.error('Error during logout:', error);
        // Still redirect to login page even if there's an error
        router.push(routes.root.login as Route);
      }
    };

    handleLogout();
  }, [router, signOut]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Signing out...</h1>
        <p className="text-gray-600">Please wait while we complete the sign-out process.</p>
      </div>
    </div>
  );
} 