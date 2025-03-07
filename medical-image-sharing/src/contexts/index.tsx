import React from 'react';
import { AuthProvider } from './AuthContext';
import { WebSocketProvider } from './WebSocketContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </AuthProvider>
  );
}

export { useAuth } from './AuthContext';
export { useWebSocket } from './WebSocketContext'; 