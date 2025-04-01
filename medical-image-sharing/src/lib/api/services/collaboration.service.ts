import { WebSocketService } from './websocket.service';
import { patientClient } from '../patientClient';
import { providerClient } from '../providerClient';
import type { Annotation, Image, ApiResponse } from '../types';

export class CollaborationService {
  private static instance: CollaborationService;
  private wsService: WebSocketService;
  private patientClient;
  private providerClient;
  private userRole: 'PATIENT' | 'PROVIDER' | null = null;

  constructor() {
    this.wsService = WebSocketService.getInstance();
    this.patientClient = patientClient;
    this.providerClient = providerClient;
  }

  public static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  setUserRole(role: 'PATIENT' | 'PROVIDER') {
    this.userRole = role;
  }

  private getClient() {
    if (!this.userRole) {
      throw new Error('User role not set. Call setUserRole first.');
    }
    return this.userRole === 'PATIENT' ? this.patientClient : this.providerClient;
  }

  // Join a collaboration session for an image
  async joinSession(imageId: string): Promise<void> { 
    // Ensure WebSocket is connected
    if (!this.wsService.isConnected()) {
      this.wsService.connect();
    }
    
    // Subscribe to relevant channels
    this.subscribe<any>(`annotation:${imageId}`, () => {});
    this.subscribe<any>(`presence:${imageId}`, () => {});
    
    // Notify others that we've joined
    this.wsService.emit('presence', {
      type: 'join',
      imageId,
    });
  }

  // Leave a collaboration session
  async leaveSession(imageId: string): Promise<void> {
    // Notify others that we've left
    this.wsService.emit('presence', {
      type: 'leave',
      imageId,
    });
  }

  // Send an annotation update
  sendAnnotationUpdate(
    imageId: string,
    type: 'add' | 'modify' | 'delete',
    annotation: Partial<Annotation>
  ): void {
    this.wsService.emit('annotation', {
      imageId,
      type,
      annotation,
    });
  }

  // Send cursor position update
  sendCursorPosition(imageId: string, position: { x: number; y: number }): void {
    this.wsService.emit('presence', {
      imageId,
      type: 'cursor',
      position,
    });
  }

  // Save annotations to the server
  async saveAnnotations(imageId: string, annotations: Annotation[]): Promise<ApiResponse<void>> {
    return this.getClient().saveAnnotations(imageId, annotations);
  }

  // Load annotations from the server
  async loadAnnotations(imageId: string): Promise<Annotation[]> {
    try {
      const response = await this.getClient().getAnnotations(imageId);
      return response.data.data || [];
    } catch (error) {
      console.error('Error loading annotations:', error);
      return [];
    }
  }

  // Subscribe to annotation updates
  onAnnotationUpdate(
    imageId: string,
    callback: (data: any) => void
  ): () => void {
    return this.subscribe<any>(`annotation:${imageId}`, callback);
  }

  // Subscribe to presence updates
  onPresenceUpdate(
    imageId: string,
    callback: (data: any) => void
  ): () => void {
    return this.subscribe<any>(`presence:${imageId}`, callback);
  }

  // Helper method to use WebSocketService.subscribe correctly
  private subscribe<T>(eventType: string, handler: (data: T) => void): () => void {
    return this.wsService.subscribe<T>(eventType, handler);
  }

  // Get active collaborators
  async getCollaborators(imageId: string): Promise<string[]> {
    try {
      const response = await this.getClient().getImageCollaborators(imageId);
      return response.data || [];
    } catch (error) {
      console.error('Error getting collaborators:', error);
      return [];
    }
  }

  // Lock an annotation for editing
  async lockAnnotation(
    imageId: string,
    annotationId: string
  ): Promise<boolean> {
    try {
      await this.getClient().lockAnnotation(imageId, annotationId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Release an annotation lock
  async releaseAnnotationLock(
    imageId: string,
    annotationId: string
  ): Promise<void> {
    await this.getClient().releaseAnnotationLock(imageId, annotationId);
  }

  // Check if an annotation is locked
  async isAnnotationLocked(
    imageId: string,
    annotationId: string
  ): Promise<boolean> {
    try {
      const response = await this.getClient().getAnnotationLockStatus(imageId, annotationId);
      return response.data?.locked || false;
    } catch (error) {
      return false;
    }
  }
}

export const collaborationService = new CollaborationService(); 