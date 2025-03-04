import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { encryptData, decryptData } from '../middleware/encryption.js';
import { prisma } from '../lib/prisma.js';
import type { User, Appointment } from '@prisma/client';

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

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupAuthentication();
    this.setupEventHandlers();
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          console.error('WebSocket auth failed: No token provided');
          return next(new Error('Authentication error: No token provided'));
        }

        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
          
          const user = await prisma.user.findUnique({
            where: { id: decoded.id }
          });

          if (!user) {
            console.error(`WebSocket auth failed: User with ID ${decoded.id} not found`);
            return next(new Error('Authentication error: User not found'));
          }

          if (!user.isActive) {
            console.error(`WebSocket auth failed: User ${user.email} account is inactive`);
            return next(new Error('Authentication error: Account inactive'));
          }

          console.log(`WebSocket auth successful for user ${user.email}`);
          socket.data.user = user;
          next();
        } catch (jwtError) {
          console.error('WebSocket auth failed: Invalid JWT token', jwtError);
          return next(new Error('Authentication error: Invalid token'));
        }
      } catch (error) {
        console.error('WebSocket auth error:', error);
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      const userName = socket.data.user.name;
      
      // Store socket connection
      this.addUserSocket(userId, socket.id);

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

      // Handle file upload progress tracking
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

      // Handle disconnection
      socket.on('disconnect', () => {
        this.removeUserSocket(userId, socket.id);
        
        // Clean up viewer states
        this.activeViewers.forEach((viewers, fileId) => {
          if (viewers.has(userId)) {
            viewers.delete(userId);
            this.broadcastViewerState(fileId);
          }
        });
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

  public notifyAppointmentUpdated(appointment: Appointment) {
    this.sendUpdate('appointment', appointment.patientId, appointment);
    this.sendUpdate('appointment', appointment.doctorId, appointment);
  }

  public notifyAppointmentCreated(appointment: Appointment) {
    this.sendUpdate('appointment', appointment.patientId, appointment);
    this.sendUpdate('appointment', appointment.doctorId, appointment);
  }
} 