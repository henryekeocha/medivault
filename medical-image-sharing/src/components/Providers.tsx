'use client';

import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { CognitoAuthProvider } from '@/contexts/CognitoAuthContext';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import enUS from 'date-fns/locale/en-US';
import { WebSocketService } from '@/lib/api/services/websocket.service'; 
import { CollaborationService } from '@/lib/api/services/collaboration.service';
import { AmplifyProvider } from '@/components/AmplifyProvider';
import SessionManager from '@/components/auth/SessionManager';

// Custom hook for service initialization
const useServices = () => {
  const [initialized, setInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (initialized) return;
    
    // Wrap in a try-catch to prevent any initialization errors from breaking the app
    try {
      // Get singleton instances and initialize them
      const wsService = WebSocketService.getInstance();
      wsService.initialize(); // Only initialize, don't connect yet
      
      const collabService = CollaborationService.getInstance();
      
      console.log('Services initialized successfully');
      setInitialized(true);
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  }, [initialized]);
  
  return initialized;
};

// Service initializer component that doesn't use render-time initialization
const ServiceInitializer = () => {
  // This will only run the effect after render, avoiding any render-phase updates
  useServices();
  return null;
};

// Safe WebSocket Provider wrapper that catches errors
const SafeWebSocketProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Add a custom error boundary just for WebSocketProvider to prevent crashes
  const [hasError, setHasError] = React.useState(false);
  
  // If there was an error with WebSocketProvider, just render children without it
  if (hasError) {
    console.warn('WebSocketProvider encountered an error and was disabled');
    return <>{children}</>;
  }
  
  try {
    return (
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    );
  } catch (error) {
    console.error('Error rendering WebSocketProvider:', error);
    setHasError(true);
    return <>{children}</>;
  }
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AmplifyProvider>
      <NextThemesProvider 
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <ThemeProvider>
          <GlobalErrorBoundary>
            <AuthProvider>
              <CognitoAuthProvider>
                <ToastProvider>
                  <SafeWebSocketProvider>
                    <NotificationProvider>
                      <AccessibilityProvider>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
                          <ServiceInitializer />
                          <SessionManager>
                            {children}
                          </SessionManager>
                        </LocalizationProvider>
                      </AccessibilityProvider>
                    </NotificationProvider>
                  </SafeWebSocketProvider>
                </ToastProvider>
              </CognitoAuthProvider>
            </AuthProvider>
          </GlobalErrorBoundary>
        </ThemeProvider>
      </NextThemesProvider>
    </AmplifyProvider>
  );
} 