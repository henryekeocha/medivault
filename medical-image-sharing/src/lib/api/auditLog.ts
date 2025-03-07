import { api } from './api';

interface ErrorLogData {
  error: string;
  errorInfo: string;
  timestamp: string;
  userAgent?: string;
}

class AuditLogService {
  async logError(data: ErrorLogData) {
    try {
      await api.post('/api/audit/error', data);
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  async reportError(data: ErrorLogData) {
    try {
      await api.post('/api/audit/report', {
        ...data,
        reportedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to report error:', error);
      throw error;
    }
  }

  async createAuditLog(data: {
    action: string;
    resourceType: string;
    resourceId: string;
    details: Record<string, any>;
  }) {
    try {
      await api.post('/api/audit/log', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

export const auditLogService = new AuditLogService(); 