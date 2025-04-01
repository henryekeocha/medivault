import { 
  Role, 
  ImageStatus, 
  ImageType, 
  ShareType, 
  SharePermission, 
  NotificationType, 
  AppointmentStatus, 
  ProviderSpecialty,
  AnnotationType,
  PatientStatus,
  VerificationStatus
} from '@prisma/client';

// Re-export Prisma enums
export { 
  Role, 
  ImageStatus, 
  ImageType, 
  ShareType, 
  SharePermission, 
  NotificationType, 
  AppointmentStatus, 
  ProviderSpecialty,
  AnnotationType,
  PatientStatus,
  VerificationStatus
};

// Define local enums not in Prisma schema
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export enum ShareStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

export enum StudyType {
  SINGLE = 'SINGLE',
  SERIES = 'SERIES',
  COMPOSITE = 'COMPOSITE'
}

// Define BodyPart enum locally
export enum BodyPart {
  HEAD = 'HEAD',
  NECK = 'NECK',
  CHEST = 'CHEST',
  ABDOMEN = 'ABDOMEN',
  PELVIS = 'PELVIS',
  SPINE = 'SPINE',
  UPPER_EXTREMITY = 'UPPER_EXTREMITY',
  LOWER_EXTREMITY = 'LOWER_EXTREMITY',
  OTHER = 'OTHER'
}

// Chat Message Types
export type ChatMessageType = 'USER' | 'BOT' | 'SYSTEM';

// API Response Types
export interface ApiErrorResponse {
  message: string;
  details?: Record<string, any>;
  code?: string;
}

// Base Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  error?: ApiErrorResponse;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Image Response Types
export interface ImageListResponse {
  images: Image[];
}

// Image Metadata Type
export interface ImageMetadata {
  patientId?: string;
  scanType?: string;
  scanDate?: string;
  notes?: string;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  modality?: string;
  bodyPart?: string;
  institution?: string;
  studyId?: string;
  seriesId?: string;
  instanceId?: string;
  manufacturer?: string;
  protocol?: string;
  sliceThickness?: number;
  contrastUsed?: boolean;
  radiationDose?: number;
  acquisitionDate?: string;
  tags?: string[];
}

/**
 * DICOM metadata extracted from DICOM files
 * Following the DICOM standard for patient and study information
 */
export interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  seriesDescription?: string;
  modality?: string;
  manufacturer?: string;
  institutionName?: string;
  [key: string]: string | undefined;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'PATIENT' | 'PROVIDER' | 'ADMIN';
  image?: string;
  emailVerified: Date | null;
  phoneNumber?: string;
  phoneVerified?: boolean;
  address?: string;
  birthdate?: string;
  gender?: string;
  mfaEnabled?: boolean;
  preferences?: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
  practiceName?: string;
  website?: string;
  licenseNumber?: string;
  workingHours?: {
    [key: string]: {
      start: string;
      end: string;
      available: boolean;
    };
  };
  institution?: string;
  activePatients?: number;
  specialty?: string;
  isActive: boolean;
}

// Extended Patient interface for user with role=Patient
export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  status: PatientStatus;
  contact: {
    email: string;
    phone?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  insuranceProvider?: string;
  insuranceId?: string;
  notes?: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  messageNotifications: boolean;
  shareNotifications: boolean;
  theme: string;
  language: string;
  timezone: string;
  highContrast: boolean;
  fontSize: string;
  reduceMotion: boolean;
  profileVisibility: string;
  showOnlineStatus: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  tokenVersion?: number;
  workingHours?: Record<string, any>;
  updatedAt: Date;
  user: User;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: Role;
  specialty?: ProviderSpecialty;
}

