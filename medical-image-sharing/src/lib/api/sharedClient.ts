import axiosInstance from './baseClient';
import { ApiResponse, Message, User, Image, Share } from './types';
import { SharePermission } from '@prisma/client';

// Define our own AxiosProgressEvent type if not available from axios
export type AxiosProgressEvent = {
  loaded: number;
  total?: number;
  progress?: number;
  bytes: number;
  estimated?: number;
  rate?: number;
  upload?: boolean;
};

class SharedClient {
  private static instance: SharedClient;
  private currentUser: User | null = null;

  private constructor() {}

  public static getInstance(): SharedClient {
    if (!SharedClient.instance) {
      SharedClient.instance = new SharedClient();
    }
    return SharedClient.instance;
  }

  // User methods
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await axiosInstance.get<ApiResponse<User>>('/user/profile');
    if (response.data.status === 'success') {
      this.currentUser = response.data.data;
    }
    return response.data;
  }

  getCurrentUserId(): string | undefined {
    return this.currentUser?.id;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await axiosInstance.put<ApiResponse<User>>('/users/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.patch<ApiResponse<void>>('/settings/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }

  // Notification methods
  async getNotifications(): Promise<ApiResponse<any>> {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>('/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.patch<ApiResponse<any>>(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    const response = await axiosInstance.patch<ApiResponse<void>>('/api/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/api/notifications/${notificationId}`);
    return response.data;
  }

  // Message methods
  async getChats(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/messages/conversations');
    return response.data;
  }

  async getUnreadCounts(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/messages');
    return response.data;
  }

  async getMessages(chatId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>(`/messages/${chatId}`);
    return response.data;
  }

  async sendMessage(recipientId: string, content: string): Promise<ApiResponse<Message>> {
    const response = await axiosInstance.post<ApiResponse<Message>>('/messages', {
      recipientId,
      content
    });
    return response.data;
  }

  async updateMessage(messageId: string, content: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.patch<ApiResponse<any>>(`/messages/${messageId}`, {
      content
    });
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.delete<ApiResponse<any>>(`/messages/${messageId}`);
    return response.data;
  }

  // Message Templates
  async getMessageTemplates(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/messages/templates');
    return response.data;
  }

  async getMessageTemplateCategories(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/messages/template-categories');
    return response.data;
  }

  async createMessageTemplate(data: {
    title: string;
    content: string;
    categoryId?: string;
  }): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post<ApiResponse<any>>('/messages/templates', data);
    return response.data;
  }

  async updateMessageTemplate(id: string, data: {
    title?: string;
    content?: string;
    categoryId?: string;
  }): Promise<ApiResponse<any>> {
    const response = await axiosInstance.put<ApiResponse<any>>(`/messages/templates/${id}`, data);
    return response.data;
  }

  async deleteMessageTemplate(id: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.delete<ApiResponse<any>>(`/messages/templates/${id}`);
    return response.data;
  }

  // Analytics
  async getFileAccessHistory(fileId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>(`/analytics/files/${fileId}/history`);
    return response.data;
  }

  async getSystemMetrics(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get<ApiResponse<any>>('/analytics/system');
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
      const response = await axiosInstance.get<ApiResponse<any>>(`/analytics/users/${userId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      
      // Return default metrics if we get a 403 error or any other error
      return {
        status: 'success',
        data: {
          appointments: {
            total: 0,
            upcoming: 0,
            completed: 0,
            cancelled: 0
          },
          images: {
            total: 0,
            recentUploads: 0,
            storageUsed: '0 MB'
          },
          messages: {
            total: 0,
            unread: 0
          },
          recentActivity: []
        }
      };
    }
  }

  // Image methods
  async uploadImage(
    file: File,
    metadata: Partial<Image>,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ApiResponse<Image>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await axiosInstance.post<ApiResponse<Image>>('/v1/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });

    return response.data;
  }

  // Share methods
  async createShare(data: {
    imageId: string;
    type: 'LINK' | 'EMAIL';
    permissions: SharePermission;
    expiresAt?: Date;
    recipientEmail?: string;
    accessCount?: number;
    token?: string;
  }): Promise<ApiResponse<Share>> {
    const response = await axiosInstance.post<ApiResponse<Share>>('/v1/shares', data);
    return response.data;
  }

  async getShare(shareId: string): Promise<ApiResponse<Share>> {
    const response = await axiosInstance.get<ApiResponse<Share>>(`/v1/shares/${shareId}`);
    return response.data;
  }

  async deleteShare(shareId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete<ApiResponse<void>>(`/v1/shares/${shareId}`);
    return response.data;
  }

  async listShares(imageId?: string): Promise<ApiResponse<Share[]>> {
    const url = imageId ? `/v1/shares?imageId=${imageId}` : '/v1/shares';
    const response = await axiosInstance.get<ApiResponse<Share[]>>(url);
    return response.data;
  }
}

export const sharedClient = SharedClient.getInstance();
export default sharedClient; 