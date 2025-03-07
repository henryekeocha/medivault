'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/Toast';
import { io, Socket } from 'socket.io-client';

// Define types for the WebSocket context
interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
  
  // Subscription methods
  onImageEvent: (callback: (data: any) => void) => () => void;
  onAnnotationEvent: (callback: (data: any) => void) => () => void;
  onShareEvent: (callback: (data: any) => void) => () => void;
  onNotificationEvent: (callback: (data: any) => void) => () => void;
  onMessage: (event: string, callback: (data: any) => void) => () => void;
}

// Null toast object for when toast is not available
const nullToast = {
  showSuccess: (message: string) => { console.log('Toast success (unavailable):', message); },
  showError: (message: string) => { console.error('Toast error (unavailable):', message); },
  showWarning: (message: string) => { console.warn('Toast warning (unavailable):', message); },
  showInfo: (message: string) => { console.info('Toast info (unavailable):', message); }
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, loading } = useAuth();
  
  // Use toast hook unconditionally
  const toast = useToast();
  
  // Store toast in ref to avoid re-renders
  const toastRef = useRef(toast || nullToast);
  
  // Update toast ref when toast changes
  useEffect(() => {
    if (toast) {
      toastRef.current = toast;
    }
  }, [toast]);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000;
  const reconnectAttemptsRef = useRef(0);
  const toastShownRef = useRef(false);

  // Socket connection setup - separated logic for clarity
  const setupSocket = useCallback(() => {
    if (loading || !user) return null;
    
    const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('WebSocket: No token available for authentication');
      return null;
    }
    
    console.log('Connecting to WebSocket with token', token.substring(0, 10) + '...');
    
    return io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      transports: ['websocket', 'polling']
    });
  }, [user, loading]);

  // Handle connection events and cleanup
  useEffect(() => {
    // Don't attempt connection if loading or no user
    if (loading) return;
    
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }
    
    // Check token before attempting connection
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Cannot connect to WebSocket: No authentication token found');
      return;
    }
    
    // Setup socket connection
    const socket = setupSocket();
    if (!socket) return;
    
    // Set up connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Use queueMicrotask for smoother execution with less chance of issues
      queueMicrotask(() => {
        if (!toastShownRef.current) {
          toastRef.current.showSuccess("Connection to real-time updates established");
          toastShownRef.current = true;
        }
      });
    });

    socket.on('disconnect', (reason: string) => {
      console.log(`WebSocket disconnected: ${reason}`);
      setIsConnected(false);
      toastShownRef.current = false;
      
      // Use queueMicrotask instead of setTimeout
      queueMicrotask(() => {
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, reconnect manually
          toastRef.current.showError("Server closed connection. Attempting to reconnect...");
          socket.connect();
        } else if (reason !== 'io client disconnect') {
          // show warning only if it's not a normal client-initiated disconnect
          toastRef.current.showWarning("Connection to server lost. Reconnecting...");
        }
      });
    });

    socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      
      queueMicrotask(() => {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          toastRef.current.showError(`Failed to connect: ${error.message}. Retrying...`);
          reconnectAttemptsRef.current += 1;
        } else {
          toastRef.current.showError("Maximum reconnection attempts reached. Please refresh the page.");
        }
      });
    });

    socketRef.current = socket;

    // Cleanup on unmount or when dependencies change
    return () => {
      toastShownRef.current = false;
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [setupSocket]);  // Only depend on the setupSocket callback which has stable dependencies

  // Add a listener for storage events to reconnect when token changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token' && socketRef.current) {
        console.log('Token changed, reconnecting WebSocket');
        socketRef.current.disconnect();
        socketRef.current.auth = { token: event.newValue };
        socketRef.current.connect();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Send a message through the WebSocket
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, [isConnected]);

  // Subscription methods - memoized with useCallback to prevent unnecessary re-renders
  const onImageEvent = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('image', callback);
    return () => {
      socketRef.current?.off('image', callback);
    };
  }, []);

  const onAnnotationEvent = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('annotation', callback);
    return () => {
      socketRef.current?.off('annotation', callback);
    };
  }, []);

  const onShareEvent = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('share', callback);
    return () => {
      socketRef.current?.off('share', callback);
    };
  }, []);

  const onNotificationEvent = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};
    
    socketRef.current.on('notification', callback);
    return () => {
      socketRef.current?.off('notification', callback);
    };
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    sendMessage,
    onImageEvent,
    onAnnotationEvent,
    onShareEvent,
    onNotificationEvent,
    onMessage: (event: string, callback: (data: any) => void) => {
      if (!socketRef.current) return () => {};
      
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
  }), [isConnected, sendMessage, onImageEvent, onAnnotationEvent, onShareEvent, onNotificationEvent]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Example usage:
// const MyComponent = () => {
//   const { isConnected, subscribe, sendMessage } = useWebSocket();
//
//   useEffect(() => {
//     const unsubscribe = subscribe('chat_message', (payload) => {
//       console.log('New chat message:', payload);
//     });
//
//     return () => unsubscribe();
//   }, []);
//
//   const handleSend = () => {
//     sendMessage('chat_message', { text: 'Hello!' });
//   };
//
//   return (
//     <div>
//       <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
//       <button onClick={handleSend}>Send Message</button>
//     </div>
//   );
// }; 