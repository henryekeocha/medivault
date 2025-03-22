'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/common/LoadingScreen';

export default function PageStatusCheck({ children }: { children: React.ReactNode }) {
  const [isRouterReady, setIsRouterReady] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const pathname = usePathname();
  const { loading: authLoading, checkAuth, isAuthenticated } = useAuth();
  const { status: sessionStatus, data: session } = useSession();
  const [message, setMessage] = useState('Loading application...');

  useEffect(() => {
    if (pathname) {
      setIsRouterReady(true);
    }
  }, [pathname]);

  useEffect(() => {
    // Update loading message based on current state
    if (sessionStatus === 'loading') {
      setMessage('Checking your session...');
    } else if (authLoading || isAuthChecking) {
      setMessage('Loading your profile...');
    } else if (!isRouterReady) {
      setMessage('Preparing application...');
    }
  }, [sessionStatus, authLoading, isRouterReady, isAuthChecking]);

  // Enhanced auth check with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const performAuthCheck = async () => {
      if (sessionStatus === 'authenticated' && !isAuthenticated && !isAuthChecking) {
        setIsAuthChecking(true);
        try {
          await checkAuth();
        } finally {
          setIsAuthChecking(false);
        }
      }
    };

    // Set a timeout to prevent infinite loading
    if (sessionStatus === 'authenticated' && !isAuthenticated) {
      timeoutId = setTimeout(() => {
        setIsAuthChecking(false);
      }, 5000); // 5 second timeout
      
      performAuthCheck();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sessionStatus, isAuthenticated, checkAuth, isAuthChecking]);

  // Prevent infinite loading by allowing render after timeout
  const shouldShowLoading = !isRouterReady || 
    sessionStatus === 'loading' || 
    (authLoading && isAuthChecking);

  if (shouldShowLoading) {
    return <LoadingScreen message={message} />;
  }

  return <>{children}</>;
} 