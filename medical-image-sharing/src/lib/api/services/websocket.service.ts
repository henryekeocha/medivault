import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

// Define WebSocketEvent interface
interface WebSocketEvent {
  type: string;
  data: any;
  timestamp?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private authService: AuthService;
  private initialized = false;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Initialize and connect only when explicitly called, not on instantiation
  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('WebSocketService initialized - ready to connect');
    // We don't automatically connect here, wait for explicit connect() call
  }

  connect() {
    if (!this.initialized) {
      this.initialize();
    }

    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token available');
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      extraHeaders: {
        'Origin': window.location.origin
      }
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      console.log(`Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('message', (event: WebSocketEvent) => {
      this.handleEvent(event);
    });
  }

  private handleEvent(event: WebSocketEvent) {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event.data));
    }
  }

  subscribe<T>(eventType: string, handler: (data: T) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    };
  }

  emit(eventType: string, data: any) {
    if (!this.socket?.connected) {
      throw new Error('WebSocket is not connected');
    }

    this.socket.emit('message', {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // Specific event subscriptions
  onImageUpdate(handler: (data: { imageId: string; status: string }) => void) {
    return this.subscribe('image:update', handler);
  }

  onAnnotationCreate(handler: (data: { imageId: string; annotation: any }) => void) {
    return this.subscribe('annotation:create', handler);
  }

  onShareCreate(handler: (data: { imageId: string; share: any }) => void) {
    return this.subscribe('share:create', handler);
  }

  onNotification(handler: (data: { type: string; message: string }) => void) {
    return this.subscribe('notification', handler);
  }
} 