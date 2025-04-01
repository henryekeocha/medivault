import { 
  ApiResponse, 
  PaginatedResponse, 
  Image, 
  Annotation, 
  User, 
  Patient, 
  Appointment, 
  MedicalRecord, 
  DicomMetadata, 
  ImageAnalysis as Analysis, 
  UpdateAppointmentRequest,
  SharedImage,
  ImageShareOptions,
  ShareType,
  Share
} from './types';
import { AnnotationType, PatientStatus } from '@prisma/client';
import { BaseClient, axiosInstance } from './baseClient';
import { AxiosProgressEvent } from './sharedClient';

interface WorkingHours {
  day: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface AvailabilityBlock {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  date?: string | null;
}

interface BlockedTime {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
}

interface UnreadMessageCounts {
  all: number;
  patients: number;
  providers: number;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  isDefault?: boolean;
}

interface TemplateCategory {
  id: string;
  name: string;
}

interface ProviderVerification {
  licenseNumber: string;
  licenseState: string;
  licenseExpiryDate: string;
  specialtyName: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  verifiedAt: string | null;
  rejectionReason: string | null;
  lastVerificationDate: string | null;
  nextVerificationDate: string | null;
}

interface ProviderVerificationRequest {
  licenseNumber: string;
  licenseState: string;
  licenseExpiryDate: string;
  specialtyName: string;
  identityDocumentS3Key: string;
  licenseDocumentS3Key: string;
  selfieS3Key: string;
}

class ProviderClientImpl extends BaseClient {
  private static instance: ProviderClientImpl;

  private constructor() {
    super(axiosInstance);
  }

  public static getInstance(): ProviderClientImpl {
    if (!ProviderClientImpl.instance) {
      ProviderClientImpl.instance = new ProviderClientImpl();
    }
    return ProviderClientImpl.instance;
  }

  // Patient Management
  async getPatients(params?: { 
    status?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.get<ApiResponse<PaginatedResponse<User>>>('/users', { 
      params: {
        ...params,
        role: 'PATIENT'
      } 
    });
    return response.data;
  }

  async searchPatients(params: { query: string }): Promise<ApiResponse<{ items: User[] }>> {
    const response = await this.get<ApiResponse<{ items: User[] }>>('/users/search', { 
      params: {
        ...params,
        role: 'PATIENT'
      }
    });
    return response.data;
  }

  async getPatientDetails(patientId: string): Promise<ApiResponse<Patient>> {
    return this.get(`/patients/${patientId}`);
  }

  async addPatientNotes(patientId: string, notes: string): Promise<ApiResponse<User>> {
    const response = await this.patch<ApiResponse<User>>(`/patients/${patientId}/notes`, { notes });
    return response.data;
  }

  async createPatient(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth: string;
  }): Promise<ApiResponse<User>> {
    const patientData = {
      username: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}`,
      email: data.email,
      password: Math.random().toString(36).slice(-8), // Generate a random password
      role: 'PATIENT' as const,
      name: `${data.firstName} ${data.lastName}`,
      isActive: true,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth
    };

    // First create the user
    const userResponse = await this.post<ApiResponse<User>>('/users', patientData);
    
    // Then create the provider-patient relationship
    await this.post<ApiResponse<any>>('/providers/patients', {
      patientId: userResponse.data.data.id
    });

    return userResponse.data;
  }

  async updatePatient(patientId: string, data: Omit<Patient, 'id'>): Promise<ApiResponse<Patient>> {
    return this.put(`/patients/${patientId}`, data);
  }

  // Appointments
  async getAppointments(params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Appointment>>> {
    const response = await this.get<ApiResponse<PaginatedResponse<Appointment>>>('/providers/appointments', { params });
    return response.data;
  }

  async getPatientAppointments(patientId: string, params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Appointment>>> {
    const response = await this.get<ApiResponse<PaginatedResponse<Appointment>>>('/appointments', {
      params: {
        ...params,
        patientId,
        role: 'PROVIDER'
      }
    });
    return response.data;
  }

  async createAppointment(data: {
    patientId: string;
    scheduledFor: string;
    reason: string;
    notes?: string;
    type?: string;
  }): Promise<ApiResponse<Appointment>> {
    return this.post('/appointments', data);
  }

  async updateAppointment(appointmentId: string, data: UpdateAppointmentRequest): Promise<ApiResponse<Appointment>> {
    // Convert Date to string if present
    const processedData = {
      ...data,
      scheduledFor: data.scheduledFor instanceof Date ? data.scheduledFor.toISOString() : data.scheduledFor
    };
    return this.patch<Appointment>(`/appointments/${appointmentId}`, processedData);
  }

  async deleteAppointment(appointmentId: string): Promise<ApiResponse<void>> {
    return this.delete(`/appointments/${appointmentId}`);
  }

  // Working Hours
  async getWorkingHours(): Promise<ApiResponse<WorkingHours[]>> {
    return this.get('/provider/availability/hours');
  }

  async saveWorkingHours(hours: WorkingHours[]): Promise<ApiResponse<void>> {
    return this.post('/provider/availability/hours', hours);
  }

  // Availability Blocks
  async getAvailabilityBlocks(): Promise<ApiResponse<AvailabilityBlock[]>> {
    return this.get('/provider/availability/blocks');
  }

  async addAvailabilityBlock(block: AvailabilityBlock): Promise<ApiResponse<AvailabilityBlock>> {
    return this.post('/provider/availability/blocks', block);
  }

  async removeAvailabilityBlock(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/provider/availability/blocks/${id}`);
  }

