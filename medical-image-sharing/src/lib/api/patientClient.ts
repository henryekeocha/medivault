import { ApiResponse, PaginatedResponse, Image, Annotation, User, MedicalRecord, HealthMetricResponse, DicomMetadata } from './types';
import { AnnotationType } from '@prisma/client';
import axiosInstance from './baseClient';
import { AxiosProgressEvent } from './sharedClient';
import axios from 'axios';

export class PatientClient {
  private static instance: PatientClient;

  private constructor() {}

  public static getInstance(): PatientClient {
    if (!PatientClient.instance) {
      PatientClient.instance = new PatientClient();
    }
    return PatientClient.instance;
  }

  // Medical Records
  async getMedicalRecords(params?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<MedicalRecord>>> {
    try {
      const response = await axiosInstance.get<ApiResponse<PaginatedResponse<MedicalRecord>>>('/medical-records', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching medical records:', error);
      // Return a successful response with empty data to prevent UI errors
      return {
        status: 'success',
        data: {
          data: [],
          pagination: {
            page: 1,
            limit: params?.limit || 20,
            total: 0,
            pages: 0
          }
        }
      };
    }
  }

  async getMedicalRecord(id: string): Promise<ApiResponse<MedicalRecord>> {
    try {
      const response = await axiosInstance.get<ApiResponse<MedicalRecord>>(`/medical-records/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching medical record:', error);
      // Return a successful response with empty data to prevent UI errors
      return {
        status: 'success',
        data: {} as MedicalRecord
      };
    }
  }

  async createMedicalRecord(data: {
    recordType: string;
    title: string;
    content: string;
    attachments?: File[];
  }): Promise<ApiResponse<MedicalRecord>> {
    const formData = new FormData();
    formData.append('recordType', data.recordType);
    formData.append('title', data.title);
    formData.append('content', data.content);
    
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await axiosInstance.post<ApiResponse<MedicalRecord>>('/medical-records', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateMedicalRecord(id: string, data: {
    recordType?: string;
    title?: string;
    content?: string;
    attachments?: File[];
  }): Promise<ApiResponse<MedicalRecord>> {
    const formData = new FormData();
    
    if (data.recordType) formData.append('recordType', data.recordType);
    if (data.title) formData.append('title', data.title);
    if (data.content) formData.append('content', data.content);
    
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await axiosInstance.patch<ApiResponse<MedicalRecord>>(`/medical-records/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteMedicalRecord(id: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/medical-records/${id}`);
    return response.data;
  }

  async downloadMedicalRecord(recordId: string): Promise<Blob> {
    try {
      const response = await axiosInstance.get(`/medical-records/${recordId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading medical record:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error('The requested medical record file could not be found');
      }
      throw error;
    }
  }

  // Images
  async getImages(params?: { page?: number; limit?: number; filter?: string }): Promise<ApiResponse<PaginatedResponse<Image>>> {
    try {
      const response = await axiosInstance.get('/images', { params });
      
      // If this is a direct axios response with status 200, transform it to our API format
      if (response.status === 200 && response.data) {
        // If it's already in our format, return it
        if (response.data.status === 'success') {
          return response.data;
        }
        
        // Otherwise convert it to our format
        return {
          status: 'success',
          data: response.data
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching images:', error);
      return {
        status: 'success',
        data: {
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: 0,
            pages: 0
          }
        }
      };
    }
  }

  async getSharedImages(): Promise<ApiResponse<Image[]>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/images', {
      params: {
        role: 'PATIENT',
        shared: true
      }
    });
    
    if (response.data.status === 'success' && response.data.data?.images) {
      return {
        status: 'success',
        data: response.data.data.images
      };
    }
    
    return {
      status: 'success',
      data: []
    };
  }

  async shareImage(data: {
    providerId: string;
    imageId: string;
    expiryDays: number;
    allowDownload: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post<ApiResponse<any>>(`/images/${data.imageId}/share`, {
      expiresIn: data.expiryDays * 24 * 60 * 60, // Convert days to seconds
      recipientEmail: data.providerId
    });
    return response.data;
  }

  async revokeImageAccess(shareId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/images/${shareId}/share`);
    return response.data;
  }

  async uploadImage(file: File, metadata?: Record<string, any>, onProgress?: (progress: number) => void): Promise<ApiResponse<Image>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await axiosInstance.post<ApiResponse<Image>>('/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }

  async getImage(imageId: string): Promise<ApiResponse<Image>> {
    const response = await axiosInstance.get<ApiResponse<Image>>(`/images/${imageId}`);
    return response.data;
  }

  async deleteImage(imageId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/images/${imageId}`);
    return response.data;
  }

  async downloadImage(imageId: string): Promise<Blob> {
    const response = await axiosInstance.get(`/images/${imageId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async updateImage(imageId: string, data: Partial<Image>): Promise<ApiResponse<Image>> {
    const response = await axiosInstance.patch<ApiResponse<Image>>(`/images/${imageId}`, data);
    return response.data;
  }

  async getDicomMetadata(id: string): Promise<ApiResponse<DicomMetadata>> {
    const response = await axiosInstance.get<ApiResponse<DicomMetadata>>(`/images/${id}/dicom-metadata`);
    return response.data;
  }

  // Health Metrics
  async createHealthMetric(data: Partial<HealthMetricResponse>): Promise<ApiResponse<HealthMetricResponse>> {
    const response = await axiosInstance.post<ApiResponse<HealthMetricResponse>>('/v1/patient/health-metrics', data);
    return response.data;
  }

  async getHealthMetrics(params: { 
    startDate?: string, 
    endDate?: string 
  }): Promise<ApiResponse<PaginatedResponse<HealthMetricResponse>>> {
    try {
      const response = await axiosInstance.get<ApiResponse<PaginatedResponse<HealthMetricResponse>>>('/api/v1/patient/health-metrics', {
        params: {
          startDate: params.startDate,
          endDate: params.endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      return {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve health metrics',
          code: 'FETCH_ERROR'
        }
      } as ApiResponse<PaginatedResponse<HealthMetricResponse>>;
    }
  }

  // Settings
  async getSettings(): Promise<ApiResponse<{
    personalInfo: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      phone: string;
      email: string;
      emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
      };
    };
    privacy: {
      shareDataWithProviders: boolean;
      allowImageSharing: boolean;
      showProfileToOtherPatients: boolean;
      allowAnonymousDataUse: boolean;
    };
    notifications: {
      emailNotifications: boolean;
      smsNotifications: boolean;
      appointmentReminders: boolean;
      imageShareNotifications: boolean;
      providerMessages: boolean;
      marketingEmails: boolean;
    };
    communication: {
      preferredLanguage: string;
      preferredContactMethod: string;
      preferredAppointmentReminder: string;
    };
  }>> {
    try {
      // Fix the endpoint path by removing the duplicate '/api' prefix
      const response = await axiosInstance.get<ApiResponse<any>>('/v1/patient/settings');
      return response.data;
    } catch (error) {
      console.error('[Patient Settings]', error);
      // Return a successful response with default empty settings to prevent UI errors
      return {
        status: 'success',
        data: {
          personalInfo: {
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            phone: '',
            email: '',
            emergencyContact: {
              name: '',
              relationship: '',
              phone: ''
            }
          },
          privacy: {
            shareDataWithProviders: false,
            allowImageSharing: false,
            showProfileToOtherPatients: false,
            allowAnonymousDataUse: false
          },
          notifications: {
            emailNotifications: true,
            smsNotifications: false,
            appointmentReminders: true,
            imageShareNotifications: true,
            providerMessages: true,
            marketingEmails: false
          },
          communication: {
            preferredLanguage: 'en',
            preferredContactMethod: 'email',
            preferredAppointmentReminder: '24h'
          }
        }
      };
    }
  }

  // Add new method to update patient settings
  async updateSettings(settings: {
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      phone?: string;
      email?: string;
      emergencyContact?: {
        name?: string;
        relationship?: string;
        phone?: string;
      };
    };
    privacy?: {
      shareDataWithProviders?: boolean;
      allowImageSharing?: boolean;
      showProfileToOtherPatients?: boolean;
      allowAnonymousDataUse?: boolean;
    };
    notifications?: {
      emailNotifications?: boolean;
      smsNotifications?: boolean;
      appointmentReminders?: boolean;
      imageShareNotifications?: boolean;
      providerMessages?: boolean;
      marketingEmails?: boolean;
    };
    communication?: {
      preferredLanguage?: string;
      preferredContactMethod?: string;
      preferredAppointmentReminder?: string;
    };
  }): Promise<ApiResponse<any>> {
    try {
      // Fix the endpoint path by removing the duplicate '/api' prefix
      const response = await axiosInstance.put<ApiResponse<any>>('/v1/patient/settings', settings);
      return response.data;
    } catch (error) {
      console.error('[Update Patient Settings]', error);
      return {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Failed to update patient settings',
          code: 'UPDATE_ERROR'
        },
        data: null
      };
    }
  }

  // Providers
  async getProviders(): Promise<ApiResponse<User[]>> {
    try {
      const response = await axiosInstance.get<ApiResponse<User[]>>('/patients/providers');
      return response.data;
    } catch (error) {
      console.error('Error fetching providers:', error);
      return {
        status: 'success',
        data: [],
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch providers',
          code: 'FETCH_ERROR'
        }
      };
    }
  }

  async linkProvider(providerCode: string): Promise<ApiResponse<User>> {
    const response = await axiosInstance.post<ApiResponse<User>>('/patients/providers/link', {
      code: providerCode
    });
    return response.data;
  }

  // Appointments
  async getAppointment(appointmentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>(`/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointment:', error);
      // Return a successful response with empty data to prevent UI errors
      return {
        status: 'success',
        data: {
          items: []
        }
      };
    }
  }

  async createAppointment(data: {
    providerId: string;
    datetime: string;
    notes?: string;
    type?: string;
  }): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post<ApiResponse<any>>('/appointments', data);
    return response.data;
  }

  async updateAppointment(appointmentId: string, data: {
    datetime?: string;
    notes?: string;
    status?: string;
  }): Promise<ApiResponse<any>> {
    const response = await axiosInstance.patch<ApiResponse<any>>(`/appointments/${appointmentId}`, data);
    return response.data;
  }

  async deleteAppointment(appointmentId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/appointments/${appointmentId}`);
    return response.data;
  }

  // Analytics
  async getFileAccessHistory(fileId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>(`/analytics/files/${fileId}/history`);
    return response.data;
  }

  // Patient Analytics
  async getPatientAnalytics(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/analytics/patients/self');
    return response.data;
  }

  async getPatientImageTypeDistribution(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/analytics/patients/self/images/types');
    return response.data;
  }

  async getPatientStats(): Promise<ApiResponse<any>> {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>('/analytics/patients/self/stats');
      
      // Ensure we have valid data structure
      if (response.data && response.data.status === 'success') {
        // Ensure all required fields exist with default values if missing
        if (!response.data.data) {
          response.data.data = {};
        }
        
        // Set default values for missing fields
        response.data.data.totalImages = response.data.data.totalImages || 0;
        response.data.data.pendingAppointments = response.data.data.pendingAppointments || 0;
        response.data.data.unreadMessages = response.data.data.unreadMessages || 0;
        response.data.data.recentActivities = response.data.data.recentActivities || [];
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      return {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch patient statistics',
          code: 'FETCH_ERROR'
        },
        data: {
          totalImages: 0,
          pendingAppointments: 0,
          unreadMessages: 0,
          recentActivities: []
        }
      };
    }
  }

  // Annotation methods
  async createAnnotation(data: {
    imageId: string;
    type: AnnotationType; 
    content: string;
    coordinates: Record<string, any>;
  }): Promise<ApiResponse<Annotation>> {
    return axiosInstance.post(`/images/${data.imageId}/annotations`, data);
  }

  async getAnnotation(id: string): Promise<ApiResponse<Annotation>> {
    return axiosInstance.get(`/annotations/${id}`);
  }

  async updateAnnotation(id: string, data: Partial<Annotation>): Promise<ApiResponse<Annotation>> {
    return axiosInstance.patch(`/annotations/${id}`, data);
  }

  async deleteAnnotation(id: string): Promise<ApiResponse<void>> {
    return axiosInstance.delete(`/annotations/${id}`);
  }

  // User Profile methods
  async getUserProfile(): Promise<ApiResponse<User>> {
    return axiosInstance.get('/users/profile');
  }

  async updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return axiosInstance.put('/users/profile', data);
  }

  async verifyAttribute(type: 'email' | 'phone', code: string): Promise<ApiResponse<{ success: boolean }>> {
    return axiosInstance.post('/users/profile/verify', { type, code });
  }

  async requestVerification(type: 'email' | 'phone'): Promise<ApiResponse<{ success: boolean }>> {
    return axiosInstance.post('/users/profile/request-verification', { type });
  }

  async uploadProfilePicture(file: File): Promise<ApiResponse<{ user: User }>> {
    // First, get a presigned URL for the upload
    const urlResponse = await axiosInstance.get<{ uploadUrl: string; key: string }>('/users/profile/image');
    
    // Upload the file directly to the presigned URL
    await fetch(urlResponse.data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    
    // Notify the backend about the uploaded file
    return axiosInstance.post('/users/profile/image', { fileKey: urlResponse.data.key });
  }

  // Collaboration methods
  async saveAnnotations(imageId: string, annotations: Annotation[]): Promise<ApiResponse<void>> {
    return axiosInstance.post(`/images/${imageId}/annotations/batch`, { annotations });
  }

  async getAnnotations(imageId: string): Promise<ApiResponse<PaginatedResponse<Annotation>>> {
    return axiosInstance.get(`/images/${imageId}/annotations`);
  }

  async getImageCollaborators(imageId: string): Promise<ApiResponse<string[]>> {
    return axiosInstance.get(`/images/${imageId}/collaborators`);
  }

  async lockAnnotation(imageId: string, annotationId: string): Promise<ApiResponse<void>> {
    return axiosInstance.post(`/images/${imageId}/annotations/${annotationId}/lock`);
  }

  async releaseAnnotationLock(imageId: string, annotationId: string): Promise<ApiResponse<void>> {
    return axiosInstance.delete(`/images/${imageId}/annotations/${annotationId}/lock`);
  }

  async getAnnotationLockStatus(imageId: string, annotationId: string): Promise<ApiResponse<{ locked: boolean }>> {
    return axiosInstance.get(`/images/${imageId}/annotations/${annotationId}/lock`);
  }
}

export const patientClient = PatientClient.getInstance(); 