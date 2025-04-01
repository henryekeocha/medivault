import axiosInstance from './baseClient';
import { 
  ApiResponse, 
  PaginatedResponse, 
  User, 
  AuditLog,
  ProviderVerification,
  Image,
  DicomMetadata,
  Message
} from './types';

class AdminClient {
  private static instance: AdminClient;

  private constructor() {}

  public static getInstance(): AdminClient {
    if (!AdminClient.instance) {
      AdminClient.instance = new AdminClient();
    }
    return AdminClient.instance;
  }

  // System Statistics and Health
  async getStatistics(): Promise<ApiResponse<any>> {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>('/admin/statistics');
      
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
        response.data.data.totalUsers = response.data.data.totalUsers || 0;
        response.data.data.totalProviders = response.data.data.totalProviders || 0;
        response.data.data.totalPatients = response.data.data.totalPatients || 0;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching admin statistics:', error);
      // Return a valid response structure with empty data
      return {
        status: 'error',
        data: {
          totalImages: 0,
          pendingAppointments: 0,
          unreadMessages: 0,
          recentActivities: [],
          totalUsers: 0,
          totalProviders: 0,
          totalPatients: 0
        },
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch system statistics',
          code: 'FETCH_ERROR'
        }
      };
    }
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/system-health');
    return response.data;
  }

  async getSystemAlerts(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/system-alerts');
    return response.data;
  }

  // User Management
  async getUsers(params?: { 
    page?: number; 
    limit?: number; 
    role?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<User>>>('/admin/users', { params });
    return response.data;
  }

  async getProviders(params?: {
    page?: number;
    limit?: number;
    search?: string;
    specialty?: string;
    role?: typeof Role;
  }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<User>>>('/admin/providers', { params });
    return response.data;
  }

  async createUser(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await axiosInstance.post<ApiResponse<User>>('/admin/users', data);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await axiosInstance.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
    return response.data;
  }

  async deactivateUser(id: string, reason: string): Promise<ApiResponse<User>> {
    const response = await axiosInstance.post<ApiResponse<User>>(`/admin/users/${id}/deactivate`, { reason });
    return response.data;
  }

  // System Settings
  async getSettings(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/settings');
    return response.data;
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    // Use the general settings endpoint for admin settings
    const response = await axiosInstance.patch<ApiResponse<any>>('/settings', settings);
    return response.data;
  }

  // Storage Management
  async getStorageStats(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/storage');
    return response.data;
  }

  async cleanupStorage(options: { 
    olderThan?: string; 
    types?: string[]; 
    status?: string[];
  }): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post<ApiResponse<any>>('/admin/storage/cleanup', options);
    return response.data;
  }

  // Audit Logs
  async getAuditLogs(params?: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<AuditLog>>>('/admin/activity-logs', { params });
    return response.data;
  }

  async createAuditLog(data: {
    action: string;
    resourceType: string;
    resourceId: string;
    details: string;
  }): Promise<ApiResponse<AuditLog>> {
    try {
      // For now, we'll just log the audit event since the endpoint doesn't exist
      console.log('Audit Log:', data);
      return {
        status: 'success',
        data: {
          id: Date.now().toString(),
          action: data.action,
          userId: 'system',
          timestamp: new Date(),
          details: { 
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            message: data.details 
          },
          user: {
            id: 'system',
            name: 'System',
            email: 'system@example.com',
            role: 'ADMIN',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: null,
            isActive: true
          }
        },
        error: undefined // Make error property explicit but undefined
      };
    } catch (error) {
      console.error('Error creating audit log:', error);
      return {
        status: 'error',
        data: {
          id: Date.now().toString(),
          action: 'ERROR',
          userId: 'system',
          timestamp: new Date(),
          details: { 
            message: 'Failed to create audit log' 
          },
          user: {
            id: 'system',
            name: 'System',
            email: 'system@example.com',
            role: 'ADMIN',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: null,
            isActive: true
          }
        },
        error: {
          message: 'Failed to create audit log'
        }
      };
    }
  }

  // Provider Verification
  async getProviderVerifications(status?: string, page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<ProviderVerification>>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<ProviderVerification>>>(
      `/admin/provider-verifications?${params.toString()}`
    );
    return response.data;
  }

  async reviewProviderVerification(
    verificationId: string, 
    status: 'APPROVED' | 'REJECTED', 
    rejectionReason?: string
  ): Promise<ApiResponse<ProviderVerification>> {
    const response = await axiosInstance.patch<ApiResponse<ProviderVerification>>(
      `/admin/provider-verifications/${verificationId}/review`,
      { status, rejectionReason }
    );
    return response.data;
  }

  // Backup and Restoration
  async getBackups(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/backups');
    return response.data;
  }

  async getBackupSchedule(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/backup-schedule');
    return response.data;
  }

  async getMaintenanceStatus(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/maintenance-status');
    return response.data;
  }

  async createBackup(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post<ApiResponse<any>>('/admin/backups');
    return response.data;
  }

  async restoreBackup(backupId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post<ApiResponse<any>>(`/admin/backups/${backupId}/restore`);
    return response.data;
  }

  async deleteBackup(backupId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.delete<ApiResponse<any>>(`/admin/backups/${backupId}`);
    return response.data;
  }

  async downloadBackup(backupId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>(`/admin/backups/${backupId}/download`, {
      responseType: 'blob' as any
    });
    return response.data;
  }

  async updateBackupSchedule(schedule: any): Promise<ApiResponse<any>> {
    const response = await axiosInstance.put<ApiResponse<any>>('/admin/backup-schedule', schedule);
    return response.data;
  }

  async updateMaintenanceStatus(status: any): Promise<ApiResponse<any>> {
    const response = await axiosInstance.put<ApiResponse<any>>('/admin/maintenance-status', status);
    return response.data;
  }

  // System Health & Monitoring
  async getActivityLogs(params?: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<any>>>('/admin/activity-logs', { params });
    return response.data;
  }

  // System Settings & Maintenance
  async getSystemSettings(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings: Record<string, any>): Promise<ApiResponse<any>> {
    const response = await axiosInstance.put<ApiResponse<any>>('/admin/settings', settings);
    return response.data;
  }

  // System Analytics
  async getSystemMetrics(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/analytics/system');
    return response.data;
  }

  // Image Management
  async uploadImage(file: File, metadata?: Record<string, any>, onProgress?: (progressEvent: any) => void): Promise<ApiResponse<Image>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await axiosInstance.post<ApiResponse<Image>>('/admin/images/upload', formData, {
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
  }): Promise<ApiResponse<PaginatedResponse<Image>>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<Image>>>('/admin/images', { params });
    return response.data;
  }

  async getImage(imageId: string): Promise<ApiResponse<Image>> {
    const response = await axiosInstance.get<ApiResponse<Image>>(`/admin/images/${imageId}`);
    return response.data;
  }

  async deleteImage(imageId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/admin/images/${imageId}`);
    return response.data;
  }

  async updateImage(imageId: string, data: Partial<Image>): Promise<ApiResponse<Image>> {
    const response = await axiosInstance.patch<ApiResponse<Image>>(`/admin/images/${imageId}`, data);
    return response.data;
  }

  async revokeImageAccess(imageId: string, userId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.post<ApiResponse<void>>(`/admin/images/${imageId}/revoke-access`, { userId });
    return response.data;
  }

  async downloadImage(imageId: string): Promise<Blob> {
    const response = await axiosInstance.get<Blob>(`/admin/images/${imageId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getDicomMetadata(imageId: string): Promise<ApiResponse<DicomMetadata>> {
    const response = await axiosInstance.get<ApiResponse<DicomMetadata>>(`/admin/images/${imageId}/dicom-metadata`);
    return response.data;
  }

  // Message Management
  async getMessages(params?: { 
    page?: number; 
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Message>>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<Message>>>('/admin/messages', { params });
    return response.data;
  }

  async getMessage(messageId: string): Promise<ApiResponse<Message>> {
    const response = await axiosInstance.get<ApiResponse<Message>>(`/admin/messages/${messageId}`);
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/admin/messages/${messageId}`);
    return response.data;
  }

  async updateMessageStatus(messageId: string, status: string): Promise<ApiResponse<Message>> {
    const response = await axiosInstance.patch<ApiResponse<Message>>(`/admin/messages/${messageId}/status`, { status });
    return response.data;
  }

  async updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await axiosInstance.put<ApiResponse<User>>('/users/profile', data);
    return response.data;
  }
}

export const adminClient = AdminClient.getInstance();
export default adminClient; 