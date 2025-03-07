'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function PageStatusCheck({ children }: { children: React.ReactNode }) {
  const [isRouterReady, setIsRouterReady] = useState(false);
  const pathname = usePathname();
  const { loading } = useAuth();

  useEffect(() => {
    // Set router as ready once we have a pathname
    if (pathname) {
      setIsRouterReady(true);
    }
  }, [pathname]);

  // Don't render children until router is ready
  if (!isRouterReady || loading) {
    return <div>Loading application...</div>;
  }

  return <>{children}</>;
} 