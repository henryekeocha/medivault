import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { encryptData, decryptData } from '../middleware/encryption.js';
import prisma from '../lib/prisma.js';
import type { User, Appointment } from '@prisma/client';
import { Socket } from 'socket.io';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { AppointmentWithUsers } from '../types/models.js';

interface FileProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'encrypting' | 'completed' | 'error';
  error?: string;
}

interface ViewerState {
  userId: string;
  userName: string;
  currentPage: number;
  scale: number;
  position: { x: number; y: number };
}

interface Annotation {
  id: string;
  fileId: string;
  userId: string;
  userName: string;
  type: 'highlight' | 'comment' | 'drawing';
  content: any;
  position: { x: number; y: number };
  timestamp: Date;
}

export class WebSocketService {
  private io: Server;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private fileProgress: Map<string, FileProgress> = new Map();
  private activeViewers: Map<string, Map<string, ViewerState>> = new Map(); // fileId -> Map<userId, ViewerState>
  private fileAnnotations: Map<string, Annotation[]> = new Map();
  private socketUserMap: Map<string, { id: string; name: string; email?: string; role: string; isAnonymous: boolean }> = new Map();

  constructor(server: HTTPServer) {
    console.log('WebSocketService: Creating Socket.IO server');
    
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: [
          'Content-Type', 
          'Authorization', 
          'X-Requested-With', 
          'Origin', 
          'Accept',
          'x-request-id',
          'x-clerk-auth-token',
          'x-clerk-user-id'
        ]
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      allowEIO3: true,
      maxHttpBufferSize: 1e6, // 1MB
      allowRequest: (req, callback) => {
        // Log request details
        console.log(`WebSocketService: Received connection request from ${req.headers.origin} with path ${req.url}`);
        
        // Always allow WebSocket connections for now, we'll authenticate in the middleware
        callback(null, true);
      }
    });

    // Global Socket.IO server event handlers
    this.io.engine.on('connection_error', (err) => {
      console.error('WebSocketService: Connection error:', err);
    });

    this.io.engine.on('headers', (headers, req) => {
      console.log('WebSocketService: Engine headers event');
    });

    console.log('WebSocketService: Socket.IO server initialized with path: /socket.io/');
    
    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const socketId = socket.id;
        console.log(`WebSocket connection attempt from ${socketId}`);
        
        // Extract token from multiple possible sources
        let extractedToken = null;
        
        // 1. Try auth.token (primary method)
        if (socket.handshake.auth && socket.handshake.auth.token) {
          extractedToken = socket.handshake.auth.token;
          console.log('WebSocket: Using token from auth object');
        }
        
        // 2. Try query parameter
        if (!extractedToken && socket.handshake.query && socket.handshake.query.token) {
          extractedToken = socket.handshake.query.token;
          if (Array.isArray(extractedToken)) {
            extractedToken = extractedToken[0];
          }
          console.log('WebSocket: Using token from query parameter');
        }
        
        // 3. Try authorization header
        if (!extractedToken && socket.handshake.headers.authorization) {
          const authHeader = socket.handshake.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            extractedToken = authHeader.split(' ')[1];
            console.log('WebSocket: Using token from Authorization header');
          }
        }
        
        // No token found in any location
        if (!extractedToken) {
          console.log(`WebSocket: No token provided for connection ${socketId}`);
          socket.emit('auth:error', { 
            type: 'NO_TOKEN',
            message: 'Authentication required. Please provide a valid token.' 
          });
          return next(new Error('Authentication token is required'));
        }
        
        console.log(`WebSocket: Found token (${extractedToken.substring(0, 10)}...) for connection ${socketId}`);
        
        // Verify Clerk JWT token
        try {
          // Ensure Clerk client is initialized
          if (!process.env.CLERK_SECRET_KEY) {
            console.error('WebSocketService: CLERK_SECRET_KEY is not defined in environment variables');
            socket.emit('auth:error', { 
              type: 'SERVER_ERROR',
              message: 'Server configuration error. Please try again later.' 
            });
            return next(new Error('Server configuration error'));
          }
          
          try {
            // Verify the Clerk JWT token
            const { sub: userId } = await clerkClient.verifyToken(extractedToken);
            
            if (!userId) {
              console.error(`WebSocketService: Invalid JWT token for connection ${socketId}`);
              socket.emit('auth:error', { 
                type: 'INVALID_TOKEN',
                message: 'Invalid token. Please log in again.' 
              });
              return next(new Error('Invalid authentication token'));
            }
                        
            // Get user from Clerk
            const clerkUser = await clerkClient.users.getUser(userId);
            if (!clerkUser) {
              console.log(`WebSocketService: Clerk user not found for connection ${socketId}`);
              socket.emit('auth:error', { message: 'User not found. Please log in again.' });
              return next(new Error('User not found'));
            }
            
            console.log(`WebSocketService: Found Clerk user ${userId} for connection ${socketId}`);
            
            // Get user from database with the Clerk authId
            const user = await prisma.user.findFirst({
              where: { authId: userId }
            });
            
            if (!user) {
              console.log(`WebSocket: User with Clerk ID ${userId} not found in database`);
              
              // Instead of disconnecting, we'll create a temporary user object with limited access
              socket.data.user = {
                id: userId,
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                authId: userId,
                role: 'GUEST',
                isAnonymous: true
              };
              
              socket.emit('auth:status', { 
                status: 'LIMITED_ACCESS',
                message: 'User not found in database. Limited access granted.'
              });
              
              // Store socket in its own room
              socket.join(`user:${userId}`);
              this.addUserSocket(userId, socket.id);
              this.socketUserMap.set(socket.id, {
                id: userId,
                name: socket.data.user.name,
                role: 'GUEST',
                isAnonymous: true
              });
              
              return next();
            }
            
            if (!user.isActive) {
              console.log(`WebSocket: User ${userId} account is inactive`);
              socket.emit('auth:error', { message: 'Your account has been deactivated.' });
              return next(new Error('Account deactivated'));
            }
            
            // Store user data in socket
            socket.data.user = {
              id: user.id,
              name: user.name || '',
              email: user.email,
              authId: user.authId,
              role: user.role,
              isAnonymous: false
            };
            
            // Emit successful authentication
            socket.emit('auth:status', { 
              status: 'AUTHENTICATED',
              user: {
                id: user.id,
                name: user.name,
                role: user.role
              }
            });
            
            // Store socket in multiple rooms for better organization
            socket.join(`user:${user.id}`);
            socket.join(`role:${user.role}`);
            
            // Keep track of user's sockets
            this.addUserSocket(user.id, socket.id);
            this.socketUserMap.set(socket.id, {
              id: user.id,
              name: user.name || '',
              email: user.email || undefined,
              role: user.role,
              isAnonymous: false
            });
            
            // Update user's last active timestamp
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { 
                  updatedAt: new Date() 
                }
              });
            } catch (updateError) {
              // Non-fatal error, just log it
              console.error('Failed to update user activity timestamp:', updateError);
            }
            
            return next();
          } catch (tokenError) {
            console.error('WebSocket: Token verification error:', tokenError);
            socket.emit('auth:error', { 
              type: 'INVALID_TOKEN',
              message: 'Invalid token. Please log in again.' 
            });
            return next(new Error('Invalid token'));
          }
        } catch (error) {
          console.error('WebSocket: Clerk authentication error:', error);
          socket.emit('auth:error', { 
            type: 'AUTH_ERROR',
            message: 'Authentication error. Please log in again.' 
          });
          socket.disconnect(true);
        }
      } catch (error) {
        console.error('WebSocket auth error:', error);
        socket.emit('auth:error', { message: 'Authentication error. Please try again.' });
        socket.disconnect(true);
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      const userName = socket.data.user.name;
      const isAnonymous = socket.data.isAnonymous;
      
      // Store socket connection
      this.addUserSocket(userId, socket.id);

      // Log additional connection info
      console.log(`WebSocket connected for user ${userId} (${isAnonymous ? 'anonymous' : 'authenticated'})`);
      
      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        console.log(`WebSocket disconnected for user ${userId}: ${reason}`);
        this.removeUserSocket(userId, socket.id);
        
        // Clean up viewer states
        this.activeViewers.forEach((viewers, fileId) => {
          if (viewers.has(userId)) {
            viewers.delete(userId);
          }
        });
      });

      // Handle token refresh
      socket.on('token:refresh', async (newToken: string) => {
        try {
          const socketId = socket.id;
          const currentUser = this.socketUserMap.get(socketId);
          
          // No user data found for this socket
          if (!currentUser) {
            console.log(`WebSocket: Token refresh failed - no user data for socket ${socketId}`);
            socket.emit('token:refresh:error', { message: 'No user data found for this connection' });
            return;
          }
          
          // Verify the new token with Clerk
          try {
            // Verify the Clerk session
            const session = await clerkClient.sessions.getSession(newToken);
            if (!session || session.status !== 'active') {
              throw new Error('Invalid session');
            }
            
            // Get user from Clerk
            const clerkUser = await clerkClient.users.getUser(session.userId);
            if (!clerkUser) {
              throw new Error('User not found');
            }
            
            const userId = clerkUser.id;
            
            // Check if the new token is for the same user
            if (currentUser.id !== userId && !currentUser.isAnonymous) {
              console.log(`WebSocket: Token refresh user mismatch - ${currentUser.id} vs ${userId}`);
              socket.emit('token:refresh:error', { message: 'Token user mismatch' });
              return;
            }
            
            // Update handshake auth
            socket.handshake.auth.token = newToken;
            
            // If this was an anonymous user, update to authenticated
            if (currentUser.isAnonymous) {
              console.log(`WebSocket: Anonymous user ${currentUser.id} authenticated as ${userId}`);
              
              // Find user in database
              this.findUserById(userId)
                .then(user => {
                  if (!user) {
                    console.log(`WebSocket: User ${userId} not found in database`);
                    socket.emit('token:refresh:error', { message: 'User not found' });
                    return;
                  }
                  
                  // Update user data
                  this.socketUserMap.set(socketId, { 
                    id: userId,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isAnonymous: false
                  });
                  
                  // Add socket to user's connection list
                  const userSockets = this.userSockets.get(userId) || [];
                  userSockets.push(socketId);
                  this.userSockets.set(userId, userSockets);
                  
                  console.log(`WebSocket: Token refreshed for user ${user.name} (${userId})`);
                  socket.emit('token:refresh:success', { message: 'Token refreshed successfully' });
                })
                .catch(error => {
                  console.error('Error finding user:', error);
                  socket.emit('token:refresh:error', { message: 'Failed to update user data' });
                });
            } else {
              console.log(`WebSocket: Token refreshed for user ${currentUser.id}`);
              socket.emit('token:refresh:success', { message: 'Token refreshed successfully' });
            }
          } catch (error) {
            console.error('WebSocket: Clerk token verification error:', error);
            socket.emit('token:refresh:error', { message: 'Failed to verify token' });
          }
        } catch (error) {
          console.error('WebSocket token refresh error:', error);
          socket.emit('token:refresh:error', { message: 'Failed to refresh token' });
        }
      });

      // Handle reconnection attempts
      socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`WebSocket: Reconnection attempt ${attemptNumber} for user ${userId}`);
      });

      // Handle reconnection
      socket.on('reconnect', () => {
        console.log(`WebSocket: Reconnected for user ${userId}`);
        // Rejoin necessary rooms
        if (!isAnonymous) {
          socket.join(`notifications:${userId}`);
        }
      });

      // Only set up authenticated event handlers if not anonymous
      if (!isAnonymous) {
        // Handle chat messages
        socket.on('chat:message', async (data) => {
          try {
            const decryptedData = this.processIncomingMessage(data);
            // Process message and broadcast to relevant users
            this.broadcastToUsers([userId], 'chat:message', decryptedData);
          } catch (error) {
            this.sendError(socket, 'Error processing message');
          }
        });

        // Handle notifications
        socket.on('notification:subscribe', (data) => {
          socket.join(`notifications:${userId}`);
        });

        // Handle real-time updates
        socket.on('updates:subscribe', (data) => {
          const { type } = data;
          socket.join(`updates:${type}:${userId}`);
        });
      }

      // Handle file upload progress tracking (available for both anonymous and authenticated users)
      socket.on('file:upload:start', (data: { fileId: string }) => {
        this.fileProgress.set(data.fileId, {
          fileId: data.fileId,
          progress: 0,
          status: 'uploading'
        });
        this.broadcastFileProgress(userId, data.fileId);
      });

      socket.on('file:upload:progress', (data: { fileId: string; progress: number }) => {
        const progress = this.fileProgress.get(data.fileId);
        if (progress) {
          progress.progress = data.progress;
          this.broadcastFileProgress(userId, data.fileId);
        }
      });

      socket.on('file:processing', (data: { fileId: string }) => {
        const progress = this.fileProgress.get(data.fileId);
        if (progress) {
          progress.status = 'processing';
          this.broadcastFileProgress(userId, data.fileId);
        }
      });

      socket.on('file:encrypting', (data: { fileId: string }) => {
        const progress = this.fileProgress.get(data.fileId);
        if (progress) {
          progress.status = 'encrypting';
          this.broadcastFileProgress(userId, data.fileId);
        }
      });

      socket.on('file:completed', (data: { fileId: string }) => {
        const progress = this.fileProgress.get(data.fileId);
        if (progress) {
          progress.status = 'completed';
          progress.progress = 100;
          this.broadcastFileProgress(userId, data.fileId);
          this.fileProgress.delete(data.fileId);
        }
      });

      socket.on('file:error', (data: { fileId: string; error: string }) => {
        const progress = this.fileProgress.get(data.fileId);
        if (progress) {
          progress.status = 'error';
          progress.error = data.error;
          this.broadcastFileProgress(userId, data.fileId);
          this.fileProgress.delete(data.fileId);
        }
      });

      // File viewing events
      socket.on('viewer:join', (data: { fileId: string }) => {
        const { fileId } = data;
        socket.join(`file:${fileId}`);
        
        // Initialize viewer state
        if (!this.activeViewers.has(fileId)) {
          this.activeViewers.set(fileId, new Map());
        }
        
        const viewerState: ViewerState = {
          userId,
          userName,
          currentPage: 1,
          scale: 1,
          position: { x: 0, y: 0 }
        };
        
        this.activeViewers.get(fileId)!.set(userId, viewerState);
        this.broadcastViewerState(fileId);
      });

      socket.on('viewer:leave', (data: { fileId: string }) => {
        const { fileId } = data;
        socket.leave(`file:${fileId}`);
        this.activeViewers.get(fileId)?.delete(userId);
        this.broadcastViewerState(fileId);
      });

      socket.on('viewer:update', (data: { fileId: string; state: Partial<ViewerState> }) => {
        const { fileId, state } = data;
        const viewers = this.activeViewers.get(fileId);
        if (viewers?.has(userId)) {
          const currentState = viewers.get(userId)!;
          viewers.set(userId, { ...currentState, ...state });
          this.broadcastViewerState(fileId);
        }
      });

      // Annotation events
      socket.on('annotation:create', (data: { fileId: string; annotation: Omit<Annotation, 'id' | 'userId' | 'userName' | 'timestamp'> }) => {
        const { fileId, annotation } = data;
        const newAnnotation: Annotation = {
          ...annotation,
          id: Math.random().toString(36).substr(2, 9),
          userId,
          userName,
          timestamp: new Date(),
          fileId
        };

        if (!this.fileAnnotations.has(fileId)) {
          this.fileAnnotations.set(fileId, []);
        }
        this.fileAnnotations.get(fileId)!.push(newAnnotation);
        this.broadcastAnnotationUpdate(fileId, 'create', newAnnotation);
      });

      socket.on('annotation:update', (data: { fileId: string; annotationId: string; updates: Partial<Annotation> }) => {
        const { fileId, annotationId, updates } = data;
        const annotations = this.fileAnnotations.get(fileId);
        const annotationIndex = annotations?.findIndex(a => a.id === annotationId);
        
        if (annotations && annotationIndex !== undefined && annotationIndex !== -1) {
          const annotation = annotations[annotationIndex];
          if (annotation.userId === userId) {
            const updatedAnnotation = { ...annotation, ...updates };
            annotations[annotationIndex] = updatedAnnotation;
            this.broadcastAnnotationUpdate(fileId, 'update', updatedAnnotation);
          }
        }
      });

      socket.on('annotation:delete', (data: { fileId: string; annotationId: string }) => {
        const { fileId, annotationId } = data;
        const annotations = this.fileAnnotations.get(fileId);
        const annotationIndex = annotations?.findIndex(a => a.id === annotationId);
        
        if (annotations && annotationIndex !== undefined && annotationIndex !== -1) {
          const annotation = annotations[annotationIndex];
          if (annotation.userId === userId) {
            annotations.splice(annotationIndex, 1);
            this.broadcastAnnotationUpdate(fileId, 'delete', annotation);
          }
        }
      });
    });
  }

  private addUserSocket(userId: string, socketId: string) {
    const userSocketIds = this.userSockets.get(userId) || [];
    userSocketIds.push(socketId);
    this.userSockets.set(userId, userSocketIds);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const userSocketIds = this.userSockets.get(userId) || [];
    const index = userSocketIds.indexOf(socketId);
    if (index !== -1) {
      userSocketIds.splice(index, 1);
      if (userSocketIds.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, userSocketIds);
      }
    }
  }

  private processIncomingMessage(data: any) {
    if (!data || typeof data === 'string') {
      return data;
    }

    try {
      // Only decrypt if we're in production and the data has encryption metadata
      if (process.env.NODE_ENV === 'production' && data.data && data.iv && data.authTag) {
        return decryptData(data.data, data.iv, data.authTag);
      }
      return data;
    } catch (error) {
      console.error('Error decrypting message:', error);
      // Return a safe error response instead of throwing
      return {
        error: 'Message decryption failed',
        status: 'error'
      };
    }
  }

  private processOutgoingMessage(data: any) {
    if (!data || typeof data === 'string') {
      return data;
    }

    try {
      // Only encrypt if we're in production and the data is an object
      if (process.env.NODE_ENV === 'production') {
        const stringifiedData = JSON.stringify(data);
        return encryptData(stringifiedData);
      }
      return data;
    } catch (error) {
      console.error('Error encrypting message:', error);
      // Return a safe error response instead of throwing
      return {
        error: 'Message encryption failed',
        status: 'error'
      };
    }
  }

  public broadcastToUsers(userIds: string[], event: string, data: any) {
    const processedData = this.processOutgoingMessage(data);
    userIds.forEach(userId => {
      const socketIds = this.userSockets.get(userId);
      if (socketIds) {
        socketIds.forEach(socketId => {
          this.io.to(socketId).emit(event, processedData);
        });
      }
    });
  }

  public broadcastToRoom(room: string, event: string, data: any) {
    const processedData = this.processOutgoingMessage(data);
    this.io.to(room).emit(event, processedData);
  }

  public sendNotification(userId: string, notification: any) {
    this.broadcastToRoom(`notifications:${userId}`, 'notification', notification);
  }

  public sendUpdate(type: string, userId: string, data: any) {
    this.broadcastToRoom(`updates:${type}:${userId}`, 'update', {
      type,
      data
    });
  }

  private sendError(socket: any, message: string) {
    socket.emit('error', { message });
  }

  private broadcastFileProgress(userId: string, fileId: string) {
    const progress = this.fileProgress.get(fileId);
    if (progress) {
      this.broadcastToUsers([userId], 'file:progress', progress);
    }
  }

  private broadcastViewerState(fileId: string) {
    const viewers = Array.from(this.activeViewers.get(fileId)?.values() || []);
    this.broadcastToRoom(`file:${fileId}`, 'viewer:state', viewers);
  }

  private broadcastAnnotationUpdate(fileId: string, action: 'create' | 'update' | 'delete', annotation: Annotation) {
    this.broadcastToRoom(`file:${fileId}`, 'annotation:update', { action, annotation });
  }

  public notifyAppointmentUpdated(appointment: Appointment | AppointmentWithUsers) {
    this.sendUpdate('appointment', 'isAppointmentWithUsers' in appointment ? appointment.patientId : appointment.patientId, appointment);
    this.sendUpdate('appointment', 'isAppointmentWithUsers' in appointment ? appointment.doctorId : appointment.doctorId, appointment);
  }

  public notifyAppointmentCreated(appointment: Appointment | AppointmentWithUsers) {
    this.sendUpdate('appointment', 'isAppointmentWithUsers' in appointment ? appointment.patientId : appointment.patientId, appointment);
    this.sendUpdate('appointment', 'isAppointmentWithUsers' in appointment ? appointment.doctorId : appointment.doctorId, appointment);
  }

  private findUserById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId }
    });
  }

  private async checkServerHealth(url: string): Promise<boolean> {
    // Extract the hostname and port to build an HTTP health check URL
    try {
      // Parse the WebSocket URL and convert to HTTP for health check
      const wsUrl = new URL(url);
      const protocol = wsUrl.protocol === 'wss:' ? 'https:' : 'http:';
      const healthUrl = `${protocol}//${wsUrl.host}/api/health`;
      
      console.log(`Checking server health at: ${healthUrl}`);
      
      const response = await fetch(healthUrl);
      
      if (response.ok) {
        console.log(`Health check successful: ${healthUrl}`);
        return true;
      } else {
        console.error(`Health check failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`Primary health check failed:`, error);
      return false;
    }
  }
} 