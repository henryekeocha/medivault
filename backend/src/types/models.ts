import {
  Role,
  ProviderSpecialty,
  NotificationType,
  ImageType,
  ImageStatus,
  AppointmentStatus,
  ShareType,
  SharePermission,
  AnnotationType,
  PatientStatus
} from '@prisma/client';
import { HealthMetricType } from './enums.js';

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: Role;
  specialty?: ProviderSpecialty;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Share {
  id: string;
  userId: string;
  targetUserId: string;
  imageId: string;
  permission: SharePermission;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Annotation {
  id: string;
  imageId: string;
  userId: string;
  type: AnnotationType;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientProvider {
  id: string;
  patientId: string;
  providerId: string;
  status: PatientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  dateTime: Date;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAccessLog {
  id: string;
  userId: string;
  fileId: string;
  accessType: string;
  accessTimestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface AnalyzeImageRequest {
  imageId: string;
  analysisType: 'BASIC' | 'ADVANCED' | 'DIAGNOSTIC';
  options?: Record<string, any>;
}

export interface UpdateAnalysisRequest {
  findings: string[];
  diagnosis: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface AnalysisResult {
  findings: string[];
  diagnosis: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface Finding {
  id: string;
  description: string;
  confidence: number;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SessionMetadata {
  context: string[];
  lastInteraction: Date;
  settings?: Record<string, any>;
}

export interface AppointmentWithUsers {
  id: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  patientId: string;
  doctorId: string;
  notes: string | null;
  imageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: {
    id: string;
    email: string;
    name: string;
    role: Role;
    specialty: ProviderSpecialty | null | undefined;
    image: string | null;
    username: string | null;
    password: string;
    emailVerified: Date | null;
    createdAt: Date;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    backupCodes: string[];
  };
  doctor: {
    id: string;
    email: string;
    name: string;
    role: Role;
    specialty: ProviderSpecialty | null | undefined;
    image: string | null;
    username: string | null;
    password: string;
    emailVerified: Date | null;
    createdAt: Date;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    backupCodes: string[];
  };
}

export interface AuditLogCreateInput {
  user: {
    connect: {
      id: string;
    };
  };
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
}

export interface NotificationCreateInput {
  userId: string;
  type: NotificationType;
  content: string;
  metadata?: Record<string, any>;
}

export interface ImageWithAnnotations {
  id: string;
  metadata: Record<string, any>;
  type: ImageType;
  tags: string[];
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  status: ImageStatus;
  annotations: Array<{
    id: string;
    type: AnnotationType;
    content: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    createdAt: Date;
    userId: string;
  }>;
  s3Url: string;
}

export interface HealthMetricData {
  type: HealthMetricType;
  value: number;
  unit: string;
  timestamp: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface MedicalRecordData {
  title: string;
  content: string;
  recordType: string;
  metadata?: Record<string, any>;
  attachments?: string[];
}

export interface SystemSettings {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string;
  lastUpdated: Date;
  updatedBy: string;
}

export interface ContentSecurityPolicyDirectiveValue {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'object-src': string[];
  'media-src': string[];
  'frame-src': string[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: Role;
  specialty?: ProviderSpecialty;
}

export interface LoginResponse {
  token: string;
  user: User;
} 