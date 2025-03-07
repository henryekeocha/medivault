import axios from 'axios';
import type { AnalysisResult, AnalysisRecord } from '@/types/analysis';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  imageUrl?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AppointmentResponse {
  data: {
    providers: Provider[];
    availableSlots?: TimeSlot[];
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Image Analysis endpoints
  analyzeImage: async (imageId: string): Promise<{ data: AnalysisResult }> => {
    const response = await axiosInstance.post('/analysis/analyze', { imageId });
    return response.data;
  },

  getAnalysisHistory: async (imageId: string): Promise<{ data: { analyses: AnalysisRecord[] } }> => {
    const response = await axiosInstance.get(`/analysis/history/${imageId}`);
    return response.data;
  },

  // Provider endpoints
  getProviders: async (specialty?: string): Promise<{ data: Provider[] }> => {
    const response = await axiosInstance.get('/providers', {
      params: { specialty }
    });
    return response.data;
  },

  getProviderAvailability: async (providerId: string, date: string): Promise<{ data: { availableSlots: TimeSlot[] } }> => {
    const response = await axiosInstance.get(`/appointments/provider/${providerId}/availability`, {
      params: { date }
    });
    return response.data;
  },

  // Appointment endpoints
  createAppointment: async (data: {
    providerId: string;
    datetime: string;
    notes?: string;
  }): Promise<{ data: { id: string } }> => {
    const response = await axiosInstance.post('/appointments', data);
    return response.data;
  },

  updateAppointmentStatus: async (appointmentId: string, status: string): Promise<{ data: { success: boolean } }> => {
    const response = await axiosInstance.patch(`/appointments/${appointmentId}`, { status });
    return response.data;
  },

  getPatientAppointments: async (patientId: string) => {
    const response = await axiosInstance.get(`/appointments/patient/${patientId}`);
    return response.data;
  },

  cancelAppointment: async (appointmentId: string) => {
    const response = await axiosInstance.delete(`/appointments/${appointmentId}`);
    return response.data;
  }
}; 