export interface AuthResponse {
  status: 'success' | 'error';
  data?: {
    user?: UserResponse;
    token?: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

// Image Types
export interface Image {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  metadata: string | null;
  status: string;
  type: string;
  patientId: string | null;
  studyDate: string | null;
  modality: string | null;
  bodyPart: string | null;
  diagnosis: string | null;
  notes: string | null;
  tags: string[];
  processingStarted: string | null;
  processingEnded: string | null;
  errorMessage: string | null;
  s3Key: string;
  s3Url: string | null;
  contentType: string | null;
  createdAt: string;
  updatedAt: string;
  lastViewed: string | null;
  viewCount: number;
  userId: string;
  user: User;
  annotations: Annotation[];
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  shares: Share[];
}

// Share Types
export interface Share {
  id: string;
  type: ShareType;
  permissions: SharePermission;
  shareUrl?: string;
  accessKey?: string;
  expiresAt?: Date;
  createdAt: Date;
  lastAccessed?: Date;
  accessCount: number;
  recipientEmail?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  imageId: string;
  sharedByUserId: string;
  sharedWithUserId?: string;
  token?: string;
  image: Image;
  sharedByUser: User;
  sharedWithUser?: User;
}

// Annotation Types
export interface Annotation {
  id: string;
  type: AnnotationType;
  content: string;
  coordinates: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  imageId: string;
  userId: string;
  image: Image;
  user: User;
}

// Message Types
export interface Message {
  id: string;
  content: string;
  attachments?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  senderId: string;
  recipientId: string;
  recipient: User;
  sender: User;
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  userId: string;
  user: User;
}

// Patient-Provider Types
export interface PatientProvider {
  id: string;
  status: PatientStatus;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  patientId: string;
  doctorId: string;
  metadata?: Record<string, any>;
  doctor: User;
  patient: User;
}

// Appointment Types
export interface Appointment {
  id: string;
  status: AppointmentStatus;
  notes?: string;
  patientId: string;
  providerId: string;
  imageId?: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor: string | Date;
  reason: string;
  type: string;
  patientName?: string;
  providerName?: string;
  doctor?: User;
  image?: Image;
  patient?: User;
}

export interface CreateAppointmentRequest {
  patientId: string;
  providerId: string;
  scheduledFor: string | Date;
  reason: string;
  notes?: string;
  type?: string;
  status?: AppointmentStatus;
  imageId?: string;
}

export interface UpdateAppointmentRequest {
  status?: AppointmentStatus;
  notes?: string;
  scheduledFor?: string | Date;
  reason?: string;
  type?: string;
  imageId?: string;
}

// Medical Record Types
export interface MedicalRecord {
  id: string;
  patientId: string;
  providerId: string;
  recordType: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  patient: User;
  images: MedicalRecordImage[];
}

export interface MedicalRecordImage {
  id: string;
  medicalRecordId: string;
  imageId: string;
  createdAt: Date;
  image: Image;
  medicalRecord: MedicalRecord;
}

// Health Metric Types
export interface HealthMetric {
  id: string;
  value: number;
  unit?: string;
  timestamp: Date;
  notes?: string;
  metadata?: Record<string, any>;
  patientId: string;
  providerId?: string;
  type: string;
  patient: User;
  provider?: User;
}

// Provider Analytics Types
export interface ProviderAnalytics {
  id: string;
  providerId: string;
  timestamp: Date;
  metric: string;
  value: number;
  provider: User;
}

// Storage Usage Types
export interface StorageUsage {
  id: string;
  userId: string;
  timestamp: Date;
  bytes: bigint;
  user: User;
}

// System Log Types
export interface SystemLog {
  id: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  level: string;
  timestamp: Date;
  user?: User;
}

// User Activity Types
export interface UserActivity {
  id: string;
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;
  type: string;
  user: User;
}

// Chat Types
export interface ChatSession {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;
  messages: ChatMessage[];
  user: User;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: Date;
  chatSessionId: string;
  role: string;
  chatSession: ChatSession;
}

// Audit Types
export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;
  user: User;
}

// System Settings Types
export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowNewRegistrations: boolean;
  maxUploadSize: bigint;
  allowedFileTypes: string[];
  defaultStorageQuota: bigint;
  smtpConfigured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request Types
export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Analysis Types
export interface ImageAnalysis {
  id: string;
  imageId: string;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  findings?: string;
  diagnosis?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  image: Image;
  notes?: string;
}

export interface CreateAnalysisRequest {
  imageId: string;
  type: string;
  metadata?: Record<string, any>;
}

export interface UpdateAnalysisRequest {
  findings?: string;
  diagnosis?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  notes?: string;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Notification Types
export interface NotificationResponse {
  id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  createdAt: Date;
  userId: string;
  user?: User;
  title?: string;
  message: string;
  data?: any;
}

// Analytics Types
export interface AnalyticsResponse {
  id: string;
  type: string;
  metric: string;
  value: number;
  timestamp: string;
  metadata?: any;
}

// Health Metric Types
export interface HealthMetricResponse {
  id: string;
  patientId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Appointment Response Type
export interface AppointmentResponse extends PaginatedResponse<Appointment> {
  // Legacy fields maintained for backward compatibility
  items?: Appointment[];
  totalCount?: number;
}

// Analysis Result Type
export interface AnalysisFinding {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface AnalysisResult {
  id: string;
  imageId: string;
  findings: AnalysisFinding[];
  diagnosis?: string;
  confidence?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenValidationResponse {
  isValid: boolean;
  user?: UserResponse;
}

export interface ErrorLogRequest {
  type: string;
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface UserResponse extends User {
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}

// Provider Verification Types
export interface ProviderVerification {
  id: string;
  providerId: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiryDate: string;
  specialtyName: string;
  identityDocumentS3Key: string;
  licenseDocumentS3Key: string;
  selfieS3Key: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  lastVerificationDate: string | null;
  nextVerificationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderVerificationRequest {
  licenseNumber: string;
  licenseState: string;
  licenseExpiryDate: Date;
  specialtyName: string;
  identityDocumentS3Key: string;
  licenseDocumentS3Key: string;
  selfieS3Key: string;
}

export interface ConfirmSignUpRequest {
  email: string;
  code: string;
  name?: string;
  password?: string;
  role?: Role;
  specialty?: ProviderSpecialty;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

export interface SharedImage {
  id: string;
  name: string;
  sharedWith: string;
  expiryDate: string;
  accessCount: number;
  link: string;
}

export interface ImageShareOptions {
  patientId: string;
  imageId: string;
  expiryDays: number;
  requireConsent: boolean;
  watermarkEnabled: boolean;
  allowDownload: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
  code?: string;
  newPassword?: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  birthdate?: Date;
  gender?: string;
  specialty?: ProviderSpecialty;
  image?: string;
}

export interface UpdateProfileResponse {
  user: UserResponse;
  message: string;
}

export interface UpdateProfileError {
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    phoneNumber?: string[];
    address?: string[];
    birthdate?: string[];
    gender?: string[];
    specialty?: string[];
    image?: string[];
  };
}

export interface UpdateProfileSuccess {
  user: UserResponse;
  message: string;
}

export interface UpdateProfileOptions {
  onSuccess?: (data: UpdateProfileSuccess) => void;
  onError?: (error: UpdateProfileError) => void;
  onSettled?: () => void;
}

export type UpdateProfileQueryKey = ['profile', string];

export interface UpdateProfileQueryResult {
  data?: UpdateProfileSuccess;
  isLoading: boolean;
  isError: boolean;
  error?: UpdateProfileError;
  refetch: () => void;
} 