  async saveAvailabilityBlocks(blocks: AvailabilityBlock[]): Promise<ApiResponse<void>> {
    return this.post('/provider/availability/blocks/batch', blocks);
  }

  // Blocked Times
  async getBlockedTimes(): Promise<ApiResponse<BlockedTime[]>> {
    return this.get('/provider/availability/blocked');
  }

  async addBlockedTime(block: BlockedTime): Promise<ApiResponse<BlockedTime>> {
    return this.post('/provider/availability/blocked', block);
  }

  async removeBlockedTime(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/provider/availability/blocked/${id}`);
  }

  async saveBlockedTimes(blocks: BlockedTime[]): Promise<ApiResponse<void>> {
    return this.post('/provider/availability/blocked/batch', blocks);
  }

  // Images
  async uploadImage(file: File, metadata?: Record<string, any>, onProgress?: (progress: number) => void): Promise<ApiResponse<Image>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await this.post<Image>('/api/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded * 100) / progressEvent.total;
          onProgress(progress);
        }
      },
    });
    return response;
  }

  async getImage(imageId: string): Promise<ApiResponse<Image>> {
    return this.get(`/images/${imageId}`);
  }

  async deleteImage(imageId: string): Promise<ApiResponse<void>> {
    const response = await this.delete<ApiResponse<void>>(`/api/images/${imageId}`);
    return response.data;
  }

  async downloadImage(imageId: string): Promise<Blob> {
    const response = await this.client.get(`/api/images/${imageId}/download`, {
      responseType: 'blob'
    });
    if (response.data instanceof Blob) {
      return response.data;
    }
    throw new Error('Invalid response type from server');
  }

  async updateImage(imageId: string, data: Partial<Image>): Promise<ApiResponse<Image>> {
    const response = await this.patch<ApiResponse<Image>>(`/api/images/${imageId}`, data);
    return response.data;
  }

  async getImages(params?: { page?: number; limit?: number; filter?: string }): Promise<ApiResponse<PaginatedResponse<Image>>> {
    return this.get('/images', { params });
  }

  async shareImage(imageIdOrOptions: string | ImageShareOptions, patientId?: string): Promise<ApiResponse<SharedImage | void>> {
    if (typeof imageIdOrOptions === 'string') {
      // Legacy support for direct imageId + patientId sharing
      const response = await this.post<ApiResponse<void>>(`/api/images/${imageIdOrOptions}/share`, {
        recipientId: patientId,
        role: 'PROVIDER'
      });
      return response.data;
    } else {
      // New flexible sharing with options
      return this.post('/shares', imageIdOrOptions);
    }
  }

  async revokeImageAccess(imageId: string, patientId: string): Promise<ApiResponse<void>> {
    const response = await this.delete<ApiResponse<void>>(`/api/images/${imageId}/share/${patientId}`);
    return response.data;
  }

  // Medical Records
  async getPatientMedicalRecords(patientId: string): Promise<ApiResponse<PaginatedResponse<MedicalRecord>>> {
    const response = await this.get<ApiResponse<PaginatedResponse<MedicalRecord>>>(`/patients/${patientId}/medical-records`);
    return response.data;
  }

  // Analytics
  async getProviderAnalytics(): Promise<ApiResponse<any>> {
    try {
      const response = await this.get<any>('/analytics/providers/analytics');
      
      // Ensure we have valid data structure
      if (response.status === 'success') {
        if (!response.data) {
          response.data = {};
        }
        
        // Set default values for missing fields
        response.data.patientsByMonth = response.data.patientsByMonth || [];
        response.data.appointmentsByStatus = response.data.appointmentsByStatus || {
          SCHEDULED: 0,
          COMPLETED: 0,
          CANCELLED: 0
        };
        response.data.imagesByType = response.data.imagesByType || [];
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching provider analytics:', error);
      // Return a valid response structure with empty data
      return {
        status: 'error',
        data: {
          patientsByMonth: [],
          appointmentsByStatus: {
            SCHEDULED: 0,
            COMPLETED: 0,
            CANCELLED: 0
          },
          imagesByType: []
        },
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch provider analytics',
          code: 'FETCH_ERROR'
        }
      };
    }
  }

  async getProviderStatistics(): Promise<ApiResponse<any>> {
    try {
      const response = await this.get<any>('/providers/analytics');
      
      // Ensure we have valid data structure
      if (response.status === 'success') {
        // Ensure all required fields exist with default values if missing
        if (!response.data) {
          response.data = {};
        }
        
        // Set default values for missing fields
        const data = response.data;
        data.totalPatients = data.totalPatients || 0;
        data.totalAppointments = data.totalAppointments || 0;
        data.totalMedicalRecords = data.totalMedicalRecords || 0;
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching provider statistics:', error);
      // Return a valid response structure with empty data
      return {
        status: 'error',
        data: {
          totalPatients: 0,
          totalAppointments: 0,
          totalMedicalRecords: 0
        },
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch provider statistics',
          code: 'FETCH_ERROR'
        }
      };
    }
  }

  async getFileAccessHistory(fileId: string): Promise<ApiResponse<any>> {
    const response = await this.get<ApiResponse<any>>(`/analytics/files/${fileId}/history`);
    return response.data;
  }

  async getPatientStats(patientId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.get<any>(`/analytics/patients/${patientId}/stats`);
      
      // Ensure we have valid data structure
      if (response.status === 'success') {
        // Ensure all required fields exist with default values if missing
        if (!response.data) {
          response.data = {};
        }
        
        // Set default values for missing fields in the data object
        const data = response.data;
        data.totalImages = data.totalImages || 0;
        data.pendingAppointments = data.pendingAppointments || 0;
        data.unreadMessages = data.unreadMessages || 0;
        data.recentActivities = data.recentActivities || [];
      }
      
      return response;
    } catch (error) {
      console.error(`Error fetching patient stats for patient ${patientId}:`, error);
      // Return a valid response structure with empty data
      return {
        status: 'error',
        data: {
          totalImages: 0,
          pendingAppointments: 0,
          unreadMessages: 0,
          recentActivities: []
        },
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch patient statistics',
          code: 'FETCH_ERROR'
        }
      };
    }
  }

  async getPatientImageHistory(patientId: string, params?: { 
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<any>> {
    const response = await this.get<ApiResponse<any>>(`/analytics/patients/${patientId}/images/history`, { params });
    return response.data;
  }

  async getPatientProviderInteractions(patientId: string, params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<any>> {
    const response = await this.get<ApiResponse<any>>(`/analytics/patients/${patientId}/providers/interactions`, { params });
    return response.data;
  }

  // Annotation methods
  async createAnnotation(data: {
    imageId: string;
    type: AnnotationType; 
    content: string;
    coordinates: Record<string, any>;
  }): Promise<ApiResponse<Annotation>> {
    return this.post(`/images/${data.imageId}/annotations`, data);
  }

  async getAnnotation(id: string): Promise<ApiResponse<Annotation>> {
    return this.get(`/annotations/${id}`);
  }

  async updateAnnotation(id: string, data: Partial<Annotation>): Promise<ApiResponse<Annotation>> {
    return this.patch(`/annotations/${id}`, data);
  }

  async deleteAnnotation(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/annotations/${id}`);
  }

  // User Profile methods
  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.get('/users/profile');
  }

  async updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put('/users/profile', data);
  }

  async verifyAttribute(type: 'email' | 'phone', code: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/users/profile/verify', { type, code });
  }

  async requestVerification(type: 'email' | 'phone'): Promise<ApiResponse<{ success: boolean }>> {
    return this.post('/users/profile/request-verification', { type });
  }

  async uploadProfilePicture(file: File): Promise<ApiResponse<{ user: User }>> {
    // First, get a presigned URL for the upload
    const urlResponse = await this.get<{ uploadUrl: string; key: string }>('/users/profile/image');
    
    // Upload the file directly to the presigned URL
    await fetch(urlResponse.data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    
    // Notify the backend about the uploaded file
    return this.post('/users/profile/image', { fileKey: urlResponse.data.key });
  }

  // Collaboration methods
  async saveAnnotations(imageId: string, annotations: Annotation[]): Promise<ApiResponse<void>> {
    return this.post(`/images/${imageId}/annotations/batch`, { annotations });
  }

  async getAnnotations(imageId: string): Promise<ApiResponse<PaginatedResponse<Annotation>>> {
    return this.get(`/images/${imageId}/annotations`);
  }

  async getImageCollaborators(imageId: string): Promise<ApiResponse<string[]>> {
    return this.get(`/images/${imageId}/collaborators`);
  }

  async lockAnnotation(imageId: string, annotationId: string): Promise<ApiResponse<void>> {
    return this.post(`/images/${imageId}/annotations/${annotationId}/lock`);
  }

  async releaseAnnotationLock(imageId: string, annotationId: string): Promise<ApiResponse<void>> {
    return this.delete(`/images/${imageId}/annotations/${annotationId}/lock`);
  }

  async getAnnotationLockStatus(imageId: string, annotationId: string): Promise<ApiResponse<{ locked: boolean }>> {
    return this.get(`/images/${imageId}/annotations/${annotationId}/lock`);
  }

  async getDicomMetadata(id: string): Promise<ApiResponse<DicomMetadata>> {
    const response = await this.get<ApiResponse<DicomMetadata>>(`/api/images/${id}/dicom-metadata`);
    return response.data;
  }

  // Analysis methods
  async getAnalyses(params: { imageId: string }): Promise<ApiResponse<PaginatedResponse<Analysis>>> {
    return this.get<PaginatedResponse<Analysis>>(`/images/${params.imageId}/analyses`);
  }

  async updateAnalysis(analysisId: string, data: {
    findings?: string;
    diagnosis?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Analysis>> {
    return this.patch<Analysis>(`/analyses/${analysisId}`, data);
  }

  async getAIAnalysis(imageId: string): Promise<ApiResponse<{
    suggestions: Array<{
      type: string;
      description: string;
      confidence: number;
      metadata?: Record<string, any>;
    }>;
  }>> {
    return this.get(`/images/${imageId}/ai-analysis`);
  }

  async analyzeImage(data: {
    imageId: string;
    type: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Analysis>> {
    return this.post<Analysis>(`/images/${data.imageId}/analyze`, data);
  }

  // Provider Directory
  async getProviders(params?: {
    page?: number;
    limit?: number;
    search?: string;
    specialty?: string;
    role?: typeof Role;
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.get('/providers', { params });
  }

  async getProviderDetails(providerId: string): Promise<ApiResponse<User>> {
    return this.get(`/providers/${providerId}`);
  }

  // Messages
  async getUnreadMessageCounts(): Promise<ApiResponse<UnreadMessageCounts>> {
    return this.get('/messages', { params: { unread: true } });
  }

  // Message Templates
  async getMessageTemplates(): Promise<ApiResponse<MessageTemplate[]>> {
    return this.get('/messages/templates');
  }

  async getMessageTemplateCategories(): Promise<ApiResponse<TemplateCategory[]>> {
    return this.get('/messages/templates/categories');
  }

  async createMessageTemplate(template: Omit<MessageTemplate, 'id'>): Promise<ApiResponse<MessageTemplate>> {
    return this.post('/messages/templates', template);
  }

  async updateMessageTemplate(templateId: string, template: Partial<MessageTemplate>): Promise<ApiResponse<MessageTemplate>> {
    return this.patch(`/messages/templates/${templateId}`, template);
  }

  async deleteMessageTemplate(templateId: string): Promise<ApiResponse<void>> {
    return this.delete(`/messages/templates/${templateId}`);
  }

  async deactivateUser(userId: string, reason: string): Promise<ApiResponse<void>> {
    return this.post(`/users/${userId}/deactivate`, { reason });
  }

  // Image Sharing
  async getShares(params?: {
    imageId?: string;
    userId?: string;
    type?: ShareType;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Share[]>> {
    return this.get('/shares', { params });
  }

  async revokeShare(shareId: string): Promise<ApiResponse<void>> {
    return this.delete(`/shares/${shareId}`);
  }

  // Provider Verification
  async getProviderVerification(): Promise<ApiResponse<ProviderVerification>> {
    return this.get('/provider/verification');
  }

  async submitProviderVerification(data: ProviderVerificationRequest): Promise<ApiResponse<ProviderVerification>> {
    return this.post('/provider/verification', data);
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    // Use the general settings endpoint for provider settings
    const response = await this.patch('/settings', settings);
    return response;
  }
}

// Create singleton instance
const providerClient = ProviderClientImpl.getInstance();
export { providerClient }; 