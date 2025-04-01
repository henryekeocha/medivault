'use client';

import { 
  WebSocketProvider as NewWebSocketProvider, 
  useWebSocket as useNewWebSocket 
} from '@/components/providers/WebSocketProvider';

// Re-export the new implementation to maintain backward compatibility
export const WebSocketProvider = NewWebSocketProvider;
export const useWebSocket = useNewWebSocket;

// This file now re-exports the components from our new implementation
// All existing components using this context will now use the new implementation 