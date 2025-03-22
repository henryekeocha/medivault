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
  ProviderVerificationRequest,
  ImageListResponse
} from './types';
import { getSession } from 'next-auth/react';

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
    // Ensure we're using the correct API URL for local development
    let baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Remove trailing /api if it exists to avoid double prefixing
    if (baseURL.endsWith('/api')) {
      baseURL = baseURL.slice(0, -4);
    }
    
    // Add /api prefix
    baseURL = `${baseURL}/api`;
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
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

  // Gets token from NextAuth session
  private async getAuthToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      try {
        // Get session from NextAuth
        const session = await getSession();
        if (session?.accessToken) {
          return session.accessToken;
        }
      } catch (e) {
        console.error('Error getting NextAuth session:', e);
      }
    }
    return null;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Get token from NextAuth session
        const token = await this.getAuthToken();
        
        if (token && !this.isPublicRoute()) {
          config.headers.Authorization = `Bearer ${token}`;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[API] Adding auth token to request: ${token.substring(0, 10)}...`);
          }
        }
        
        // Remove CORS headers from client-side requests
        delete config.headers['Access-Control-Allow-Origin'];
        delete config.headers['Access-Control-Allow-Credentials'];
        delete config.headers['Access-Control-Allow-Methods'];
        delete config.headers['Access-Control-Allow-Headers'];
        
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

        // Handle network errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response) {
          console.error('[API] Network error:', error);
          
          // Show a more user-friendly message in the console for development
          if (process.env.NODE_ENV === 'development') {
            console.error(`[API] Backend server not available at ${this.axiosInstance.defaults.baseURL}`);
            console.error(`[API] Please make sure the backend server is running on port 3001`);
          }
          
          // When in a browser environment, we can show a nicer UI message
          if (typeof window !== 'undefined') {
            // Send a custom event that UI components can listen to
            window.dispatchEvent(new CustomEvent('backend-unavailable', {
              detail: {
                message: 'Backend server is not available. Please ensure the server is running.',
                code: 'SERVER_UNAVAILABLE'
              }
            }));
          }
          
          // Return a more specific error for better handling
          return Promise.reject(new Error('Network error: Backend server not available. Please make sure the backend server is running.'));
        }

        // Handle 404 Not Found errors
        if (error.response?.status === 404) {
          console.warn(`[API] Resource not found: ${originalRequest.url}`);
          return Promise.reject({
            ...error,
            message: `Resource not found: ${originalRequest.url}`
          });
        }

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
          // Redirect to login page for unauthorized errors
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(error);
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
  }

  async validateToken(): Promise<ApiResponse<TokenValidationResponse>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<TokenValidationResponse>>('/auth/validate');
      return response.data;
    } catch (error) {
      console.error('[API] Token validation failed:', error);
      throw error;
    }
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

    const response = await this.axiosInstance.post<ApiResponse<Image>>('/v1/images/upload', formData, {
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
  }): Promise<ApiResponse<PaginatedResponse<Image> | ImageListResponse>> {
    const currentUser = this.currentUser;
    const queryParams = {
      ...params,
      role: currentUser?.role || 'PATIENT'
    };
    
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Image> | ImageListResponse>>('/api/images', { 
      params: queryParams 
    });
    return response.data;
  }

  async getImage(id: string): Promise<ApiResponse<Image>> {
    const response = await this.axiosInstance.get<ApiResponse<Image>>(`/api/images/${id}`);
    return response.data;
  }

  async deleteImage(id: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/api/images/${id}`);
    return response.data;
  }

  async downloadImage(id: string): Promise<Blob> {
    const response = await this.axiosInstance.get(`/api/images/${id}/download`, {
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
    const response = await this.axiosInstance.get<ApiResponse<Image[]>>('/images', {
      params: {
        role: 'PROVIDER'
      }
    });
    return response.data;
  }

  async getProviderSharedImages(): Promise<ApiResponse<any[]>> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>('/images', {
      params: {
        role: 'PROVIDER',
        shared: true
      }
    });
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

  // Message API methods
  async getChats(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/messages/conversations');
    return response.data;
  }

  async getUnreadCounts(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/messages');
    return response.data;
  }

  async getMessages(chatId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/messages/${chatId}`);
    return response.data;
  }

  async sendMessage(recipientId: string, content: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/messages', {
      recipientId,
      content
    });
    return response.data;
  }

  async updateMessage(messageId: string, content: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/messages/${messageId}`, {
      content
    });
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/messages/${messageId}`);
    return response.data;
  }

  // Notification endpoints
  async getNotifications(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/api/notifications');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<NotificationResponse>> {
    const response = await this.axiosInstance.patch<ApiResponse<NotificationResponse>>(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.patch<ApiResponse<void>>('/api/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/api/notifications/${notificationId}`);
    return response.data;
  }

  // Appointment endpoints
  async getAppointments(params?: { 
    startDate?: string; 
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<AppointmentResponse>> {
    const response = await this.axiosInstance.get<ApiResponse<AppointmentResponse>>('/api/appointments', { params });
    return response.data;
  }
  
  async getPatientAppointments(patientId: string, params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<AppointmentResponse>> {
    const response = await this.axiosInstance.get<ApiResponse<AppointmentResponse>>('/api/appointments', {
      params: {
        ...params,
        role: 'PATIENT'
      }
    });
    return response.data;
  }
  
  async getProviderAppointments(providerId: string, params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Appointment>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Appointment>>>(
      `/api/providers/appointments`,
      { params: { providerId, ...params } }
    );
    return response.data;
  }
  
  async getAppointment(id: string): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.get<ApiResponse<Appointment>>(`/api/appointments/${id}`);
    return response.data;
  }
  
  async createAppointment(data: CreateAppointmentRequest): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.post<ApiResponse<Appointment>>('/api/appointments', data);
    return response.data;
  }
  
  async updateAppointment(appointmentId: string, data: UpdateAppointmentRequest): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.put<ApiResponse<Appointment>>(`/api/appointments/${appointmentId}`, data);
    return response.data;
  }
  
  async deleteAppointment(appointmentId: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/api/appointments/${appointmentId}`);
    return response.data;
  }
  
  async updateAppointmentStatus(appointmentId: string, status: string): Promise<ApiResponse<Appointment>> {
    const response = await this.axiosInstance.patch<ApiResponse<Appointment>>(`/api/appointments/${appointmentId}/status`, { status });
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
    try {
      const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit/logs', { params });
      return response.data;
    } catch (error: any) {
      // Handle 404 error specifically
      if (error.response?.status === 404) {
        console.warn('[API] Audit logs endpoint not found or not yet implemented');
        // Return an empty response with the correct structure
        return {
          status: 'success',
          data: {
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              pages: 0
            }
          }
        };
      }
      throw error;
    }
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
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Image>>>('/v1/search/images', { params });
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

  // Helper methods - REMOVED localStorage methods
  private handleAuthResponse(data: AuthResponse): void {
    // NextAuth handles storing the tokens, so we don't need to do anything here
    console.log('Authentication successful');
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
    const response = await this.axiosInstance.get<ApiResponse<any>>('/providers/availability/hours');
    return response.data;
  }

  async saveProviderWorkingHours(workingHours: any): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.post<ApiResponse<any>>('/providers/availability/hours', { workingHours });
  }

  async getProviderAvailabilityBlocks(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/providers/availability/blocks');
    return response.data;
  }

  async addProviderAvailabilityBlock(block: any): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.post<ApiResponse<any>>('/providers/availability/blocks', { block });
  }

  async removeProviderAvailabilityBlock(blockId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.delete<ApiResponse<any>>(`/providers/availability/blocks/${blockId}`);
  }

  async saveProviderAvailabilityBlocks(blocks: any[]): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.put<ApiResponse<any>>('/providers/availability/blocks', { blocks });
  }

  async getProviderBlockedTimes(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/providers/availability/blocked');
    return response.data;
  }

  async addProviderBlockedTime(blockedTime: any): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.post<ApiResponse<any>>('/providers/availability/blocked', { blockedTime });
  }

  async removeProviderBlockedTime(blockedTimeId: string): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.delete<ApiResponse<any>>(`/providers/availability/blocked/${blockedTimeId}`);
  }

  async saveProviderBlockedTimes(blockedTimes: any[]): Promise<AxiosResponse<ApiResponse<any>>> {
    return this.axiosInstance.put<ApiResponse<any>>('/providers/availability/blocked', { blockedTimes });
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

  // Analytics endpoints
  async getSystemMetrics(): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/analytics/system');
    return response.data;
  }

  async getUserMetrics(userId: string): Promise<ApiResponse<{
    appointments: {
      total: number;
      upcoming: number;
      completed: number;
      cancelled: number;
    };
    images: {
      total: number;
      recentUploads: number;
      storageUsed: string;
    };
    messages: {
      total: number;
      unread: number;
    };
    recentActivity: any[];
  }>> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<{
        appointments: {
          total: number;
          upcoming: number;
          completed: number;
          cancelled: number;
        };
        images: {
          total: number;
          recentUploads: number;
          storageUsed: string;
        };
        messages: {
          total: number;
          unread: number;
        };
        recentActivity: any[];
      }>>(`/analytics/users/${userId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      throw error;
    }
  }

  async getProviderAnalytics(providerId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/providers/analytics', {
      params: { providerId }
    });
    return response.data;
  }

  async getFileAccessHistory(fileId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/analytics/files/${fileId}/history`);
    return response.data;
  }

  // Health Metric endpoints
  async createHealthMetric(data: Partial<HealthMetricResponse>): Promise<ApiResponse<HealthMetricResponse>> {
    const response = await this.axiosInstance.post<ApiResponse<HealthMetricResponse>>('/v1/patient/health-metrics', data);
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
      const response = await this.axiosInstance.get<ApiResponse<any>>(`/api/v1/patient/${params.patientId}/health-metrics`, {
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
      } as ApiResponse<any>;
    }
  }

  async updatePatientSettings(settings: {
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
  }): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.put<ApiResponse<any>>('/v1/patient/settings', settings);
    return response.data;
  }

  // Patient specific methods
  async getPatientProviders(): Promise<ApiResponse<any[]>> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>('/api/patients/providers');
    return response.data;
  }

  async getPatientImages(): Promise<ApiResponse<PaginatedResponse<Image>>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Image>>>('/api/images', {
      params: {
        role: 'PATIENT'
      }
    });
    return response.data;
  }

  async getPatientSharedImages(): Promise<ApiResponse<any[]>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/api/images', {
      params: {
        role: 'PATIENT',
        shared: true
      }
    });
    
    // Handle the nested response structure
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
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/api/images/${data.imageId}/share`, {
      expiresIn: data.expiryDays * 24 * 60 * 60, // Convert days to seconds
      recipientEmail: data.providerId // Using providerId as recipientEmail for now
    });
    return response.data;
  }

  async revokeImageAccess(shareId: string): Promise<ApiResponse<void>> {
    const response = await this.axiosInstance.delete<ApiResponse<void>>(`/api/images/${shareId}/share`);
    return response.data;
  }

  async getProviderStatistics(providerId: string): Promise<ApiResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/providers/analytics', {
      params: { providerId }
    });
    return response.data;
  }

  async createPatient(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth: string;
    role: string;
    isActive: boolean;
  }): Promise<ApiResponse<User>> {
    // Transform the data to match backend expectations
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
    const userResponse = await this.axiosInstance.post<ApiResponse<User>>('/users', patientData);
    
    // Then create the provider-patient relationship
    await this.axiosInstance.post<ApiResponse<any>>('/providers/patients', {
      patientId: userResponse.data.data.id
    });

    return userResponse.data;
  }
}

export const apiClient = ApiClient.getInstance();