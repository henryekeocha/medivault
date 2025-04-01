import React from 'react';
import { WebSocketProvider } from './WebSocketContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <WebSocketProvider>
      {children}
    </WebSocketProvider>
  );
}

export { WebSocketProvider } from './WebSocketContext';
export { useWebSocket } from './WebSocketContext';
export { ToastProvider } from './ToastContext';
export { useToast } from './ToastContext';
export { NotificationProvider } from './NotificationContext';
export { useNotifications } from './NotificationContext'; 