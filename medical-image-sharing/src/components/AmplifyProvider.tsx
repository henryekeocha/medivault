'use client';

import { useEffect, useState } from 'react';
import { configureAmplify } from '@/lib/amplify/config';

/**
 * AmplifyProvider initializes AWS Amplify on the client side
 * 
 * This component ensures Amplify is only configured in the browser environment
 * and not during server-side rendering, preventing hydration errors.
 */
export function AmplifyProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only configure Amplify on the client side
    if (typeof window !== 'undefined') {
      configureAmplify();
      setInitialized(true);
    }
  }, []);

  // Render children regardless of initialization status
  // This prevents any delay in rendering the application
  return <>{children}</>;
} 