import { Role, ProviderSpecialty, ImageType, ImageStatus, ShareType, SharePermission, AnnotationType, NotificationType, PatientStatus, AppointmentStatus } from '@prisma/client';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password: string;
  role: Role;
  specialty?: ProviderSpecialty;
  emailVerified?: Date;
  image?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  settings?: UserSettings;
  securityLogs?: SecurityLog[];
  auditLogs?: AuditLog[];
  images?: Image[];
  annotations?: Annotation[];
  sharedByMe?: Share[];
  sharedWithMe?: Share[];
  sentMessages?: Message[];
  receivedMessages?: Message[];
  notifications?: Notification[];
  fileAccessLogs?: FileAccessLog[];
  patientsAsDr?: PatientProvider[];
  appointmentsAsDr?: Appointment[];
  prescriptionsProvided?: Prescription[];
  providers?: PatientProvider[];
  appointments?: Appointment[];
  medicalRecords?: MedicalRecord[];
  prescriptions?: Prescription[];
  systemLogs?: SystemLog[];
  activities?: UserActivity[];
  storageUsage?: StorageUsage[];
  healthMetrics?: HealthMetric[];
  metricsByProvider?: HealthMetric[];
  providerAnalytics?: ProviderAnalytics[];
  chatSessions?: ChatSession[];
}

export interface Image {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  metadata?: Record<string, any>;
  status: ImageStatus;
  type: ImageType;
  patientId?: string;
  studyDate?: Date;
  modality?: string;
  bodyPart?: string;
  diagnosis?: string;
  notes?: string;
  tags: string[];
  processingStarted?: Date;
  processingEnded?: Date;
  errorMessage?: string;
  lastViewed?: Date;
  viewCount: number;
  userId: string;
  s3Key: string;
  s3Url: string;

  // Relations
  user?: User;
  annotations?: Annotation[];
  appointments?: Appointment[];
  fileAccessLogs?: FileAccessLog[];
  medicalRecords?: MedicalRecordImage[];
  shares?: Share[];
}

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

  // Relations
  image?: Image;
  sharedByUser?: User;
  sharedWithUser?: User;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  content: string;
  coordinates: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  imageId: string;
  userId: string;

  // Relations
  image?: Image;
  user?: User;
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
  workingHours?: Record<string, any>;
  updatedAt: Date;

  // Relations
  user?: User;
}

export interface Message {
  id: string;
  content: string;
  attachments?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  senderId: string;
  recipientId: string;

  // Relations
  sender?: User;
  recipient?: User;
}

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  userId: string;

  // Relations
  user?: User;
}

export interface PatientProvider {
  id: string;
  status: PatientStatus;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  patientId: string;
  doctorId: string;
  metadata?: Record<string, any>;

  // Relations
  doctor?: User;
  patient?: User;
}

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  notes?: string;
  patientId: string;
  doctorId: string;
  imageId?: string;
  createdAt: Date;
  updatedAt: Date;
  endTime: Date;
  startTime: Date;

  // Relations
  doctor?: User;
  image?: Image;
  patient?: User;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  providerId: string;
  recordType: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  patient?: User;
  images?: MedicalRecordImage[];
}

export interface MedicalRecordImage {
  id: string;
  medicalRecordId: string;
  imageId: string;
  createdAt: Date;

  // Relations
  image?: Image;
  medicalRecord?: MedicalRecord;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  instructions?: string;
  patientId: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
  providerId: string;

  // Relations
  patient?: User;
  provider?: User;
}

export interface FileAccessLog {
  id: string;
  userId: string;
  fileId: string;
  accessType: string;
  accessTimestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;

  // Relations
  file?: Image;
  user?: User;
}

export interface UserActivity {
  id: string;
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;
  type: string;

  // Relations
  user?: User;
}

export interface StorageUsage {
  id: string;
  userId: string;
  timestamp: Date;
  bytes: bigint;

  // Relations
  user?: User;
}

export interface HealthMetric {
  id: string;
  type: string;
  value: number;
  unit?: string;
  timestamp: Date;
  notes?: string;
  metadata?: Record<string, any>;
  patientId: string;
  providerId?: string;

  // Relations
  patient?: User;
  provider?: User;
}

export interface ProviderAnalytics {
  id: string;
  providerId: string;
  timestamp: Date;
  metric: string;
  value: number;

  // Relations
  provider?: User;
}

export interface ChatSession {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  title?: string;

  // Relations
  user?: User;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: Date;
  chatSessionId: string;
  role: string;

  // Relations
  chatSession?: ChatSession;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: Date;
  details?: Record<string, any>;

  // Relations
  user?: User;
}

export interface SystemLog {
  id: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  level: string;
  timestamp: Date;

  // Relations
  user?: User;
}

export interface SecurityLog {
  id: string;
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
  createdAt: Date;

  // Relations
  user?: User;
} 