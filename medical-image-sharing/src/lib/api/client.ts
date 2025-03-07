import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
// Define our own AxiosProgressEvent type if not available from axios
type AxiosProgressEvent = {
  loaded: number;
  total?: number;
  progress?: number;
  bytes: number;
  estimated?: number;
  rate?: number;
  upload?: boolean;
};

import { ImageType, ImageStatus, ShareType } from '@prisma/client';
import { 
  ApiResponse, 
  ApiErrorResponse,
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  Image, 
  Share, 
  ChatSession, 
  ChatMessage, 
  ImageAnalysis, 
  CreateAnalysisRequest,
  UpdateAnalysisRequest,
  AuditLog, 
  PaginatedResponse,
  Message,
  AppointmentResponse,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  Appointment,
  NotificationResponse,
  HealthMetricResponse,
  SearchParams,
  TokenValidationResponse,
  MedicalRecord,
  Patient,
  ProviderVerification,
  ProviderVerificationRequest
} from './types';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/auth/*',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/social-callback'
];

// Define AnalysisFinding type
interface AnalysisFinding {
  id: string;
  type: string;
  description: string;
  confidence: number;
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: Record<string, any>;
}

export class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private currentUser: User | null = null;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private isPublicRoute(): boolean {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      return PUBLIC_ROUTES.some(route => {
        if (route.endsWith('*')) {
          return path.startsWith(route.slice(0, -1));
        }
        return path === route;
      });
    }
    return false;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && !this.isPublicRoute()) {
          config.headers.Authorization = `Bearer ${token}`;
          // Log only first 10 chars of token for security
          console.log(`[API] Adding token to request: ${token.substring(0, 10)}...`);
        }
        return config;
      },
      (error) => {
        console.error('[API] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Skip token refresh for public routes
        if (this.isPublicRoute()) {
          return Promise.reject(error);
        }

        console.error(`[API] Response error: ${error.response?.status} ${error.message}`);

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            console.log('[API] Attempting token refresh');
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
              console.error('[API] No refresh token available');
              throw new Error('No refresh token available');
            }
            
            const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/refresh', {
              refreshToken,
            });

            if (response.data.data.token) {
              console.log('[API] Token refresh successful');
              localStorage.setItem('token', response.data.data.token);
              localStorage.setItem('refreshToken', response.data.data.refreshToken);
              
              // Update the auth header of the original request
              originalRequest.headers.Authorization = `Bearer ${response.data.data.token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('[API] Token refresh failed:', refreshError);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            if (!this.isPublicRoute()) {
              console.log('[API] Redirecting to login due to authentication failure');
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', data);
    this.handleAuthResponse(response.data.data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data);
    this.handleAuthResponse(response.data.data);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.axiosInstance.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  async validateToken(): Promise<ApiResponse<TokenValidationResponse>> {
    const response = await this.axiosInstance.get<ApiResponse<TokenValidationResponse>>('/auth/validate');
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/refresh', {
        refreshToken
      });
      
      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        
        // Update the auth header for subsequent requests
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
        
        // Store new refresh token if provided
        if (response.data.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      // Clear tokens if refresh fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  }

  // User endpoints
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.get<ApiResponse<User>>('/user/profile');
    if (response.data.status === 'success') {
      this.currentUser = response.data.data;
    }
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.put<ApiResponse<User>>('/users/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.patch<ApiResponse<void>>('/settings/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  async getUsers(params?: { role?: string; specialty?: string; isActive?: boolean }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<User>>>('/users', { params });
    return response.data;
  }

  async getPatients(params?: { 
    status?: string; 
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<User>>>('/users', { 
      params: {
        ...params,
        role: 'PATIENT'
      } 
    });
    return response.data;
  }

  async searchPatients(params: { query: string }): Promise<ApiResponse<{ items: User[] }>> {
    const response = await this.axiosInstance.get<ApiResponse<{ items: User[] }>>('/users/search', { 
      params: {
        ...params,
        role: 'PATIENT'
      }
    });
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    return (await this.axiosInstance.get<ApiResponse<User>>('/users/profile')).data;
  }

  async updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return (await this.axiosInstance.put<ApiResponse<User>>('/users/profile', data)).data;
  }

  async updatePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> {
    return (await this.axiosInstance.patch<ApiResponse<void>>('/settings/password', data)).data;
  }

  async toggleTwoFactor(enable: boolean): Promise<ApiResponse<{ secret?: string; qrCode?: string }>> {
    return (await this.axiosInstance.patch<ApiResponse<{ secret?: string; qrCode?: string }>>('/settings/2fa', { enable })).data;
  }

  async verifyTwoFactor(code: string, secret: string): Promise<ApiResponse<void>> {
    return (await this.axiosInstance.post<ApiResponse<void>>('/auth/2fa/verify', { code, secret })).data;
  }

  // Image endpoints
  async uploadImage(
    file: File,
    metadata: Partial<Image>,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ApiResponse<Image>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await this.axiosInstance.post<ApiResponse<Image>>('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });

    return response.data;
  }

  async getImages(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    patientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<Image>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Image>>>('/images', { params });
    return response.data;
  }

  async getImage(id: string): Promise<ApiResponse<Image>> {
    const response = await this.axiosInstance.get<ApiResponse<Image>>(`/images/${id}`);
    return response.data;
  }

  async deleteImage(id: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/images/${id}`);
    return response.data;
  }

  async downloadImage(id: string): Promise<Blob> {
    const response = await this.axiosInstance.get(`/images/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Share endpoints
  async createShare(data: Partial<Share>): Promise<ApiResponse<Share>> {
    const response = await this.axiosInstance.post<ApiResponse<Share>>('/shares', data);
    return response.data;
  }

  // Provider specific methods for sharing
  async getProviderPatients(): Promise<ApiResponse<Patient[]>> {
    const response = await this.axiosInstance.get<ApiResponse<Patient[]>>('/providers/patients');
    return response.data;
  }

  async getProviderImages(): Promise<ApiResponse<Image[]>> {
    const response = await this.axiosInstance.get<ApiResponse<Image[]>>('/providers/images');
    return response.data;
  }

  async getProviderSharedImages(): Promise<ApiResponse<any[]>> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>('/providers/shares');
    return response.data;
  }

  async createImageShare(data: any): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/providers/shares', data);
    return response.data;
  }

  async revokeImageShare(shareId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/providers/shares/${shareId}`);
    return response.data;
  }

  async getShares(params?: {
    imageId?: string;
    userId?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Share>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Share>>>('/shares', { params });
    return response.data;
  }

  async updateShare(id: string, data: Partial<Share>): Promise<ApiResponse<Share>> {
    const response = await this.axiosInstance.patch<ApiResponse<Share>>(`/shares/${id}`, data);
    return response.data;
  }

  async deleteShare(id: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/shares/${id}`);
    return response.data;
  }

  // Chat endpoints
  async startChatSession(metadata?: any): Promise<ApiResponse<ChatSession>> {
    const response = await this.axiosInstance.post<ApiResponse<ChatSession>>('/chat/sessions', { metadata });
    return response.data;
  }

  async getChatSessions(params?: { isActive?: boolean }): Promise<ApiResponse<ChatSession[]>> {
    const response = await this.axiosInstance.get<ApiResponse<ChatSession[]>>('/chat/sessions', { params });
    return response.data;
  }

  async getChatSession(id: string): Promise<ApiResponse<ChatSession>> {
    const response = await this.axiosInstance.get<ApiResponse<ChatSession>>(`/chat/sessions/${id}`);
    return response.data;
  }

  async endChatSession(id: string): Promise<ApiResponse<ChatSession>> {
    const response = await this.axiosInstance.post<ApiResponse<ChatSession>>(`/chat/sessions/${id}/end`);
    return response.data;
  }

  async sendChatMessage(sessionId: string, content: string, type: 'USER' | 'BOT' | 'SYSTEM' = 'USER'): Promise<ApiResponse<ChatMessage>> {
    const response = await this.axiosInstance.post<ApiResponse<ChatMessage>>(`/chat/sessions/${sessionId}/messages`, {
      content,
      type
    });
    return response.data;
  }

  async getChatMessages(sessionId: string, params?: { 
    before?: Date; 
    after?: Date;
    limit?: number;
  }): Promise<ApiResponse<ChatMessage[]>> {
    const response = await this.axiosInstance.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`, { params });
    return response.data;
  }

  // Message endpoints
  async sendMessage(receiverId: string, content: string, attachments?: File[]): Promise<ApiResponse<Message>> {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('receiverId', receiverId);
    
    if (attachments) {
      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await this.axiosInstance.post<ApiResponse<Message>>('/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getMessages(params?: { 
    receiverId?: string;
    before?: Date;
    after?: Date;
    limit?: number;
  }): Promise<ApiResponse<Message[]>> {
    const response = await this.axiosInstance.get<ApiResponse<Message[]>>('/messages', { params });
    return response.data;
  }

  async getChats(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Message>> {
    const response = await this.axiosInstance.get<PaginatedResponse<Message>>('/messages/chats', { params });
    return response.data;
  }

  async markMessageAsRead(messageId: string): Promise<ApiResponse<Message>> {
    const response = await this.axiosInstance.post<ApiResponse<Message>>(`/messages/${messageId}/read`);
    return response.data;
  }

  async getUnreadMessageCounts(): Promise<ApiResponse<{all: number, patients: number, providers: number}>> {
    const response = await this.axiosInstance.get<ApiResponse<{all: number, patients: number, providers: number}>>('/messages/unread-counts');
    return response.data;
  }

  // Notification endpoints
  async getNotifications(params?: { 
    read?: boolean;
    type?: string;
    limit?: number;
  }): Promise<ApiResponse<NotificationResponse[]>> {
    const response = await this.axiosInstance.get<ApiResponse<NotificationResponse[]>>('/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<NotificationResponse>> {
    const response = await this.axiosInstance.patch<ApiResponse<NotificationResponse>>(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.post<ApiResponse<void>>('/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/notifications/${notificationId}`);
    return response.data;
  }

  // Analytics endpoints
  async getSystemMetrics(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/analytics/system');
    return response.data;
  }

  /**
   * Get user metrics for dashboard
   * @param userId The ID of the user to get metrics for
   * @returns Promise with user metrics data
   */
  async getUserMetrics(userId: string): Promise<ApiResponse<any>> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>(`/users/${userId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      return {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve user metrics',
          code: 'FETCH_ERROR'
        }
      } as ApiResponse<any>;
    }
  }

  // Provider statistics endpoint
  async getProviderStatistics(providerId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/statistics/provider/${providerId}`);
    return response.data;
  }

  async getFileAccessHistory(fileId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/files/${fileId}/history`);
    return response.data;
  }

  // Health Metric endpoints
  async createHealthMetric(data: Partial<HealthMetricResponse>): Promise<ApiResponse<HealthMetricResponse>> {
    const response = await this.axiosInstance.post<ApiResponse<HealthMetricResponse>>('/health-metrics', data);
    return response.data;
  }

  /**
   * Get health metrics for a patient
   * @param params Object containing patientId and optional date range
   * @returns Promise with health metrics data
   */
  async getHealthMetrics(params: { 
    patientId: string, 
    startDate?: string, 
    endDate?: string 
  }): Promise<ApiResponse<any>> {
    if (!params.patientId) {
      throw new Error('Patient ID is required');
    }
    
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>('/health-metrics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      return {
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Failed to retrieve health metrics',
          code: 'FETCH_ERROR'
        }
      } as ApiResponse<any>;
    }
  }

  // Appointment endpoints
  async getAppointments(params?: { 
    startDate?: string; 
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<AppointmentResponse>> {
    const response = await this.axiosInstance.get<ApiResponse<AppointmentResponse>>('/appointments', { params });
    return response.data;
  }
  
  async getPatientAppointments(patientId: string, params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<AppointmentResponse>> {
    const response = await this.axiosInstance.get<ApiResponse<AppointmentResponse>>(`/appointments/patient/${patientId}`, { params });
    return response.data;
  }
  
  async getDoctorAppointments(doctorId: string, params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<AppointmentResponse>> {
    const response = await this.axiosInstance.get<ApiResponse<AppointmentResponse>>(`/appointments/doctor/${doctorId}`, { params });
    return response.data;
  }
  
  async getAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    return response.data;
  }
  
  async createAppointment(data: CreateAppointmentRequest): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.post<ApiResponse<Appointment>>('/appointments', data);
    return response.data;
  }
  
  async updateAppointment(appointmentId: string, data: UpdateAppointmentRequest): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.patch<ApiResponse<Appointment>>(`/appointments/${appointmentId}`, data);
    return response.data;
  }
  
  async deleteAppointment(appointmentId: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/appointments/${appointmentId}`);
    return response.data;
  }
  
  async updateAppointmentStatus(appointmentId: string, status: string): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.patch<ApiResponse<Appointment>>(`/appointments/${appointmentId}/status`, { status });
    return response.data;
  }
  
  async getProviders(params?: any): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/users/providers', { params });
    return response.data;
  }

  // Audit endpoints
  async getAuditLogs(params?: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string 
  }): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit/logs', { params });
    return response.data;
  }

  async createAuditLog(data: {
    action: string;
    resourceType: string;
    resourceId: string;
    details: Record<string, any>;
  }): Promise<ApiResponse<AuditLog>> {
    const response = await this.axiosInstance.post<ApiResponse<AuditLog>>('/audit/logs', data);
    return response.data;
  }

  // Analysis endpoints
  async analyzeImage(data: CreateAnalysisRequest): Promise<ApiResponse<ImageAnalysis>> {
    const response = await this.axiosInstance.post<ApiResponse<ImageAnalysis>>('/analysis', data);
    return response.data;
  }

  async getAnalyses(params?: { 
    imageId?: string;
    userId?: string;
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<ImageAnalysis>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<ImageAnalysis>>>('/analysis', { params });
    return response.data;
  }

  async getAnalysis(id: string): Promise<ApiResponse<ImageAnalysis>> {
    const response = await this.axiosInstance.get<ApiResponse<ImageAnalysis>>(`/analysis/${id}`);
    return response.data;
  }

  async updateAnalysis(id: string, data: UpdateAnalysisRequest): Promise<ApiResponse<ImageAnalysis>> {
    const response = await this.axiosInstance.patch<ApiResponse<ImageAnalysis>>(`/analysis/${id}`, data);
    return response.data;
  }

  async deleteAnalysis(id: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/analysis/${id}`);
    return response.data;
  }

  async getAIAnalysis(imageId: string): Promise<ApiResponse<{ suggestions: AnalysisFinding[] }>> {
    const response = await this.axiosInstance.get<ApiResponse<{ suggestions: AnalysisFinding[] }>>(`/analysis/ai/${imageId}`);
    return response.data;
  }

  // Medical Records endpoints
  async getMedicalRecords(params?: {
    patientId?: string;
    providerId?: string;
    recordType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<MedicalRecord>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<MedicalRecord>>>('/medical-records', { params });
    return response.data;
  }

  async getMedicalRecord(id: string): Promise<ApiResponse<MedicalRecord>> {
    const response = await this.axiosInstance.get<ApiResponse<MedicalRecord>>(`/medical-records/${id}`);
    return response.data;
  }

  async addPatientNotes(patientId: string, notes: string): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.patch<ApiResponse<User>>(`/patients/${patientId}/notes`, { notes });
    return response.data;
  }

  async createMedicalRecord(data: {
    patientId: string;
    recordType: string;
    title: string;
    content: string;
    attachments?: File[];
  }): Promise<ApiResponse<MedicalRecord>> {
    const formData = new FormData();
    formData.append('patientId', data.patientId);
    formData.append('recordType', data.recordType);
    formData.append('title', data.title);
    formData.append('content', data.content);
    
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const response = await this.axiosInstance.post<ApiResponse<MedicalRecord>>('/medical-records', formData, {
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

    const response = await this.axiosInstance.patch<ApiResponse<MedicalRecord>>(`/medical-records/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteMedicalRecord(id: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/medical-records/${id}`);
    return response.data;
  }

  async downloadMedicalRecord(id: string, format: 'pdf' | 'json' = 'pdf'): Promise<Blob> {
    const response = await this.axiosInstance.get(`/medical-records/${id}/download`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  // Search endpoints
  async searchImages(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Image>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Image>>>('/search/images', { params });
    return response.data;
  }

  async searchUsers(params: SearchParams): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<User>>>('/search/users', { params });
    return response.data;
  }

  // Admin endpoints
  async getAdminStatistics(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/statistics');
    return response.data;
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/system-health');
    return response.data;
  }

  async getSystemAlerts(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/system-alerts');
    return response.data;
  }

  async getActivityLogs(params?: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<any>>>('/admin/activity-logs', { params });
    return response.data;
  }

  async getAdminUsers(params?: { 
    page?: number; 
    limit?: number; 
    role?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<User>>>('/admin/users', { params });
    return response.data;
  }

  async createUser(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.post<ApiResponse<User>>('/admin/users', data);
    return response.data;
  }

  async updateAdminUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
    return response.data;
  }

  async deactivateUser(id: string, reason: string): Promise<ApiResponse<User>> {
    const response = await this.axiosInstance.post<ApiResponse<User>>(`/admin/users/${id}/deactivate`, { reason });
    return response.data;
  }

  async getSystemSettings(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(data: any): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>('/admin/settings', data);
    return response.data;
  }

  async getStorageStats(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/storage');
    return response.data;
  }

  async cleanupStorage(options: { 
    olderThan?: string; 
    types?: string[]; 
    status?: string[];
  }): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/admin/storage/cleanup', options);
    return response.data;
  }

  // Helper methods
  private handleAuthResponse(data: AuthResponse): void {
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  // Add this method to get the current user ID
  public getCurrentUserId(): string | undefined {
    return this.currentUser?.id;
  }

  // Provider Availability endpoints
  async getProviderWorkingHours(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/provider/availability/hours');
    return response.data;
  }

  async saveProviderWorkingHours(workingHours: any): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.post<ApiResponse<any>>('/provider/availability/hours', { workingHours });
  }

  async getProviderAvailabilityBlocks(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/provider/availability/blocks');
    return response.data;
  }

  async addProviderAvailabilityBlock(block: any): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.post<ApiResponse<any>>('/provider/availability/blocks', block);
  }

  async removeProviderAvailabilityBlock(blockId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.delete<ApiResponse<any>>(`/provider/availability/blocks/${blockId}`);
  }

  async saveProviderAvailabilityBlocks(blocks: any[]): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.put<ApiResponse<any>>('/provider/availability/blocks', { blocks });
  }

  async getProviderBlockedTimes(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/provider/availability/blocked');
    return response.data;
  }

  async addProviderBlockedTime(blockedTime: any): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.post<ApiResponse<any>>('/provider/availability/blocked', blockedTime);
  }

  async removeProviderBlockedTime(blockedTimeId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.delete<ApiResponse<any>>(`/provider/availability/blocked/${blockedTimeId}`);
  }

  async saveProviderBlockedTimes(blockedTimes: any[]): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.put<ApiResponse<any>>('/provider/availability/blocked', { blockedTimes });
  }

  // Patient Analytics endpoints
  async getPatientAnalytics(patientId?: string): Promise<ApiResponse<any>> {
    const id = patientId || this.getCurrentUserId();
    if (!id) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/patients/${id}`);
    return response.data;
  }

  async getPatientImageHistory(patientId?: string, params?: { 
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<any>> {
    const id = patientId || this.getCurrentUserId();
    if (!id) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/patients/${id}/images/history`, { params });
    return response.data;
  }

  async getPatientImageTypeDistribution(patientId?: string): Promise<ApiResponse<any>> {
    const id = patientId || this.getCurrentUserId();
    if (!id) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/patients/${id}/images/types`);
    return response.data;
  }

  async getPatientProviderInteractions(patientId?: string, params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  }): Promise<ApiResponse<any>> {
    const id = patientId || this.getCurrentUserId();
    if (!id) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/patients/${id}/providers/interactions`, { params });
    return response.data;
  }

  async getPatientStats(patientId?: string): Promise<ApiResponse<any>> {
    const id = patientId || this.getCurrentUserId();
    if (!id) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/patients/${id}/stats`);
    return response.data;
  }

  // Provider patient endpoints
  async getPatientDetails(patientId: string): Promise<ApiResponse<any>> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/patients/${patientId}`);
    return response.data;
  }
  
  async getPatientMedicalRecords(patientId: string): Promise<ApiResponse<any>> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/patients/${patientId}/medical-records`);
    return response.data;
  }
  
  async getPatientAppointmentsForProvider(patientId: string): Promise<ApiResponse<any>> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/patients/${patientId}/appointments`);
    return response.data;
  }
  
  async getPatientImagesForProvider(patientId: string): Promise<ApiResponse<any>> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/patients/${patientId}/images`);
    return response.data;
  }
  
  async getPatientMessagesForProvider(patientId: string): Promise<ApiResponse<any>> {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/patients/${patientId}/messages`);
    return response.data;
  }

  // Message template endpoints
  async getMessageTemplates(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/messages/templates');
    return response.data;
  }

  async getMessageTemplateCategories(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/messages/template-categories');
    return response.data;
  }

  async createMessageTemplate(data: {
    title: string;
    content: string;
    category: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/messages/templates', data);
    return response.data;
  }

  async updateMessageTemplate(id: string, data: {
    title?: string;
    content?: string;
    category?: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/messages/templates/${id}`, data);
    return response.data;
  }

  async deleteMessageTemplate(id: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/messages/templates/${id}`);
    return response.data;
  }

  // Backup and restoration methods
  async getBackups(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/backups');
    return response.data;
  }

  async getBackupSchedule(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/backup-schedule');
    return response.data;
  }

  async getMaintenanceStatus(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/maintenance-status');
    return response.data;
  }

  async createBackup(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/admin/backups');
    return response.data;
  }

  async restoreBackup(backupId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/admin/backups/${backupId}/restore`);
    return response.data;
  }

  async deleteBackup(backupId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/admin/backups/${backupId}`);
    return response.data;
  }

  async downloadBackup(backupId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/backups/${backupId}/download`, {
      responseType: 'blob' as any
    });
    return response.data;
  }

  async updateBackupSchedule(schedule: any): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.put<ApiResponse<any>>('/admin/backup-schedule', schedule);
    return response.data;
  }

  async updateMaintenanceStatus(status: any): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.put<ApiResponse<any>>('/admin/maintenance-status', status);
    return response.data;
  }

  // Provider verification methods
  async getProviderVerification(): Promise<ApiResponse<ProviderVerification>> {
    const response = await this.axiosInstance.get<ApiResponse<ProviderVerification>>('/provider/verification');
    return response.data;
  }

  async submitProviderVerification(data: ProviderVerificationRequest): Promise<ApiResponse<ProviderVerification>> {
    const response = await this.axiosInstance.post<ApiResponse<ProviderVerification>>('/provider/verification', data);
    return response.data;
  }

  async getProviderVerifications(status?: string, page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<ProviderVerification>>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<ProviderVerification>>>(
      `/admin/provider-verifications?${params.toString()}`
    );
    return response.data;
  }

  async reviewProviderVerification(
    verificationId: string, 
    status: 'APPROVED' | 'REJECTED', 
    rejectionReason?: string
  ): Promise<ApiResponse<ProviderVerification>> {
    const response = await this.axiosInstance.patch<ApiResponse<ProviderVerification>>(
      `/admin/provider-verifications/${verificationId}/review`,
      { status, rejectionReason }
    );
    return response.data;
  }
}

export const apiClient = ApiClient.getInstance();