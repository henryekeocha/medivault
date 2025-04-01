import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiError, ApiResponse } from './types';
import { useAuth } from '@clerk/nextjs';
import { patientClient } from './patientClient';
import { providerClient } from './providerClient';
import adminClient from './adminClient';
import sharedClient from './sharedClient';

// Define our own AxiosProgressEvent type since it's not exported from axios
interface AxiosProgressEvent {
  loaded: number;
  total?: number;
  progress?: number;
  bytes: number;
  estimated?: number;
  rate?: number;
  upload?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    // Get token from Clerk
    const { getToken } = useAuth();
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to Clerk's sign-in page
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const loginApi = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const registerApi = (username: string, email: string, password: string, role: string) =>
  api.post('/auth/register', { username, email, password, role });

export const validateTokenApi = () => api.get('/auth/validate');

// Image API calls
export const uploadImageApi = (
  formData: FormData,
  onProgress?: (progressEvent: AxiosProgressEvent) => void
) =>
  api.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress,
  });

export const getUserImagesApi = () => api.get('/images');

interface ShareImageParams {
  imageId: string;
  expiryHours: number;
  requireAuth?: boolean;
  recipientEmail?: string;
  accessCount?: number;
  accessReason?: string;
  notifyOnAccess?: boolean;
}

export const shareImageApi = (params: ShareImageParams) =>
  api.post('/images/share', params);

export const deleteImageApi = (imageId: number) =>
  api.delete(`/images/${imageId}`);

export const downloadImageApi = (imageId: number) =>
  api.get(`/images/${imageId}/download`, {
    responseType: 'blob',
  });

// Audit API calls
export const getAuditLogsApi = (params?: any) => api.get('/audit/logs', { params });

// Message API calls
export const sendMessageApi = async (receiverId: string, content: string): Promise<Message> => {
  const response = await api.post('/messages/send', { receiverId, content });
  return response.data;
};

export const getMessagesApi = () => api.get('/messages');

// API Types
interface AppointmentResponse {
  data: {
    appointments: Array<{
      id: string;
      datetime: string;
      patientId: string;
      patient: {
        name: string;
        email: string;
      };
      status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      notes?: string;
      imageId?: string;
    }>;
  };
}

// Appointment API calls
export const getAppointmentsApi = (params: { startDate: string; endDate: string }) =>
  api.get<AppointmentResponse>('/appointments', { params });

export const updateAppointmentApi = (appointmentId: string, data: { status: string }) =>
  api.patch<{ data: { appointment: AppointmentResponse['data']['appointments'][0] } }>(
    `/appointments/${appointmentId}`,
    data
  );

// Chat API Types
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: string;
  sender: {
    username: string;
    role: string;
  };
}

interface ChatMessagesResponse {
  data: {
    messages: Message[];
  };
}

interface RecipientInfo {
  username: string;
  role: string;
}

interface RecipientInfoResponse {
  data: {
    recipient: RecipientInfo;
  };
}

// Chat API Functions
export const getChatMessagesApi = async (chatId: string): Promise<ChatMessagesResponse> => {
  const response = await api.get(`/messages/${chatId}`);
  return response.data;
};

export const getRecipientInfoApi = async (chatId: string): Promise<RecipientInfoResponse> => {
  const response = await api.get(`/users/${chatId}`);
  return response.data;
};

export default api;

export * from './types';

// Export our role-based clients
export { patientClient } from './patientClient';
export { providerClient } from './providerClient';
export { adminClient } from './adminClient';
export { sharedClient } from './sharedClient';

// Export a convenience object with all clients
export const apiClients = {
  patient: patientClient,
  provider: providerClient,
  admin: adminClient,
  shared: sharedClient
};

// Re-export commonly used types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  User,
  AuthResponse,
  Image,
  Share,
  ChatSession,
  ChatMessage,
  ImageAnalysis,
  AuditLog,
} from './types';
