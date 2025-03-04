import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { encryptData, decryptData } from '../middleware/encryption.js';
import { prisma } from '../lib/prisma.js';
export class WebSocketService {
    io;
    userSockets = new Map(); // userId -> socketIds[]
    fileProgress = new Map();
    activeViewers = new Map(); // fileId -> Map<userId, ViewerState>
    fileAnnotations = new Map();
    constructor(server) {
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
    setupAuthentication() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    console.error('WebSocket auth failed: No token provided');
                    return next(new Error('Authentication error: No token provided'));
                }
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
                }
                catch (jwtError) {
                    console.error('WebSocket auth failed: Invalid JWT token', jwtError);
                    return next(new Error('Authentication error: Invalid token'));
                }
            }
            catch (error) {
                console.error('WebSocket auth error:', error);
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
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
                }
                catch (error) {
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
            socket.on('file:upload:start', (data) => {
                this.fileProgress.set(data.fileId, {
                    fileId: data.fileId,
                    progress: 0,
                    status: 'uploading'
                });
                this.broadcastFileProgress(userId, data.fileId);
            });
            socket.on('file:upload:progress', (data) => {
                const progress = this.fileProgress.get(data.fileId);
                if (progress) {
                    progress.progress = data.progress;
                    this.broadcastFileProgress(userId, data.fileId);
                }
            });
            socket.on('file:processing', (data) => {
                const progress = this.fileProgress.get(data.fileId);
                if (progress) {
                    progress.status = 'processing';
                    this.broadcastFileProgress(userId, data.fileId);
                }
            });
            socket.on('file:encrypting', (data) => {
                const progress = this.fileProgress.get(data.fileId);
                if (progress) {
                    progress.status = 'encrypting';
                    this.broadcastFileProgress(userId, data.fileId);
                }
            });
            socket.on('file:completed', (data) => {
                const progress = this.fileProgress.get(data.fileId);
                if (progress) {
                    progress.status = 'completed';
                    progress.progress = 100;
                    this.broadcastFileProgress(userId, data.fileId);
                    this.fileProgress.delete(data.fileId);
                }
            });
            socket.on('file:error', (data) => {
                const progress = this.fileProgress.get(data.fileId);
                if (progress) {
                    progress.status = 'error';
                    progress.error = data.error;
                    this.broadcastFileProgress(userId, data.fileId);
                    this.fileProgress.delete(data.fileId);
                }
            });
            // File viewing events
            socket.on('viewer:join', (data) => {
                const { fileId } = data;
                socket.join(`file:${fileId}`);
                // Initialize viewer state
                if (!this.activeViewers.has(fileId)) {
                    this.activeViewers.set(fileId, new Map());
                }
                const viewerState = {
                    userId,
                    userName,
                    currentPage: 1,
                    scale: 1,
                    position: { x: 0, y: 0 }
                };
                this.activeViewers.get(fileId).set(userId, viewerState);
                this.broadcastViewerState(fileId);
            });
            socket.on('viewer:leave', (data) => {
                const { fileId } = data;
                socket.leave(`file:${fileId}`);
                this.activeViewers.get(fileId)?.delete(userId);
                this.broadcastViewerState(fileId);
            });
            socket.on('viewer:update', (data) => {
                const { fileId, state } = data;
                const viewers = this.activeViewers.get(fileId);
                if (viewers?.has(userId)) {
                    const currentState = viewers.get(userId);
                    viewers.set(userId, { ...currentState, ...state });
                    this.broadcastViewerState(fileId);
                }
            });
            // Annotation events
            socket.on('annotation:create', (data) => {
                const { fileId, annotation } = data;
                const newAnnotation = {
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
                this.fileAnnotations.get(fileId).push(newAnnotation);
                this.broadcastAnnotationUpdate(fileId, 'create', newAnnotation);
            });
            socket.on('annotation:update', (data) => {
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
            socket.on('annotation:delete', (data) => {
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
    addUserSocket(userId, socketId) {
        const userSocketIds = this.userSockets.get(userId) || [];
        userSocketIds.push(socketId);
        this.userSockets.set(userId, userSocketIds);
    }
    removeUserSocket(userId, socketId) {
        const userSocketIds = this.userSockets.get(userId) || [];
        const index = userSocketIds.indexOf(socketId);
        if (index !== -1) {
            userSocketIds.splice(index, 1);
            if (userSocketIds.length === 0) {
                this.userSockets.delete(userId);
            }
            else {
                this.userSockets.set(userId, userSocketIds);
            }
        }
    }
    processIncomingMessage(data) {
        if (!data || typeof data === 'string') {
            return data;
        }
        try {
            // Only decrypt if we're in production and the data has encryption metadata
            if (process.env.NODE_ENV === 'production' && data.data && data.iv && data.authTag) {
                return decryptData(data.data, data.iv, data.authTag);
            }
            return data;
        }
        catch (error) {
            console.error('Error decrypting message:', error);
            // Return a safe error response instead of throwing
            return {
                error: 'Message decryption failed',
                status: 'error'
            };
        }
    }
    processOutgoingMessage(data) {
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
        }
        catch (error) {
            console.error('Error encrypting message:', error);
            // Return a safe error response instead of throwing
            return {
                error: 'Message encryption failed',
                status: 'error'
            };
        }
    }
    broadcastToUsers(userIds, event, data) {
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
    broadcastToRoom(room, event, data) {
        const processedData = this.processOutgoingMessage(data);
        this.io.to(room).emit(event, processedData);
    }
    sendNotification(userId, notification) {
        this.broadcastToRoom(`notifications:${userId}`, 'notification', notification);
    }
    sendUpdate(type, userId, data) {
        this.broadcastToRoom(`updates:${type}:${userId}`, 'update', {
            type,
            data
        });
    }
    sendError(socket, message) {
        socket.emit('error', { message });
    }
    broadcastFileProgress(userId, fileId) {
        const progress = this.fileProgress.get(fileId);
        if (progress) {
            this.broadcastToUsers([userId], 'file:progress', progress);
        }
    }
    broadcastViewerState(fileId) {
        const viewers = Array.from(this.activeViewers.get(fileId)?.values() || []);
        this.broadcastToRoom(`file:${fileId}`, 'viewer:state', viewers);
    }
    broadcastAnnotationUpdate(fileId, action, annotation) {
        this.broadcastToRoom(`file:${fileId}`, 'annotation:update', { action, annotation });
    }
    notifyAppointmentUpdated(appointment) {
        this.sendUpdate('appointment', appointment.patientId, appointment);
        this.sendUpdate('appointment', appointment.doctorId, appointment);
    }
    notifyAppointmentCreated(appointment) {
        this.sendUpdate('appointment', appointment.patientId, appointment);
        this.sendUpdate('appointment', appointment.doctorId, appointment);
    }
}
//# sourceMappingURL=websocket.service.js.map