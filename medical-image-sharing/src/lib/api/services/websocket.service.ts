import { io, Socket } from 'socket.io-client';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/clerk-react';

// Augment window type with Clerk global
declare global {
  interface Window {
    Clerk?: any;
    __syncAttempts?: number;
    __syncBlocked?: boolean;
  }
}

// Define WebSocketEvent interface
interface WebSocketEvent {
  type: string;
  data: any;
  timestamp?: string;
}

// Global flag to prevent multiple sync attempts
let isSyncingUser = false;

/**
 * WebSocketService for handling real-time communication
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private events: WebSocketEvent[] = [];
  private initialized = false;
  private connecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // Start with 2 seconds
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.initialize();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize service
   */
  private initialize() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('WebSocket service initialized');
  }

  /**
   * Check if user is properly synced with database
   */
  private async checkUserSync(userId: string): Promise<boolean> {
    try {
      if (!this.isBrowser || !window.Clerk || !userId) {
        return false;
      }

      // First check if user has the dbSynced flag in metadata
      const user = window.Clerk.user;
      if (user?.publicMetadata?.dbSynced === true) {
        console.log('User is already synced according to metadata');
        return true;
      }

      // Static counter to track sync attempts across page views
      if (typeof window.__syncAttempts === 'undefined') {
        window.__syncAttempts = 0;
      }
      
      // If we've exceeded max attempts, don't keep trying
      const MAX_SYNC_ATTEMPTS = 3;
      if (window.__syncAttempts >= MAX_SYNC_ATTEMPTS) {
        console.warn(`Maximum sync attempts (${MAX_SYNC_ATTEMPTS}) reached, stopping further attempts`);
        // Set a temporary flag to prevent more attempts in this session
        window.__syncBlocked = true;
        return false;
      }

      // If not synced according to metadata, try to sync
      if (isSyncingUser) {
        console.log('Sync already in progress, waiting...');
        // Wait for ongoing sync to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.checkUserSync(userId); // Retry after waiting
      }

      // Track this sync attempt
      window.__syncAttempts++;
      isSyncingUser = true;
      
      try {
        // Attempt to synchronize with database
        console.log(`Attempting to sync user with database (attempt ${window.__syncAttempts}/${MAX_SYNC_ATTEMPTS})`);
        const token = await window.Clerk.session.getToken();
        
        // First try to just sync user
        const response = await fetch(`/api/auth/sync/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        // If initial sync failed with 404 (user not found), try to create user
        if (response.status === 404) {
          console.log('User not found in database, attempting to create...');
          
          const user = window.Clerk.user;
          // Get user profile data from Clerk
          const userData = {
            authId: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.primaryEmailAddress?.emailAddress || '',
            username: user.username || user.id,
            emailVerified: user.primaryEmailAddress?.verification?.status === 'verified',
            image: user.imageUrl || '',
            role: 'USER',
            specialty: 'GENERAL'
          };
          
          // Call create endpoint
          const createResponse = await fetch(`/api/auth/users/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
          });
          
          if (!createResponse.ok) {
            throw new Error(`Failed to create user, status: ${createResponse.status}`);
          }
          
          const createData = await createResponse.json();
          console.log('User creation result:', createData);
          
          // Update metadata to reflect successful sync after creation
          if (createData.success && createData.user) {
            await window.Clerk.user.update({
              publicMetadata: { 
                ...window.Clerk.user.publicMetadata,
                dbSynced: true,
                dbUserId: createData.user.id,
                lastSyncAttempt: new Date().toISOString()
              }
            });
            
            // Reset counter on success
            window.__syncAttempts = 0;
            return true;
          }
          
          return false;
        }

        if (!response.ok) {
          throw new Error(`Sync failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('User sync result:', data);

        // Update metadata to reflect successful sync
        if (data.success && data.user) {
          await window.Clerk.user.update({
            publicMetadata: { 
              ...window.Clerk.user.publicMetadata,
              dbSynced: true,
              dbUserId: data.user.id,
              lastSyncAttempt: new Date().toISOString()
            }
          });
          
          // Reset counter on success
          window.__syncAttempts = 0;
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Error during user sync:', error);
        return false;
      } finally {
        isSyncingUser = false;
      }
    } catch (error) {
      console.error('Error checking user sync:', error);
      return false;
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect() {
    // Skip connection if not in browser
    if (!this.isBrowser) return;
    
    if (!this.initialized) {
      this.initialize();
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    // Prevent multiple simultaneous connect attempts
    if (this.connecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    this.connecting = true;

    try {
      // Check if server is available first (pre-flight check)
      let serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const backupServerUrl = serverUrl.replace('localhost', '127.0.0.1');
      console.log(`Attempting to connect to WebSocket server at ${serverUrl}, backup: ${backupServerUrl}`);
      
      // Try primary URL - Convert WS URLs to HTTP for health checks
      try {
        const healthCheckUrl = serverUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://') + '/api/health';
        console.log(`Checking server health at: ${healthCheckUrl}`);
        
        const preflight = await fetch(healthCheckUrl, { 
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(2000) // 2 second timeout
        }).catch(err => {
          console.log(`Primary health check failed: ${err.message}`);
          return null;
        });
        
        if (!preflight || !preflight.ok) {
          console.log(`Primary server not available, trying backup at ${backupServerUrl}`);
          
          // Try backup URL - Convert WS URLs to HTTP for health checks
          const backupHealthCheckUrl = backupServerUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://') + '/api/health';
          console.log(`Checking backup server health at: ${backupHealthCheckUrl}`);
          
          const backupPreflight = await fetch(backupHealthCheckUrl, { 
            method: 'GET',
            cache: 'no-cache',
            headers: {
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(2000) // 2 second timeout
          }).catch(() => null);
          
          if (backupPreflight && backupPreflight.ok) {
            console.log('Backup server is available, switching to it');
            serverUrl = backupServerUrl;
          } else {
            // Both servers unavailable
            this.dispatchEvent('connection:unavailable', { message: 'WebSocket server unavailable' });
            this.connecting = false;
            return;
          }
        }
      } catch (e) {
        // If the pre-flight check fails, skip the WebSocket connection
        console.warn('WebSocket server pre-flight check failed - skipping connection');
        this.dispatchEvent('connection:unavailable', { message: 'WebSocket server unavailable' });
        this.connecting = false;
        return;
      }

      // Verify Clerk is available and user is authenticated
      if (!window.Clerk) {
        console.warn('Clerk is not initialized');
        this.dispatchEvent('connection:error', { message: 'Authentication service not initialized' });
        this.connecting = false;
        return;
      }

      // Check if there's an active session first
      if (!window.Clerk.session) {
        console.warn('No active Clerk session available');
        this.dispatchEvent('connection:error', { message: 'No active session' });
        this.connecting = false;
        return;
      }

      const userId = window.Clerk.user?.id;
      if (!userId) {
        console.warn('No user ID available');
        this.dispatchEvent('connection:error', { message: 'User not authenticated' });
        this.connecting = false;
        return;
      }

      console.log('WebSocketProvider: User is signed in, connecting...');

      // Check if user is synced with database
      const isSynced = await this.checkUserSync(userId);
      if (!isSynced) {
        console.warn('User not synced with database, limited functionality might be available');
        // Continue connecting - the backend will provide limited access
      }

      // Get the Clerk session token
      let token = '';
      try {
        token = await window.Clerk.session.getToken();
        if (!token) {
          console.warn('Could not extract token from Clerk session');
          this.dispatchEvent('connection:error', { message: 'Authentication token not available' });
          this.connecting = false;
          return;
        }
        console.log('Got Clerk authentication token for WebSocket connection');
      } catch (tokenError) {
        console.error('Failed to get token from Clerk session:', tokenError);
        this.dispatchEvent('connection:error', { message: 'Failed to get authentication token' });
        this.connecting = false;
        return;
      }

      // Get the correct WebSocket URL from environment or use a default
      const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      console.log(`Connecting to WebSocket server at: ${SOCKET_URL}`);

      // Connection error handler
      const connectionErrorHandler = (error: any) => {
        console.error('WebSocket connection error:', error);
        this.dispatchEvent('connection:error', { message: 'Connection error', error });
        
        // Don't attempt reconnection if the connection was refused - the server is likely not running
        if (error && error.message && (
          error.message.includes('refused') || 
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('xhr poll error')
        )) {
          console.warn('Connection refused - server may not be running. Not attempting reconnection.');
          this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
          this.dispatchEvent('connection:unavailable', { message: 'WebSocket server unavailable' });
        } else {
          this.reconnect();
        }
      };

      // Continue with connection after health check passes
      console.log('WebSocket server is available, proceeding with connection');
      
      // Get user token
      let userToken = null;
      if (window.Clerk?.session) {
        userToken = await window.Clerk.session.getToken().catch((err: any) => {
          console.error('Failed to get session token:', err);
          return null;
        });
      }

      if (!userToken) {
        console.warn('No authentication token available for WebSocket connection');
        this.dispatchEvent('connection:error', { message: 'Authentication required' });
        this.connecting = false;
        return;
      }

      // Check if user is synced with database
      const userUserId = window.Clerk?.user?.id;
      if (userUserId && !window.__syncBlocked) {
        const isSynced = await this.checkUserSync(userUserId);
        if (!isSynced) {
          console.warn('User is not synchronized with database - connection may fail');
        }
      }

      // Configure socket with extra headers
      const socketOptions = {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        rejectUnauthorized: false,
        secure: serverUrl.startsWith('https'),
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        extraHeaders: {
          'x-request-id': `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        },
        auth: {
          token: userToken
        }
      };

      // Create Socket.IO instance
      console.log(`Connecting to ${serverUrl} with options:`, socketOptions);
      this.socket = io(serverUrl, socketOptions);

      // Setup socket event handlers
      // Listen for connect event
      this.socket.on('connect', () => {
        console.log(`WebSocket connected successfully with ID: ${this.socket?.id}`);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000; // Reset delay
        this.dispatchEvent('connection:established', { socketId: this.socket?.id });
      });

      this.socket.on('connect_error', connectionErrorHandler);
      this.socket.on('error', connectionErrorHandler);

      this.socket.on('disconnect', (reason) => {
        console.log(`WebSocket disconnected: ${reason}`);
        this.dispatchEvent('connection:closed', { reason });
        
        // Auto-reconnect for unexpected disconnects
        if (reason === 'io server disconnect' || reason === 'transport close') {
          this.reconnect();
        }
      });

      this.socket.on('auth:status', (status) => {
        console.log('WebSocket authentication status:', status);
        this.dispatchEvent('auth:status', status);
      });

      this.socket.on('auth:error', (error) => {
        console.error('WebSocket authentication error:', error);
        this.dispatchEvent('auth:error', error);
      });

      // Connect after setting up all listeners with a timeout
      try {
        const connectPromise = new Promise<void>((resolve, reject) => {
          if (!this.socket) {
            reject(new Error('Socket not initialized'));
            return;
          }
          
          // Set up a one-time connect event listener
          this.socket.once('connect', () => resolve());
          
          // Set up a one-time connect_error event listener
          this.socket.once('connect_error', (err) => reject(err));
          
          // Call connect
          this.socket.connect();
        });
        
        // Wait for connection with timeout
        await Promise.race([
          connectPromise,
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
      } catch (connectionError) {
        console.error('Failed to connect to WebSocket server:', connectionError);
        connectionErrorHandler(connectionError);
      }
    } catch (error) {
      console.error('Error during WebSocket connection setup:', error);
      this.dispatchEvent('connection:error', { message: 'Connection setup failed', error });
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Manual reconnection with exponential backoff
   */
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached, stopping`);
      this.dispatchEvent('connection:failed', { message: 'Maximum reconnect attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Dispatch an event to listeners
   */
  private dispatchEvent(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }

    // Store event for debugging
    this.events.push({
      type: event,
      data,
      timestamp: new Date().toISOString()
    });

    // Limit event history
    if (this.events.length > 100) {
      this.events.shift();
    }
  }

  /**
   * Send a message to the server
   */
  sendMessage(event: string, data: any) {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }
    
    console.log(`Sending ${event}:`, data);
    this.socket.emit(event, data);
  }

  /**
   * Register an event listener
   */
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.add(callback);
    
    // Also register with socket if it exists
    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (this.socket) {
          this.socket.off(event, callback);
        }
      }
    };
  }

  /**
   * Get current socket
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get event history for debugging
   */
  getEventHistory(): WebSocketEvent[] {
    return [...this.events];
  }
} 