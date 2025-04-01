'use client';

import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import enUS from 'date-fns/locale/en-US';
import { WebSocketService } from '@/lib/api/services/websocket.service'; 
import { CollaborationService } from '@/lib/api/services/collaboration.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Custom hook for service initialization
const useServices = () => {
  const [initialized, setInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (initialized) return;
    
    // Wrap in a try-catch to prevent any initialization errors from breaking the app
    try {
      // Get singleton instances
      const wsService = WebSocketService.getInstance();
      // Just getting the instance is enough, it initializes internally in the constructor
      
      const collabService = CollaborationService.getInstance();
      // All services are now designed to initialize themselves when created
      
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
  
  React.useEffect(() => {
    // Setup error handling for WebSocket connection errors
    const handleWebSocketError = () => {
      console.error('WebSocket connection error detected');
      setHasError(true);
    };
    
    window.addEventListener('websocket:error', handleWebSocketError);
    
    return () => {
      window.removeEventListener('websocket:error', handleWebSocketError);
    };
  }, []);
  
  // If there was an error with WebSocketProvider, just render children without it
  if (hasError) {
    console.warn('WebSocketProvider encountered an error and was disabled');
    return <>{children}</>;
  }
  
  // Use error boundary pattern with try/catch
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
    <NextThemesProvider 
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <ThemeProvider>
        <GlobalErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <SafeWebSocketProvider>
                <NotificationProvider>
                  <AccessibilityProvider>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
                      <ServiceInitializer />
                      {children}
                    </LocalizationProvider>
                  </AccessibilityProvider>
                </NotificationProvider>
              </SafeWebSocketProvider>
            </ToastProvider>
          </QueryClientProvider>
        </GlobalErrorBoundary>
      </ThemeProvider>
    </NextThemesProvider>
  );
} 