'use client';

import { useEffect, createContext, useContext, ReactNode, useCallback, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { WebSocketService } from '@/lib/api/services/websocket.service';
import { Socket } from 'socket.io-client';
import { debounce } from 'lodash';
import { Alert } from '@mui/material';

// Create a null WebSocket context value for server-side rendering
const nullContextValue = {
  isConnected: false,
  socket: null,
  connect: async () => {},
  disconnect: () => {},
  sendMessage: () => {},
  onMessage: () => () => {},
  onImageEvent: () => () => {},
  onAnnotationEvent: () => () => {},
  onShareEvent: () => () => {},
  onNotificationEvent: () => () => {},
  connectionError: null,
  isUnavailable: false,
};

interface WebSocketContextValue {
  // Connection status
  isConnected: boolean;
  socket: Socket | null;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Message methods
  sendMessage: (event: string, data: any) => void;
  
  // Subscription methods
  onMessage: (event: string, callback: (data: any) => void) => () => void;
  onImageEvent: (callback: (data: any) => void) => () => void;
  onAnnotationEvent: (callback: (data: any) => void) => () => void;
  onShareEvent: (callback: (data: any) => void) => () => void;
  onNotificationEvent: (callback: (data: any) => void) => () => void;
  connectionError: string | null;
  isUnavailable: boolean;
}

// Create the context with a default value that's safe for SSR
const WebSocketContext = createContext<WebSocketContextValue>(nullContextValue);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const wsService = useRef<WebSocketService | null>(null);
  const hasAttemptedConnection = useRef(false);
  const syncAttempts = useRef(0);
  const MAX_SYNC_ATTEMPTS = 3;

  const handleConnectionEstablished = useCallback((data: any) => {
    console.log('WebSocketProvider: Connection established', data);
    setIsConnected(true);
    setConnectionError(null);
    setIsUnavailable(false);
    
    const service = wsService.current;
    if (service) {
      setSocket(service.getSocket());
    }
  }, []);

  const handleConnectionError = useCallback((data: any) => {
    console.log('WebSocketProvider: Connection error', data);
    setConnectionError(data.message || 'Connection error');
    setIsConnected(false);
    
    // If error contains "User not found" or similar, it might be a sync issue
    if (data.message && (
      data.message.includes('User not found') || 
      data.message.includes('not found in database') ||
      data.message.includes('sync')
    )) {
      syncAttempts.current += 1;
      if (syncAttempts.current >= MAX_SYNC_ATTEMPTS) {
        console.warn(`Max sync attempts (${MAX_SYNC_ATTEMPTS}) reached. Sync appears to be failing.`);
        setSyncFailed(true);
      }
    }
  }, []);

  const handleConnectionUnavailable = useCallback((data: any) => {
    console.log('WebSocketProvider: WebSocket server unavailable', data);
    setIsUnavailable(true);
    setConnectionError('WebSocket server unavailable');
    setIsConnected(false);
  }, []);

  const handleConnectionFailed = useCallback((data: any) => {
    console.log('WebSocketProvider: Connection failed', data);
    setConnectionError(data.message || 'Connection failed after multiple attempts');
    setIsConnected(false);
  }, []);

  const handleConnectionClosed = useCallback((data: any) => {
    console.log('WebSocketProvider: Connection closed', data);
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!wsService.current) {
      console.log('WebSocketProvider: Service not initialized yet');
      return;
    }

    if (isUnavailable) {
      console.log('WebSocketProvider: Server previously marked as unavailable, skipping connection');
      return;
    }

    if (syncFailed) {
      console.log('WebSocketProvider: User sync failed repeatedly, skipping connection');
      return;
    }

    console.log('WebSocketProvider: Attempting to connect');
    await wsService.current.connect();
  }, [isUnavailable, syncFailed]);

  const disconnect = useCallback(() => {
    if (!wsService.current) return;
    
    wsService.current.disconnect();
    setIsConnected(false);
    setSocket(null);
  }, []);

  const sendMessage = useCallback((event: string, data: any) => {
    if (!wsService.current || !isConnected) return;
    wsService.current.sendMessage(event, data);
  }, [isConnected]);

  const onMessage = useCallback((event: string, callback: (data: any) => void) => {
    if (!wsService.current) return () => {};
    return wsService.current.on(event, callback);
  }, []);

  const onImageEvent = useCallback((callback: (data: any) => void) => {
    return onMessage('image:update', callback);
  }, [onMessage]);

  const onAnnotationEvent = useCallback((callback: (data: any) => void) => {
    return onMessage('annotation:update', callback);
  }, [onMessage]);

  const onShareEvent = useCallback((callback: (data: any) => void) => {
    return onMessage('share:update', callback);
  }, [onMessage]);

  const onNotificationEvent = useCallback((callback: (data: any) => void) => {
    return onMessage('notification', callback);
  }, [onMessage]);

  // Initialize WebSocket service
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !wsService.current) {
        wsService.current = WebSocketService.getInstance();
        console.log('WebSocketProvider: Service initialized');
      }
    } catch (error) {
      console.error('WebSocketProvider: Error initializing service', error);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!wsService.current) return;

    const unsubscribeEstablished = wsService.current.on('connection:established', handleConnectionEstablished);
    const unsubscribeError = wsService.current.on('connection:error', handleConnectionError);
    const unsubscribeUnavailable = wsService.current.on('connection:unavailable', handleConnectionUnavailable);
    const unsubscribeFailed = wsService.current.on('connection:failed', handleConnectionFailed);
    const unsubscribeClosed = wsService.current.on('connection:closed', handleConnectionClosed);

    return () => {
      unsubscribeEstablished();
      unsubscribeError();
      unsubscribeUnavailable();
      unsubscribeFailed();
      unsubscribeClosed();
    };
  }, [
    handleConnectionEstablished, 
    handleConnectionError, 
    handleConnectionUnavailable,
    handleConnectionFailed, 
    handleConnectionClosed
  ]);

  // Handle connection when auth status changes
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId && wsService.current && !isUnavailable && !syncFailed) {
      console.log('WebSocketProvider: User is signed in, connecting...');
      
      if (!hasAttemptedConnection.current) {
        hasAttemptedConnection.current = true;
        connect();
      }
    } else if (!isSignedIn && isConnected) {
      console.log('WebSocketProvider: User signed out, disconnecting');
      disconnect();
      hasAttemptedConnection.current = false;
      syncAttempts.current = 0;
    }
  }, [isLoaded, isSignedIn, userId, connect, disconnect, isConnected, isUnavailable, syncFailed]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wsService.current) {
        wsService.current.disconnect();
      }
    };
  }, []);

  const contextValue = {
    isConnected,
    socket,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    onImageEvent,
    onAnnotationEvent,
    onShareEvent,
    onNotificationEvent,
    connectionError,
    isUnavailable
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
      {connectionError && !isUnavailable && !syncFailed && (
        <Alert severity="warning" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, maxWidth: 400 }}>
          WebSocket connection issue: {connectionError}
        </Alert>
      )}
      {isUnavailable && (
        <Alert severity="info" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, maxWidth: 400 }}>
          WebSocket server is unavailable. Some real-time features may not work.
        </Alert>
      )}
      {syncFailed && (
        <Alert severity="error" sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, maxWidth: 400 }}>
          User synchronization failed. Please refresh the page or contact support if the issue persists.
        </Alert>
      )}
    </WebSocketContext.Provider>
  );
} 