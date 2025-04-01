import { patientClient } from '../patientClient';
import { providerClient } from '../providerClient';
import type { ApiResponse, Annotation, PaginatedResponse } from '../types';
import { AnnotationType } from '@prisma/client';

export class AnnotationService {
  private patientClient;
  private providerClient;
  private userRole: 'PATIENT' | 'PROVIDER' | null = null;

  constructor() {
    this.patientClient = patientClient;
    this.providerClient = providerClient;
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

  async createAnnotation(data: {
    imageId: string;
    type: AnnotationType; 
    content: string;
    coordinates: Record<string, any>;
  }): Promise<ApiResponse<Annotation>> {
    return this.getClient().createAnnotation(data);
  }

  async getAnnotations(params?: {
    imageId?: string;
    userId?: string;
    type?: AnnotationType;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Annotation>>> {
    return this.getClient().getAnnotations(params?.imageId || '');
  }

  async getAnnotation(id: string): Promise<ApiResponse<Annotation>> {
    return this.getClient().getAnnotation(id);
  }

  async updateAnnotation(
    id: string,
    data: Partial<Annotation>
  ): Promise<ApiResponse<Annotation>> {
    return this.getClient().updateAnnotation(id, data);
  }

  async deleteAnnotation(id: string): Promise<ApiResponse<void>> {
    return this.getClient().deleteAnnotation(id);
  }

  // Helper methods for annotation types
  isMarker(annotation: Annotation): boolean {
    return annotation.type === AnnotationType.MARKER;
  }

  isMeasurement(annotation: Annotation): boolean {
    return annotation.type === AnnotationType.MEASUREMENT;
  }

  isText(annotation: Annotation): boolean {
    return annotation.type === AnnotationType.NOTE;
  }

  isDrawing(annotation: Annotation): boolean {
    return annotation.type === AnnotationType.NOTE;
  }

  // Helper methods for coordinates
  getCoordinates(annotation: Annotation): { x: number; y: number } {
    return annotation.coordinates as { x: number; y: number };
  }

  getMeasurementData(annotation: Annotation): {
    start: { x: number; y: number };
    end: { x: number; y: number };
    distance: number;
  } {
    if (!this.isMeasurement(annotation)) {
      throw new Error('Annotation is not a measurement');
    }
    return annotation.coordinates as {
      start: { x: number; y: number };
      end: { x: number; y: number };
      distance: number;
    };
  }
}

export const annotationService = new AnnotationService(); 