import { ApiClient } from '../client';
import type { ApiResponse, Annotation, PaginatedResponse } from '../types';
import { AnnotationType } from '@prisma/client';

export class AnnotationService {
  private static instance: AnnotationService;
  private client: ApiClient;

  private constructor() {
    this.client = ApiClient.getInstance();
  }

  public static getInstance(): AnnotationService {
    if (!AnnotationService.instance) {
      AnnotationService.instance = new AnnotationService();
    }
    return AnnotationService.instance;
  }

  async createAnnotation(data: {
    imageId: string;
    type: AnnotationType; 
    content: string;
    coordinates: Record<string, any>;
  }): Promise<ApiResponse<Annotation>> {
    return this.client.post<ApiResponse<Annotation>>('/annotations', data);
  }

  async getAnnotations(params?: {
    imageId?: string;
    userId?: string;
    type?: AnnotationType;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Annotation>>> {
    return this.client.get<ApiResponse<PaginatedResponse<Annotation>>>('/annotations', { params });
  }

  async getAnnotation(id: string): Promise<ApiResponse<Annotation>> {
    return this.client.get<ApiResponse<Annotation>>(`/annotations/${id}`);
  }

  async updateAnnotation(
    id: string,
    data: Partial<Annotation>
  ): Promise<ApiResponse<Annotation>> {
    return this.client.patch<ApiResponse<Annotation>>(`/annotations/${id}`, data);
  }

  async deleteAnnotation(id: string): Promise<ApiResponse<void>> {
    return this.client.delete<ApiResponse<void>>(`/annotations/${id}`);
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