'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_ROUTES, UserRole } from '@/config/routes';
import HomeContent from '@/components/landing/HomeContent';
import { Route } from 'next';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (user?.role && !isRedirecting) {
      setIsRedirecting(true);
      const roleKey = user.role.toUpperCase() as keyof typeof DEFAULT_ROUTES;
      router.push(DEFAULT_ROUTES[roleKey] as Route);
    }
  }, [user, router, isRedirecting]); 

  // If user is not authenticated, show the home page content
  if (!user?.role) {
    return <HomeContent />;
  }

  // Show loading state while redirecting
  if (isRedirecting) {
    return <div>Redirecting...</div>;
  }

  // This should never be reached, but return null as a fallback
  return null;
} 